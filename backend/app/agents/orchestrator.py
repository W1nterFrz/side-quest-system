import json
import re
import traceback
from uuid import UUID

from ..db.supabase_client import get_supabase
from ..schemas.pydantic_models import ChatResponse, PathwayTree, UserProfileCreate
from .goal_clarifier import GoalClarifierAgent
from .goal_tree_generator import GoalTreeGeneratorAgent
from .pathway_planner import PathwayPlannerAgent
from .task_quantifier import TaskQuantifierAgent


class AgentOrchestrator:
    """Coordinates the multi-agent pipeline: Clarify → Tree / Plan → Quantify."""

    AGENTS = {
        "goal_clarifier": GoalClarifierAgent,
        "goal_tree_generator": GoalTreeGeneratorAgent,
        "pathway_planner": PathwayPlannerAgent,
        "task_quantifier": TaskQuantifierAgent,
    }

    async def handle_message(
        self,
        conversation_id: UUID | None,
        agent: str,
        message: str,
        user_profile: UserProfileCreate | None = None,
    ) -> ChatResponse:
        supabase = get_supabase()

        # Resolve or create conversation
        if conversation_id:
            conv = supabase.table("conversations").select("*").eq("id", str(conversation_id)).single().execute()
            if not conv.data:
                conversation_id = self._create_conversation(supabase, user_profile)
        else:
            conversation_id = self._create_conversation(supabase, user_profile)

        # Load history
        history_rows = (
            supabase.table("messages")
            .select("*")
            .eq("conversation_id", str(conversation_id))
            .order("created_at")
            .execute()
        )
        history = [
            {"role": r["role"], "content": r["content"]}
            for r in (history_rows.data or [])
        ]

        # Persist user message
        supabase.table("messages").insert({
            "conversation_id": str(conversation_id),
            "role": "user",
            "content": message,
            "agent_name": agent,
        }).execute()

        # Run agent
        agent_instance = self.AGENTS[agent]()
        reply = await agent_instance.chat(history, message)

        # Persist assistant message
        supabase.table("messages").insert({
            "conversation_id": str(conversation_id),
            "role": "assistant",
            "content": reply,
            "agent_name": agent,
        }).execute()

        pathway_tree = None
        goal_tree = None

        if agent == "goal_clarifier" and "[PROFILE_COMPLETE]" in reply:
            goal_tree = await self._try_generate_goal_tree(supabase, conversation_id, reply, history)

        if agent == "goal_tree_generator":
            parsed = self._try_extract_json(reply)
            if parsed and "quest_lines" in parsed:
                goal_tree = parsed

        if agent == "pathway_planner":
            parsed = self._try_extract_json(reply)
            if parsed and "modules" in parsed:
                pathway_tree = await self._save_pathway(supabase, conversation_id, parsed)
            else:
                print(f"[PathwayPlanner] Could not parse JSON from reply: {reply[:200]}...")

        return ChatResponse(
            conversation_id=UUID(str(conversation_id)),
            agent=agent,
            reply=reply,
            pathway=pathway_tree,
            goal_tree=goal_tree,
        )

    async def _try_generate_goal_tree(
        self, supabase, conversation_id: str, reply: str, history: list[dict]
    ) -> dict | None:
        """Attempt to generate a goal tree from the clarified profile.
        Failures here must NOT break the main clarifier response."""
        try:
            profile_json = self._try_extract_json(reply)
            if not profile_json:
                print("[GoalTreeGen] Could not extract profile JSON from clarifier reply")
                return None

            tree_agent = GoalTreeGeneratorAgent()
            tree_prompt = json.dumps(profile_json, ensure_ascii=False)
            tree_reply = await tree_agent.chat(history, tree_prompt)

            supabase.table("messages").insert({
                "conversation_id": str(conversation_id),
                "role": "assistant",
                "content": tree_reply,
                "agent_name": "goal_tree_generator",
            }).execute()

            return self._try_extract_json(tree_reply)
        except Exception:
            print(f"[GoalTreeGen] Failed to generate goal tree:\n{traceback.format_exc()}")
            return None

    def _create_conversation(self, supabase, profile) -> str:
        user_id = "00000000-0000-0000-0000-000000000001"
        if profile:
            existing = supabase.table("user_profiles").select("id").eq("email", profile.email).execute()
            if existing.data:
                user_id = existing.data[0]["id"]
            else:
                new_user = supabase.table("user_profiles").insert(profile.model_dump()).execute()
                if new_user.data:
                    user_id = new_user.data[0]["id"]

        conv = supabase.table("conversations").insert({"user_id": user_id}).execute()
        return conv.data[0]["id"]

    def _generate_slug(self, title: str) -> str:
        """Generate a URL-friendly slug from a title."""
        slug = title.lower()
        slug = re.sub(r"[^\w\s-]", "", slug)
        slug = re.sub(r"[\s_]+", "-", slug)
        slug = re.sub(r"-+", "-", slug).strip("-")
        import uuid
        suffix = uuid.uuid4().hex[:6]
        return f"{slug}-{suffix}" if slug else suffix

    def _try_extract_json(self, text: str) -> dict | None:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return None

    async def _save_pathway(self, supabase, conversation_id: str, parsed: dict) -> PathwayTree:
        from ..db.supabase_client import get_supabase
        supabase_local = get_supabase()

        conv = supabase_local.table("conversations").select("user_id").eq("id", conversation_id).single().execute()
        user_id = conv.data["user_id"] if conv.data else None

        title = parsed.get("title", "Untitled Pathway")
        slug = self._generate_slug(title)

        pw = supabase_local.table("pathways").insert({
            "user_id": user_id,
            "slug": slug,
            "title": title,
            "subject": parsed.get("subject", ""),
            "goal_level": parsed.get("goal_level", ""),
            "duration": parsed.get("duration", ""),
            "summary": parsed.get("summary", ""),
        }).execute()
        pw_data = pw.data[0]
        pathway_id = pw_data["id"]

        quantifier = TaskQuantifierAgent()
        modules_with_tasks = []

        for i, mod in enumerate(parsed.get("modules", [])):
            mod_result = supabase_local.table("modules").insert({
                "pathway_id": pathway_id,
                "title": mod["title"],
                "sort_order": i,
            }).execute()
            mod_data = mod_result.data[0]
            module_id = mod_data["id"]

            quant_prompt = f"模块标题：{mod['title']}\n模块描述：{mod.get('description', '')}"
            quant_history = [{"role": "user", "content": "请为以上学习模块生成微观任务列表。"}]
            tasks_json = await quantifier.chat(quant_history, quant_prompt)
            tasks_list = self._try_extract_json_array(tasks_json) or []

            task_objects = []
            for j, t in enumerate(tasks_list):
                t_result = supabase_local.table("tasks").insert({
                    "module_id": module_id,
                    "title": t["title"],
                    "description": t.get("description", ""),
                    "sort_order": j,
                    "completed": False,
                }).execute()
                task_objects.append(dict(t_result.data[0]))

            mod_with_tasks = dict(mod_data)
            mod_with_tasks["tasks"] = task_objects
            modules_with_tasks.append(mod_with_tasks)

        tree = dict(pw_data)
        tree["modules"] = modules_with_tasks
        return tree

    def _try_extract_json_array(self, text: str) -> list | None:
        for parse in [lambda t: json.loads(t)]:
            try:
                result = parse(text)
                if isinstance(result, list):
                    return result
                if isinstance(result, dict) and "modules" in result:
                    return result["modules"]
            except (json.JSONDecodeError, TypeError):
                pass
        match = re.search(r"\[[\s\S]*\]", text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return None
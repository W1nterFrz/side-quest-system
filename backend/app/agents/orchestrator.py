import json
import re
import traceback
import asyncio
import time
import sys
from uuid import UUID, uuid4

from ..db.supabase_client import get_supabase
from ..schemas.pydantic_models import ChatResponse, PathwayTree, UserProfileCreate
from .goal_clarifier import GoalClarifierAgent
from .goal_tree_generator import GoalTreeGeneratorAgent
from .pathway_planner import PathwayPlannerAgent
from .task_quantifier import TaskQuantifierAgent


def _log(msg: str):
    """Print + flush immediately so logs survive process crashes."""
    print(msg, flush=True)


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
        t0 = time.perf_counter()
        _log(f"[DEBUG] handle_message START agent={agent}")
        supabase = get_supabase()
        _log(f"[DEBUG] supabase client obtained")

        if conversation_id:
            conv = supabase.table("conversations").select("*").eq("id", str(conversation_id)).single().execute()
            if not conv.data:
                conversation_id = self._create_conversation(supabase, user_profile)
        else:
            conversation_id = self._create_conversation(supabase, user_profile)
        conv_id_str = str(conversation_id)
        _log(f"[DEBUG] conversation ready: {conv_id_str}")

        history_rows = (
            supabase.table("messages")
            .select("*")
            .eq("conversation_id", conv_id_str)
            .order("created_at")
            .execute()
        )
        history = [
            {"role": r["role"], "content": r["content"]}
            for r in (history_rows.data or [])
        ]
        _log(f"[DEBUG] history loaded: {len(history)} msgs")

        await asyncio.to_thread(
            lambda: supabase.table("messages").insert({
                "conversation_id": conv_id_str,
                "role": "user",
                "content": message,
                "agent_name": agent,
            }).execute()
        )
        _log(f"[DEBUG] user msg saved")

        t_agent = time.perf_counter()
        agent_instance = self.AGENTS[agent]()
        reply = await agent_instance.chat(history, message)
        _log(f"[Perf] agent={agent} chat: {time.perf_counter() - t_agent:.2f}s ({len(reply)} chars)")

        await asyncio.to_thread(
            lambda: supabase.table("messages").insert({
                "conversation_id": conv_id_str,
                "role": "assistant",
                "content": reply,
                "agent_name": agent,
            }).execute()
        )
        _log(f"[DEBUG] assistant msg saved")

        pathway_tree = None
        goal_tree = None

        if agent == "goal_clarifier" and "[PROFILE_COMPLETE]" in reply:
            _log(f"[DEBUG] launching background goal-tree task")
            asyncio.create_task(
                self._background_generate_goal_tree(conv_id_str, reply, history)
            )

        if agent == "goal_tree_generator":
            _log(f"[DEBUG] goal_tree_generator path")
            parsed = self._try_extract_json(reply)
            if parsed and "quest_lines" in parsed:
                goal_tree = parsed

        if agent == "pathway_planner":
            _log(f"[DEBUG] pathway_planner path START")
            t_path = time.perf_counter()
            try:
                pathway_tree = await self._try_generate_pathway(supabase, conversation_id, reply)
                _log(f"[DEBUG] _try_generate_pathway returned")
            except BaseException as exc:
                _log(f"[Pathway] CRASH in _try_generate_pathway: {exc}")
                traceback.print_exc()
            _log(f"[Perf] pathway gen (total): {time.perf_counter() - t_path:.2f}s")

        _log(f"[Perf] handle_message total: {time.perf_counter() - t0:.2f}s")
        return ChatResponse(
            conversation_id=UUID(conv_id_str),
            agent=agent,
            reply=reply,
            pathway=pathway_tree,
            goal_tree=goal_tree,
        )

    async def _background_generate_goal_tree(self, conv_id_str: str, reply: str, history: list[dict]):
        try:
            profile_json = self._try_extract_json(reply)
            if not profile_json:
                _log("[GoalTreeGen] No profile JSON found")
                return

            tree_agent = GoalTreeGeneratorAgent()
            tree_prompt = json.dumps(profile_json, ensure_ascii=False)
            _log(f"[GoalTreeGen] Starting ({len(tree_prompt)} chars prompt)")

            t0 = time.perf_counter()
            tree_reply = await asyncio.wait_for(
                tree_agent.chat(history, tree_prompt),
                timeout=60.0,
            )
            _log(f"[GoalTreeGen] LLM: {time.perf_counter() - t0:.2f}s ({len(tree_reply)} chars)")

            supabase = get_supabase()
            await asyncio.to_thread(
                lambda: supabase.table("messages").insert({
                    "conversation_id": conv_id_str,
                    "role": "assistant",
                    "content": tree_reply,
                    "agent_name": "goal_tree_generator",
                }).execute()
            )
            _log("[GoalTreeGen] Saved to DB")

        except BaseException:
            _log(f"[GoalTreeGen] Failed:\n{traceback.format_exc()}")

    async def _try_generate_pathway(self, supabase, conversation_id, reply):
        try:
            parsed = self._try_extract_json(reply)
            if not parsed or "modules" not in parsed:
                _log("[PathwayPlanner] No modules in JSON")
                return None

            _log(f"[DEBUG] calling _save_pathway with {len(parsed.get('modules',[]))} modules")
            return await self._save_pathway(supabase, conversation_id, parsed)

        except BaseException:
            _log(f"[Pathway] Generation failed:\n{traceback.format_exc()}")
            return None

    def _ensure_user(self, supabase, profile) -> str:
        if profile:
            existing = supabase.table("user_profiles").select("id").eq("email", profile.email).execute()
            if existing.data:
                return existing.data[0]["id"]
            new_user = supabase.table("user_profiles").insert(profile.model_dump()).execute()
            if new_user.data:
                return new_user.data[0]["id"]

        user_id = str(uuid4())
        supabase.table("user_profiles").insert({
            "id": user_id,
            "email": f"anon_{uuid4().hex[:8]}@local.dev",
            "level": "beginner",
            "time_budget": "casual",
            "style": "structured",
        }).execute()
        return user_id

    def _create_conversation(self, supabase, profile) -> str:
        user_id = self._ensure_user(supabase, profile)
        conv = supabase.table("conversations").insert({"user_id": user_id}).execute()
        return conv.data[0]["id"]

    def _generate_slug(self, title: str) -> str:
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
        t0 = time.perf_counter()
        _log("[DEBUG] _save_pathway ENTER")
        from ..db.supabase_client import get_supabase
        supabase_local = get_supabase()
        _log("[DEBUG] supabase_local ready")

        conv = supabase_local.table("conversations").select("user_id").eq("id", conversation_id).single().execute()
        user_id = conv.data["user_id"] if conv.data else None
        _log(f"[DEBUG] user_id resolved")

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
        _log(f"[DEBUG] pathway created: {pathway_id}")

        modules_raw = parsed.get("modules", [])
        n_mods = len(modules_raw)
        _log(f"[DEBUG] processing {n_mods} modules (semaphore=3)")

        quantifier = TaskQuantifierAgent()
        llm_sem = asyncio.Semaphore(3)
        _log("[DEBUG] quantifier + semaphore ready")

        async def process_single_module(i: int, mod: dict):
            try:
                _log(f"[DEBUG] mod {i} START")
                t_mod = time.perf_counter()

                mod_result = await asyncio.to_thread(
                    lambda: supabase_local.table("modules")
                    .insert({"pathway_id": pathway_id, "title": mod["title"], "sort_order": i})
                    .execute()
                )
                mod_data = mod_result.data[0]
                module_id = mod_data["id"]
                _log(f"[DEBUG] mod {i} DB insert done")

                quant_prompt = f"模块标题：{mod['title']}\n模块描述：{mod.get('description', '')}"
                quant_history = [{"role": "user", "content": "请为以上学习模块生成微观任务列表。"}]

                _log(f"[DEBUG] mod {i} waiting for semaphore...")
                async with llm_sem:
                    _log(f"[DEBUG] mod {i} LLM call START")
                    t_llm = time.perf_counter()
                    try:
                        tasks_json = await asyncio.wait_for(
                            quantifier.chat(quant_history, quant_prompt),
                            timeout=30.0,
                        )
                    except asyncio.TimeoutError:
                        _log(f"[Pathway] mod {i} TIMEOUT")
                        tasks_json = "[]"
                    except BaseException as e:
                        _log(f"[Pathway] mod {i} LLM FAILED: {e}")
                        tasks_json = "[]"
                _log(f"[DEBUG] mod {i} LLM done: {time.perf_counter() - t_llm:.2f}s")

                tasks_list = self._try_extract_json_array(tasks_json) or []

                if tasks_list:
                    tasks_to_insert = [
                        {"module_id": module_id, "title": t["title"],
                         "description": t.get("description", ""),
                         "sort_order": j, "completed": False}
                        for j, t in enumerate(tasks_list)
                    ]
                    t_result = await asyncio.to_thread(
                        lambda: supabase_local.table("tasks").insert(tasks_to_insert).execute()
                    )
                    task_objects = [dict(row) for row in (t_result.data or [])]
                else:
                    task_objects = []

                mod_with_tasks = dict(mod_data)
                mod_with_tasks["tasks"] = task_objects
                _log(f"[DEBUG] mod {i} DONE: {time.perf_counter() - t_mod:.2f}s ({len(task_objects)} tasks)")
                return mod_with_tasks
            except BaseException as e:
                _log(f"[Pathway] mod {i} FATAL: {e}")
                traceback.print_exc()
                # Return a minimal valid entry so gather doesn't fail
                return {"id": None, "title": mod.get("title", "?"), "sort_order": i, "tasks": []}

        _log(f"[DEBUG] launching asyncio.gather for {n_mods} modules")
        t_gather = time.perf_counter()
        results = await asyncio.gather(
            *(process_single_module(i, mod) for i, mod in enumerate(modules_raw)),
        )
        _log(f"[DEBUG] asyncio.gather returned: {time.perf_counter() - t_gather:.2f}s")

        tree = dict(pw_data)
        tree["modules"] = sorted(
            [r for r in results if r["id"] is not None],
            key=lambda m: m.get("sort_order", 0)
        )
        _log(f"[DEBUG] _save_pathway EXIT: {time.perf_counter() - t0:.2f}s")
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
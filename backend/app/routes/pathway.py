"""CRUD endpoints for pathways, modules, tasks."""

import re
from fastapi import APIRouter, HTTPException
from postgrest.exceptions import APIError

from ..db.supabase_client import get_supabase
from ..schemas.pydantic_models import TaskUpdate, PathwayResponse

router = APIRouter(prefix="/api/pathways", tags=["pathways"])


def _single_or_none(query):
    """Execute .single() and return data or None without raising on no-match."""
    try:
        result = query.execute()
        return result.data
    except APIError:
        return None


@router.get("/{pathway_id_or_slug}")
async def get_pathway(pathway_id_or_slug: str):
    """Fetch a full pathway tree by id or slug."""
    supabase = get_supabase()

    # Try by id first, then by slug.
    data = _single_or_none(
        supabase.table("pathways")
        .select("*")
        .eq("id", pathway_id_or_slug)
        .single()
    )
    if not data:
        data = _single_or_none(
            supabase.table("pathways")
            .select("*")
            .eq("slug", pathway_id_or_slug)
            .single()
        )
    if not data:
        raise HTTPException(status_code=404, detail="Pathway not found.")

    modules = (
        supabase.table("modules")
        .select("*")
        .eq("pathway_id", data["id"])
        .order("sort_order")
        .execute()
    )

    tree = dict(data)
    tree["modules"] = []
    for mod in modules.data:
        tasks = (
            supabase.table("tasks")
            .select("*")
            .eq("module_id", mod["id"])
            .order("sort_order")
            .execute()
        )
        mod_with_tasks = dict(mod)
        mod_with_tasks["tasks"] = tasks.data
        tree["modules"].append(mod_with_tasks)

    return tree


@router.get("/user/{user_id}")
async def list_pathways(user_id: str):
    """List all pathways for a user (uses quest_summary view)."""
    supabase = get_supabase()
    try:
        result = (
            supabase.table("quest_summary")
            .select("*")
            .execute()
        )
        return result.data
    except Exception:
        # Fallback: query raw tables
        result = (
            supabase.table("pathways")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        pathways = result.data or []
        output = []
        for pw in pathways:
            mods = (
                supabase.table("modules")
                .select("id")
                .eq("pathway_id", pw["id"])
                .execute()
            )
            total = 0
            done = 0
            for mod in (mods.data or []):
                tasks = (
                    supabase.table("tasks")
                    .select("completed")
                    .eq("module_id", mod["id"])
                    .execute()
                )
                for t in (tasks.data or []):
                    total += 1
                    if t["completed"]:
                        done += 1
            output.append({
                **pw,
                "total_tasks": total,
                "completed_tasks": done,
            })
        return output


@router.patch("/tasks/{task_id}")
async def toggle_task(task_id: str, update: TaskUpdate):
    """Toggle a task's completion status."""
    supabase = get_supabase()
    from datetime import datetime, timezone

    data = {"completed": update.completed}
    if update.completed:
        data["completed_at"] = datetime.now(timezone.utc).isoformat()
    else:
        data["completed_at"] = None

    result = supabase.table("tasks").update(data).eq("id", task_id).execute()
    return result.data[0] if result.data else {}

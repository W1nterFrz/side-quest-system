"""Progress & streak endpoints."""

from fastapi import APIRouter

from ..db.supabase_client import get_supabase
from ..schemas.pydantic_models import ProgressStats

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("/{user_id}", response_model=ProgressStats)
async def get_progress(user_id: str):
    """Return user progress stats: completion %, streaks, recent logs."""
    supabase = get_supabase()

    pathways = supabase.table("pathways").select("id").eq("user_id", user_id).execute()
    pathway_ids = [p["id"] for p in (pathways.data or [])]

    total_tasks = 0
    completed_tasks = 0
    for pid in pathway_ids:
        modules = supabase.table("modules").select("id").eq("pathway_id", pid).execute()
        for mod in (modules.data or []):
            tasks = supabase.table("tasks").select("completed").eq("module_id", mod["id"]).execute()
            for t in (tasks.data or []):
                total_tasks += 1
                if t["completed"]:
                    completed_tasks += 1

    completion_pct = round(completed_tasks / max(total_tasks, 1) * 100, 1)

    logs = (
        supabase.table("progress_logs")
        .select("*")
        .eq("user_id", user_id)
        .order("log_date", desc=True)
        .limit(30)
        .execute()
    )

    from datetime import date, timedelta
    log_dates = {str(row["log_date"]) for row in (logs.data or [])}
    today = date.today()
    today_done = sum(
        row["tasks_done"] for row in (logs.data or []) if str(row["log_date"]) == str(today)
    )

    current_streak = 0
    cursor = today
    while str(cursor) in log_dates:
        current_streak += 1
        cursor -= timedelta(days=1)

    longest_streak = current_streak
    temp = 0
    for i in range(30):
        d = today - timedelta(days=i)
        if str(d) in log_dates:
            temp += 1
            longest_streak = max(longest_streak, temp)
        else:
            temp = 0

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "completion_pct": completion_pct,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "today_done": today_done,
        "recent_logs": logs.data or [],
    }

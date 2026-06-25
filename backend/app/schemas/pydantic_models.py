"""Pydantic models for request / response validation."""

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


# ── User ────────────────────────────────────────────────
class UserProfileCreate(BaseModel):
    email: str
    level: str = "beginner"
    time_budget: str = "casual"
    style: str = "structured"


class UserProfileResponse(BaseModel):
    id: UUID
    email: str
    level: str
    time_budget: str
    style: str


# ── Pathway ─────────────────────────────────────────────
class PathwayResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    subject: str
    goal_level: str
    duration: str
    summary: str | None = None
    created_at: datetime | None = None


class ModuleResponse(BaseModel):
    id: UUID
    pathway_id: UUID
    title: str
    sort_order: int
    is_core: bool = True
    depends_on: list[UUID] = []


class TaskResponse(BaseModel):
    id: UUID
    module_id: UUID
    title: str
    description: str | None = None
    sort_order: int
    completed: bool
    completed_at: datetime | None = None


class TaskUpdate(BaseModel):
    completed: bool


# ── Pathway tree (modules → tasks) ─────────────────────
class ModuleWithTasks(ModuleResponse):
    tasks: list[TaskResponse] = []


class PathwayTree(PathwayResponse):
    modules: list[ModuleWithTasks] = []


# ── Chat ────────────────────────────────────────────────
class ChatRequest(BaseModel):
    conversation_id: UUID | None = None
    agent: str = "goal_clarifier"
    message: str
    user_profile: UserProfileCreate | None = None


class ChatResponse(BaseModel):
    conversation_id: UUID
    agent: str
    reply: str
    pathway: PathwayTree | None = None
    goal_tree: dict[str, Any] | None = None


# ── Progress ────────────────────────────────────────────
class ProgressLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    log_date: date
    tasks_done: int
    notes: str | None = None


class ProgressStats(BaseModel):
    total_tasks: int
    completed_tasks: int
    completion_pct: float
    current_streak: int
    longest_streak: int
    today_done: int
    recent_logs: list[ProgressLogResponse] = []

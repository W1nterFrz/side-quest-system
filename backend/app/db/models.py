"""Typed dict / dataclass helpers for database rows."""

from dataclasses import dataclass
from datetime import date, datetime


@dataclass
class UserProfile:
    id: str
    email: str
    level: str = "beginner"
    time_budget: str = "casual"
    style: str = "structured"


@dataclass
class Pathway:
    id: str
    user_id: str
    title: str
    subject: str
    goal_level: str
    duration: str
    summary: str | None = None


@dataclass
class Module:
    id: str
    pathway_id: str
    title: str
    sort_order: int = 0


@dataclass
class Task:
    id: str
    module_id: str
    title: str
    description: str | None = None
    sort_order: int = 0
    completed: bool = False
    completed_at: datetime | None = None


@dataclass
class ProgressLog:
    id: str
    user_id: str
    log_date: date
    tasks_done: int = 0
    notes: str | None = None

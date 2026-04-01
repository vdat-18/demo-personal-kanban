"""Pydantic schemas for the Project and Task entities."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    """Possible stages for a task in the AI Kanban flow."""

    TODO = "todo"
    PLANNING = "planning"
    DOING = "doing"
    REVIEW = "review"
    DONE = "done"
    CANCELLED = "cancelled"


class SubTask(BaseModel):
    """A granular item of work within a larger Task."""

    id: str
    text: str
    is_completed: bool = False


class TaskLog(BaseModel):
    """Log entry of an agent action on a task (Traceability)."""

    timestamp: datetime = Field(default_factory=datetime.now)
    agent_id: str
    action_type: str
    result: Optional[Dict[str, Any]] = None


class Task(BaseModel):
    """Task card data structure (Entity)."""

    id: str
    title: str
    description: Optional[str] = None
    status: TaskStatus
    assigned_agent: str
    updated_at: str
    subtasks: List[SubTask] = []
    logs: List[TaskLog] = []


class Project(BaseModel):
    """Higher-level project grouping tasks (Aggregate)."""

    id: str
    name: str
    description: Optional[str] = None
    status: str
    tasks: List[Task] = []
    checkpoints: List[Dict[str, Any]] = []

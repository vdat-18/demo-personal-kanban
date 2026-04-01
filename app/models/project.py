"""Project and task models for state management."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    """Enumeration of possible task statuses."""

    todo = "todo"
    planning = "planning"
    doing = "doing"
    review = "review"
    done = "done"
    cancelled = "cancelled"


class SubTask(BaseModel):
    """Represents a single sub-item of a task."""

    id: str
    text: str
    completed: bool = False


class TaskAction(BaseModel):
    """Audit log of an agent's specific action on a task."""

    timestamp: datetime = Field(default_factory=datetime.now)
    agentType: str
    action: str
    output: Optional[Dict[str, Any]] = None


class Task(BaseModel):
    """Core task model mapping to a Kanban card."""

    id: str
    title: str
    description: Optional[str] = None
    status: TaskStatus
    agentType: str
    updatedAt: str
    subtasks: List[SubTask] = []
    history: List[TaskAction] = []


class Project(BaseModel):
    """A collection of tasks forming an AI-driven project."""

    id: str
    name: str
    description: Optional[str] = None
    status: str
    tasks: List[Task] = []
    checkpoints: List[Dict[str, Any]] = []

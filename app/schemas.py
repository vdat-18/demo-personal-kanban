"""Pydantic schemas for the Project and Chat history."""

from datetime import datetime
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """A single record of an AI-User conversation."""

    role: str  # user, assistant, system
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)


class Project(BaseModel):
    """Information for a planning project (Aggregate)."""

    id: str
    name: str = "New Project"
    status: str = "planning"
    chat_history: list[ChatMessage] = []  # Phase 1: Chat
    report: str | None = None  # Phase 2: Report

    @property
    def pi_context(self) -> list[dict[str, str]]:
        """Return the chat history formatted for the LLM service."""
        return [{"role": msg.role, "content": msg.content} for msg in self.chat_history]


class ChatInput(BaseModel):
    """Input schema for the planning chat."""

    message: str

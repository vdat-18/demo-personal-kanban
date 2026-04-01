"""Core interface for AI-driven task processing."""

from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseAgent(ABC):
    """Abstraction for column-based AI agents."""

    def __init__(self, agent_id: str, role: str):
        self.agent_id = agent_id
        self.role = role

    @abstractmethod
    def run_task(self, context: Dict[str, Any]) -> Any:
        """Main agent operation (Planning, Doing, Reviewing)."""
        pass

    def log(self, text: str):
        """Standard log output for agent status."""
        print(f"[{self.agent_id}] {text}")

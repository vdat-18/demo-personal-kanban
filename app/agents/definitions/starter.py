"""Starter Agent: Initial analysis and task bootstrapping."""

from typing import Any, Dict

from app.agents.base import BaseAgent


class StarterAgent(BaseAgent):
    """Initial analyzer for bootstraping task work."""

    def __init__(self):
        super().__init__("Starter", "Initial Analysis")

    def run_task(self, context: Dict[str, Any]) -> Any:
        """Analyze initial task state and recommend steps."""
        self.log(f"Analyzing: {context.get('task_title')}")
        return {"action": "initial_research", "suggestions": ["Study market", "Survey users"]}

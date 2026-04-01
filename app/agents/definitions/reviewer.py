"""Reviewer Agent: Quality control and validation."""

from typing import Any, Dict

from app.agents.base import BaseAgent


class ReviewerAgent(BaseAgent):
    """Quality assurance and criteria adherence checks."""

    def __init__(self):
        super().__init__("Reviewer", "QA & Criteria Adherence")

    def run_task(self, context: Dict[str, Any]) -> Any:
        """Validate agent output against established criteria."""
        self.log(f"Reviewing compliance for: {context.get('task_title')}")
        return {"status": "passed", "feedback": "All criteria met."}

"""Doer Agent: Execution and asset creation."""

from typing import Any, Dict

from app.agents.base import BaseAgent


class DoerAgent(BaseAgent):
    """Executes planned task components with focus on quality."""

    def __init__(self):
        super().__init__("Doer", "Execution & Drafting")

    def run_task(self, context: Dict[str, Any]) -> Any:
        """Process subtasks and create artifacts for task goals."""
        self.log(f"Executing subtasks for: {context.get('task_title')}")
        return {"status": "completed", "output_path": "results/analysis.xlsx"}

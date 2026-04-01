"""Planner Agent: Decomposing goals into actionable tasks."""

from typing import Any, Dict

from app.agents.base import BaseAgent


class PlannerAgent(BaseAgent):
    """Orchestrates task planning and subtask definition."""

    def __init__(self):
        super().__init__("Planner", "Planning & Strategy")

    def run_task(self, context: Dict[str, Any]) -> Any:
        """Analyze context and define subtasks for a project goal."""
        self.log(f"Planning tasks for project: {context.get('project_name')}")

        return {
            "summary": f"Context for {context.get('project_name')}...",
            "tasks": [
                {
                    "title": "Analyze competitor social strategy",
                    "status": "todo",
                    "role": "Starter",
                },
                {"title": "Map user landing journey", "status": "todo", "role": "Doer"},
            ],
        }

"""Task lifecycle and Agent orchestration service."""

from dataclasses import dataclass
from typing import Any, Dict

from app.agents.registry import AgentRegistry, AgentRole
from app.schemas.project import Project, Task, TaskLog, TaskStatus


@dataclass
class TaskOrchestrator:
    """Orchestrates transitions and context isolation for AI tasks."""

    project: Project

    def handle_status_change(self, task_id: str, new_status: TaskStatus) -> Task:
        """Move a task through the Kanban flow and trigger appropriate agents."""
        task = next((t for t in self.project.tasks if t.id == task_id), None)
        if not task:
            raise ValueError(f"Task with ID {task_id} not found in project.")

        task.status = new_status
        
        # Isolation: Provide only needed context
        context = {
            "project_name": self.project.name,
            "task_title": task.title,
            "subtasks": [s.dict() for s in task.subtasks],
        }

        # Resolve agent based on new status
        agent_role = AgentRole(new_status.value)
        agent = AgentRegistry.get_agent(agent_role)
        task.assigned_agent = f"{agent.agent_id} Agent"

        # Execute and log activity (Traceability)
        result = agent.run_task(context)
        log_entry = TaskLog(
            agent_id=task.assigned_agent,
            action_type=f"transition_to_{new_status.value}",
            result=result,
        )
        task.logs.append(log_entry)

        return task

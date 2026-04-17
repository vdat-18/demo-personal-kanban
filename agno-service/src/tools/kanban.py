"""Custom Agno toolkit for kanban board operations via the Next.js API."""

from __future__ import annotations

import json
from typing import Optional

import httpx
from agno.tools import Toolkit

from src.config import NEXTJS_API_URL


class KanbanTools(Toolkit):
    """Agno toolkit that provides kanban task and project CRUD via the Next.js API."""

    def __init__(self, api_base: Optional[str] = None, timeout: float = 10.0):
        super().__init__(name="kanban_tools")
        self.api_base = (api_base or NEXTJS_API_URL).rstrip("/")
        self.timeout = timeout

        # Register tool functions
        self.register(self.get_tasks)
        self.register(self.create_task)
        self.register(self.update_task)
        self.register(self.delete_task)
        self.register(self.get_projects)
        self.register(self.create_project)

    # ── Task operations ──────────────────────────────────────────────────────

    def get_tasks(self, project_id: Optional[str] = None, status: Optional[str] = None) -> str:
        """Fetch tasks from the kanban board. Optionally filter by project_id and status (TODO, DOING, DONE)."""
        params: dict[str, str] = {}
        if project_id:
            params["projectId"] = project_id
        if status:
            params["status"] = status
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(f"{self.api_base}/tasks", params=params)
                resp.raise_for_status()
                tasks = resp.json()
                if not tasks:
                    return "No tasks found."
                lines = []
                for t in tasks:
                    lines.append(
                        f"- [{t.get('status', '?')}] {t.get('title', 'Untitled')} "
                        f"(id: {t.get('id', '?')}, priority: {t.get('priority', 'MEDIUM')})"
                    )
                return "\n".join(lines)
        except httpx.ConnectError:
            return "Error: Could not connect to kanban service. The task management system is temporarily unavailable."
        except httpx.TimeoutException:
            return "Error: Request to kanban service timed out."
        except httpx.HTTPStatusError as exc:
            return f"Error: Kanban API returned {exc.response.status_code}: {exc.response.text}"
        except Exception as exc:
            return f"Error: Unexpected error fetching tasks: {exc}"

    def create_task(
        self,
        title: str,
        project_id: str,
        description: Optional[str] = None,
        priority: str = "MEDIUM",
        status: str = "TODO",
    ) -> str:
        """Create a new task on the kanban board."""
        body: dict = {
            "title": title,
            "projectId": project_id,
            "priority": priority,
            "status": status,
        }
        if description:
            body["description"] = description
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(f"{self.api_base}/tasks", json=body)
                resp.raise_for_status()
                task = resp.json()
                return f"Task created: {task.get('title', title)} (id: {task.get('id', '?')})"
        except httpx.ConnectError:
            return "Error: Could not connect to kanban service. The task management system is temporarily unavailable."
        except httpx.TimeoutException:
            return "Error: Request to kanban service timed out."
        except httpx.HTTPStatusError as exc:
            return f"Error: Kanban API returned {exc.response.status_code}: {exc.response.text}"
        except Exception as exc:
            return f"Error: Unexpected error creating task: {exc}"

    def update_task(
        self,
        task_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
    ) -> str:
        """Update an existing task on the kanban board."""
        body: dict = {}
        if title is not None:
            body["title"] = title
        if description is not None:
            body["description"] = description
        if status is not None:
            body["status"] = status
        if priority is not None:
            body["priority"] = priority
        if not body:
            return "Error: No fields provided to update."
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.patch(f"{self.api_base}/tasks/{task_id}", json=body)
                resp.raise_for_status()
                task = resp.json()
                return f"Task updated: {task.get('title', '?')} (id: {task_id})"
        except httpx.ConnectError:
            return "Error: Could not connect to kanban service. The task management system is temporarily unavailable."
        except httpx.TimeoutException:
            return "Error: Request to kanban service timed out."
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                return f"Error: Task '{task_id}' not found"
            return f"Error: Kanban API returned {exc.response.status_code}: {exc.response.text}"
        except Exception as exc:
            return f"Error: Unexpected error updating task: {exc}"

    def delete_task(self, task_id: str) -> str:
        """Delete a task from the kanban board."""
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.delete(f"{self.api_base}/tasks/{task_id}")
                resp.raise_for_status()
                return f"Task '{task_id}' deleted successfully."
        except httpx.ConnectError:
            return "Error: Could not connect to kanban service. The task management system is temporarily unavailable."
        except httpx.TimeoutException:
            return "Error: Request to kanban service timed out."
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                return f"Error: Task '{task_id}' not found"
            return f"Error: Kanban API returned {exc.response.status_code}: {exc.response.text}"
        except Exception as exc:
            return f"Error: Unexpected error deleting task: {exc}"

    # ── Project operations ───────────────────────────────────────────────────

    def get_projects(self) -> str:
        """List all kanban projects."""
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(f"{self.api_base}/projects")
                resp.raise_for_status()
                projects = resp.json()
                if not projects:
                    return "No projects found."
                lines = []
                for p in projects:
                    lines.append(f"- {p.get('name', 'Unnamed')} (id: {p.get('id', '?')})")
                return "\n".join(lines)
        except httpx.ConnectError:
            return "Error: Could not connect to kanban service. The task management system is temporarily unavailable."
        except httpx.TimeoutException:
            return "Error: Request to kanban service timed out."
        except httpx.HTTPStatusError as exc:
            return f"Error: Kanban API returned {exc.response.status_code}: {exc.response.text}"
        except Exception as exc:
            return f"Error: Unexpected error fetching projects: {exc}"

    def create_project(self, name: str, description: Optional[str] = None) -> str:
        """Create a new kanban project."""
        body: dict = {"name": name}
        if description:
            body["description"] = description
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(f"{self.api_base}/projects", json=body)
                resp.raise_for_status()
                project = resp.json()
                return f"Project created: {project.get('name', name)} (id: {project.get('id', '?')})"
        except httpx.ConnectError:
            return "Error: Could not connect to kanban service. The task management system is temporarily unavailable."
        except httpx.TimeoutException:
            return "Error: Request to kanban service timed out."
        except httpx.HTTPStatusError as exc:
            return f"Error: Kanban API returned {exc.response.status_code}: {exc.response.text}"
        except Exception as exc:
            return f"Error: Unexpected error creating project: {exc}"

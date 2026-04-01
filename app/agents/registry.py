"""Service for resolving and creating AI Agents."""

from enum import Enum
from typing import Type

from app.agents.base import BaseAgent
from app.agents.definitions.planner import PlannerAgent
from app.agents.definitions.doer import DoerAgent
from app.agents.definitions.starter import StarterAgent
from app.agents.definitions.reviewer import ReviewerAgent


class AgentRole(str, Enum):
    """Available AI roles mapped to Kanban columns."""

    STARTER = "todo"
    PLANNER = "planning"
    DOER = "doing"
    REVIEWER = "review"
    REPORTER = "done"


class AgentRegistry:
    """Registry for AI Agents orchestration."""

    _agents = {
        AgentRole.STARTER: StarterAgent,
        AgentRole.PLANNER: PlannerAgent,
        AgentRole.DOER: DoerAgent,
        AgentRole.REVIEWER: ReviewerAgent,
        AgentRole.REPORTER: BaseAgent, # Default
    }

    @classmethod
    def get_agent(cls, role: AgentRole) -> BaseAgent:
        """Resolve the agent for a given role (column)."""
        agent_class = cls._agents.get(role)
        if not agent_class:
            raise ValueError(f"No agent defined for role: {role}")
        return agent_class()

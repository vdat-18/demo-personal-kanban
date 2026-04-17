"""Agno Team assembly with TeamMode.route for dynamic agent routing."""

from agno.team import Team
from agno.models.openai import OpenAIChat

from src.config import AGENT_MODEL
from src.agents.definitions import create_all_agents


def create_team() -> Team:
    """Create the agent team with dynamic routing via TeamMode.route."""
    agents = create_all_agents()
    return Team(
        name="kanban-team",
        mode="route",
        model=OpenAIChat(id=AGENT_MODEL),
        members=agents,
        description="A team of specialist agents for the kanban application.",
        instructions=[
            "You are a team leader that routes requests to the most appropriate specialist agent.",
            "Analyze the user's request carefully and pick the agent best suited to handle it.",
            "For kanban/task management requests, route to the planner.",
            "For web research requests, route to the researcher.",
            "For document/PDF analysis, route to the doc-processor.",
            "For data analysis or CSV work, route to the data-analyst.",
            "For content writing, route to the writer.",
            "For code execution or technical tasks, route to the developer.",
        ],
        show_tool_calls=True,
        markdown=True,
    )

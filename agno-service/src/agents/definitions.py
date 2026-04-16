"""Specialist agent definitions for the Agno team."""

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.tools.wikipedia import WikipediaTools
from agno.tools.file import FileTools
from agno.tools.csv_toolkit import CsvTools
from agno.tools.pandas import PandasTools
from agno.tools.duckdb import DuckDbTools
from agno.tools.python import PythonTools
from agno.tools.shell import ShellTools

from src.config import AGENT_MODEL
from src.tools.kanban import KanbanTools


def get_model():
    return OpenAIChat(id=AGENT_MODEL)


def create_researcher() -> Agent:
    return Agent(
        name="researcher",
        role="Web research and information gathering",
        model=get_model(),
        tools=[DuckDuckGoTools(), WikipediaTools()],
        instructions=[
            "You are a web research specialist.",
            "Search the web to find accurate, up-to-date information.",
            "Always cite your sources.",
        ],
    )


def create_doc_processor() -> Agent:
    return Agent(
        name="doc-processor",
        role="PDF and document analysis",
        model=get_model(),
        tools=[FileTools(), CsvTools()],
        instructions=[
            "You are a document processing specialist.",
            "Analyze documents, extract key information, and summarize findings.",
        ],
    )


def create_planner() -> Agent:
    return Agent(
        name="planner",
        role="Task planning and project management for kanban boards",
        model=get_model(),
        tools=[KanbanTools()],
        instructions=[
            "You are a project management specialist for kanban boards.",
            "Help users organize work into tasks, set priorities, and track progress.",
            "Use the kanban tools to create, update, and manage tasks and projects.",
        ],
    )


def create_data_analyst() -> Agent:
    return Agent(
        name="data-analyst",
        role="Data analysis and visualization",
        model=get_model(),
        tools=[PandasTools(), DuckDbTools(), PythonTools()],
        instructions=[
            "You are a data analysis specialist.",
            "Analyze data, create visualizations, and provide insights.",
        ],
    )


def create_writer() -> Agent:
    return Agent(
        name="writer",
        role="Content creation and document generation",
        model=get_model(),
        tools=[FileTools(), PythonTools()],
        instructions=[
            "You are a content creation specialist.",
            "Write clear, well-structured content including reports, summaries, and documents.",
        ],
    )


def create_developer() -> Agent:
    return Agent(
        name="developer",
        role="Code execution and technical tasks",
        model=get_model(),
        tools=[PythonTools(), ShellTools()],
        instructions=[
            "You are a software development specialist.",
            "Write, execute, and debug code. Handle technical tasks efficiently.",
        ],
    )


def create_all_agents() -> list[Agent]:
    """Create and return all specialist agents."""
    return [
        create_researcher(),
        create_doc_processor(),
        create_planner(),
        create_data_analyst(),
        create_writer(),
        create_developer(),
    ]

"""Main Entry Point: AgentForEveryone API Service."""

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.schemas import ChatInput, ChatMessage, Project
from app.services import llm_service
from app.settings import settings
from app.utils import format_project_report_markdown

app = FastAPI(title="AgentForEveryone API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for demo. In production, use a Database.
PROJECTS_STORE: dict[str, Project] = {}


@app.get("/")
def health_check():
    """Service health and connection check."""
    return {"status": "online", "version": "1.0.0"}


# --- PROJECT ENDPOINTS ---


@app.post("/api/v1/projects/{project_id}/chat")
async def chat_with_planner(project_id: str, chat_input: ChatInput):
    """Continue the planning conversation with the AI."""
    logger.info(f"Received message for project {project_id}: {chat_input.message}")

    if project_id not in PROJECTS_STORE:
        # For demo: auto-create if not exists
        PROJECTS_STORE[project_id] = Project(id=project_id, name="New Project", status="planning")

    project = PROJECTS_STORE[project_id]

    # 1. Append User Message
    project.chat_history.append(ChatMessage(role="user", content=chat_input.message))

    # 2. Call LLM (pi-coding-agent via llm_service)
    logger.debug(f"Calling ChatWithPlanner with {len(project.chat_history)} messages context.")
    ai_content = await llm_service.chat_with_planner(project_id=project_id, messages=project.pi_context)

    # 3. Append AI Response
    project.chat_history.append(ChatMessage(role="assistant", content=ai_content))

    logger.success(f"AI response generated for project {project_id}")
    return {"reply": ai_content, "history": project.chat_history}


@app.post("/api/v1/projects/{project_id}/generate-report")
async def generate_project_report(project_id: str):
    """Generate a structured report based on the chat history."""
    logger.info(f"Generating report for project {project_id}")

    if project_id not in PROJECTS_STORE:
        raise HTTPException(status_code=404, detail="Project not found")

    project = PROJECTS_STORE[project_id]

    # Prompt for report generation handled by llm_service.
    report_data = await llm_service.generate_report(project_id=project_id)

    markdown_report = format_project_report_markdown(report_data)

    project.report = markdown_report
    logger.success(f"Project report generated for {project_id}")

    return {"report": markdown_report, "structured": report_data}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

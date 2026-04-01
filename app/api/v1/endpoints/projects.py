"""API Endpoints for Project Planning and Chat."""

from fastapi import APIRouter, HTTPException
from loguru import logger
from pydantic import BaseModel

from app.schemas.project import ChatMessage, Project
from app.services.llm import llm_service

router = APIRouter()

# In-memory store for demo. In production, use a Database.
PROJECTS_STORE: dict[str, Project] = {}


class ChatInput(BaseModel):
    """Input schema for the planning chat."""
    message: str


@router.post("/{project_id}/chat")
async def chat_with_planner(project_id: str, chat_input: ChatInput):
    """Continue the planning conversation with the AI."""
    logger.info(f"Received message for project {project_id}: {chat_input.message}")

    if project_id not in PROJECTS_STORE:
        # For demo: auto-create if not exists
        PROJECTS_STORE[project_id] = Project(
            id=project_id, name="New Project", status="planning"
        )
    
    project = PROJECTS_STORE[project_id]
    
    # 1. Append User Message
    project.chat_history.append(ChatMessage(role="user", content=chat_input.message))
    
    # 2. Prepare Context for BAML
    llm_messages = [
        {"role": msg.role, "content": msg.content} for msg in project.chat_history
    ]

    # 3. Call LLM (BAML version)
    logger.debug(f"Calling BAML ChatWithPlanner with {len(llm_messages)} messages context.")
    ai_content = await llm_service.chat_with_planner(messages=llm_messages)
    
    # 4. Append AI Response
    project.chat_history.append(ChatMessage(role="assistant", content=ai_content))
    
    logger.success(f"AI response generated for project {project_id}")
    return {"reply": ai_content, "history": project.chat_history}


@router.post("/{project_id}/generate-report")
async def generate_project_report(project_id: str):
    """Generate a structured report based on the chat history."""
    logger.info(f"Generating report for project {project_id}")
    
    if project_id not in PROJECTS_STORE:
        raise HTTPException(status_code=404, detail="Project not found")
        
    project = PROJECTS_STORE[project_id]
    
    # 2. Prepare Context for BAML
    llm_messages = [
        {"role": msg.role, "content": msg.content} for msg in project.chat_history
    ]
    
    # Prompt for report generation handled by BAML
    report_data = await llm_service.generate_report(messages=llm_messages)
    
    # Prepare parts before f-string to avoid backslash error in Python < 3.12
    scope_str = "\n".join(f"- {s}" for s in report_data.scope)
    constraints_str = "\n".join(f"- {c}" for c in report_data.constraints)
    tasks_str = "\n".join(f"- {t}" for t in report_data.suggested_tasks)

    # Convert BAML ProjectReport object to markdown for the React frontend
    markdown_report = f"""# {report_data.title}

## Goal
{report_data.goal}

## Scope of Work
{scope_str}

## Constraints
{constraints_str}

## Suggested Next Steps
{tasks_str}
"""

    project.report = markdown_report
    logger.success(f"Project report generated for {project_id}")
    
    return {"report": markdown_report, "structured": report_data}

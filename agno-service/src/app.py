"""FastAPI application for the Agno agent service."""

from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.config import CORS_ORIGINS
from src.agents.team import create_team
from src.agents.definitions import create_all_agents


app = FastAPI(title="Agno Kanban Agent Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create the team once at startup
team = create_team()


# ── Request / Response models ────────────────────────────────────────────────


class RunRequest(BaseModel):
    message: str
    stream: bool = False
    files: Optional[list[dict[str, str]]] = None
    project_id: Optional[str] = None
    domain: Optional[str] = None


class RunResponse(BaseModel):
    result: str
    agents_used: list[str] = []
    tools_used: list[str] = []
    routing_reason: str = ""


# ── Endpoints ────────────────────────────────────────────────────────────────


@app.get("/health")
async def health():
    """Health check endpoint."""
    agents = create_all_agents()
    return {
        "status": "ok",
        "agents": len(agents),
        "agent_names": [a.name for a in agents],
        "tools": [tool.name for a in agents for tool in (a.tools or [])],
    }


@app.post("/run")
async def run(request: RunRequest):
    """Run a message through the agent team."""
    # Build context message with optional metadata
    context_parts = [request.message]
    if request.project_id:
        context_parts.append(f"\n[Project ID: {request.project_id}]")
    if request.domain:
        context_parts.append(f"\n[Domain: {request.domain}]")
    if request.files:
        file_desc = ", ".join(f.get("name", f.get("path", "unknown")) for f in request.files)
        context_parts.append(f"\n[Attached files: {file_desc}]")

    full_message = "".join(context_parts)

    if request.stream:
        return StreamingResponse(
            _stream_response(full_message),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    # Non-streaming mode
    response = team.run(full_message)
    result_text = response.content if hasattr(response, "content") else str(response)

    return RunResponse(
        result=result_text,
        agents_used=_extract_agents_used(response),
        tools_used=_extract_tools_used(response),
        routing_reason=_extract_routing_reason(response),
    )


async def _stream_response(message: str):
    """Generator that streams SSE events from the team."""
    collected_text = ""
    agents_used: list[str] = []
    tools_used: list[str] = []

    try:
        response = team.run(message, stream=True)
        for chunk in response:
            if hasattr(chunk, "content") and chunk.content:
                token = chunk.content
                collected_text += token
                yield f"data: {json.dumps({'type': 'token', 'data': token})}\n\n"

        # Final metadata event
        yield f"data: {json.dumps({'type': 'metadata', 'data': {'agents_used': agents_used, 'tools_used': tools_used}})}\n\n"
        yield "data: [DONE]\n\n"

    except Exception as exc:
        yield f"data: {json.dumps({'type': 'error', 'data': str(exc)})}\n\n"


def _extract_agents_used(response: Any) -> list[str]:
    """Extract which agents were used from the team response."""
    if hasattr(response, "members") and response.members:
        return [m.name for m in response.members if hasattr(m, "name")]
    return []


def _extract_tools_used(response: Any) -> list[str]:
    """Extract which tools were invoked from the team response."""
    if hasattr(response, "tools") and response.tools:
        return [getattr(t, "name", str(t)) for t in response.tools]
    return []


def _extract_routing_reason(response: Any) -> str:
    """Extract the routing reason from the team response."""
    if hasattr(response, "routing_reason"):
        return str(response.routing_reason)
    return ""

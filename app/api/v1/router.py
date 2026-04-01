"""API Router for version 1 endpoints."""

from fastapi import APIRouter

from app.api.v1.endpoints import projects

v1_router = APIRouter()

# Include project endpoints with prefix
v1_router.include_router(projects.router, prefix="/projects", tags=["projects"])

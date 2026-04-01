"""Main Entry Point: AgentForEveryone API Service."""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import v1_router
from app.core.settings import settings

app = FastAPI(title="AgentForEveryone API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register central router
app.include_router(v1_router, prefix="/api/v1")


@app.get("/")
def health_check():
    """Service health and connection check."""
    return {"status": "online", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

"""Configuration loaded from environment variables."""

import os


OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
NEXTJS_API_URL: str = os.getenv("NEXTJS_API_URL", "http://localhost:3000/api")
AGENT_MODEL: str = os.getenv("AGENT_MODEL", "gpt-4o-mini")
PORT: int = int(os.getenv("PORT", "8000"))
HOST: str = os.getenv("HOST", "0.0.0.0")
CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

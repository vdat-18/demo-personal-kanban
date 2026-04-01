"""Service wrapper for BAML (Boundary ML) client."""

from baml_py import ClientRegistry
from baml_client import b
from baml_client.types import Message
from app.core.settings import settings

class LLMService:
    """Wrapper around BAML client for structured AI operations."""

    def __init__(self):
        """Build a registry to override BAML client at runtime."""
        self.registry = ClientRegistry()
        # Define MyClient dynamically using values from settings
        self.registry.add_llm_client(
            name="MyClient",
            provider="openai",
            options={
                "api_key": settings.LLM_API_KEY,
                "base_url": settings.LLM_BASE_URL,
                "model": settings.LLM_MODEL_NAME
            }
        )

    async def chat_with_planner(self, messages: list[dict[str, str]]) -> str:
        """Send chat messages using BAML ChatWithPlanner with registry."""
        baml_messages = [Message(role=msg["role"], content=msg["content"]) for msg in messages]
        return await b.ChatWithPlanner(
            messages=baml_messages, 
            baml_options={"client_registry": self.registry}
        )

    async def generate_report(self, messages: list[dict[str, str]]):
        """Generate a structured report using BAML GenerateProjectReport."""
        baml_messages = [Message(role=msg["role"], content=msg["content"]) for msg in messages]
        return await b.GenerateProjectReport(
            messages=baml_messages,
            baml_options={"client_registry": self.registry}
        )

llm_service = LLMService()

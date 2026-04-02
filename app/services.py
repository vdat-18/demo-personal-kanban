"""Planning service interface.

We keep a single abstraction (`LLMService`) for planning endpoints so
`app/main.py` stays minimal. Internally, this service uses
`pi-coding-agent` to generate:
- chat replies (markdown text)
- structured project reports (JSON with keys compatible with `ProjectReport`)
"""

from __future__ import annotations

from app.pi_runner import pi_runner
from baml_client import b
from baml_client.types import ProjectReport


class LLMService:
    """Service wrapper for planning endpoints.

    This service uses pi-coding-agent to generate results, then
    uses BAML for resilient parsing and validation of the AI output.
    """

    async def chat_with_planner(self, *, project_id: str, messages: list[dict[str, str]]) -> str:
        """Generate the next planning assistant reply."""
        return await pi_runner.chat_with_planner(project_id=project_id, messages=messages)

    async def generate_report(self, *, project_id: str) -> dict:
        """Generate a structured project report (dict form)."""
        # 1. Ask Pi Agent to generate raw text report
        report_text = await pi_runner.generate_project_report(project_id=project_id)

        # 2. Use BAML's resilient parsing to convert raw text into a ProjectReport object
        structured_report: ProjectReport = b.parse.GenerateProjectReport(report_text)

        # 3. Convert to dict for FastAPI response
        return structured_report.model_dump()


llm_service = LLMService()

"""
pi-coding-agent RPC runner.

This module adapts `@mariozechner/pi-coding-agent` for use from the Python
FastAPI backend.
We run `pi --mode rpc` as a subprocess, send a single prompt, and parse JSONL
events from stdout to collect the final assistant text.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import tempfile
from dataclasses import dataclass

from loguru import logger
from app.settings import settings


@dataclass(frozen=True)
class PiModelConfig:
    provider: str = "9router"
    model_id: str = "gemini-unlimited"


class PiRunner:
    def __init__(
        self,
        *,
        base_url: str,
        api_key: str,
        model: PiModelConfig = PiModelConfig(),
        pi_binary: str = "pi",
        timeout_seconds: int = 60,
    ):
        self._repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        self._base_url = base_url
        self._api_key = api_key
        self._model = model
        self._pi_binary = pi_binary
        self._timeout_seconds = timeout_seconds

        # Use the project root's .pi/agent directory for configuration
        self._config_dir = os.path.join(os.getcwd(), ".pi", "agent")
        os.makedirs(self._config_dir, exist_ok=True)
        self._write_models_json()

    def _write_models_json(self) -> None:
        models_json = {
            "providers": {
                self._model.provider: {
                    "baseUrl": self._base_url.rstrip("/").replace("/v1", ""),
                    # If your proxy ignores the key, this value can still be any literal.
                    "apiKey": self._api_key,
                    "api": "openai",
                    "models": [
                        {
                            "id": self._model.model_id,
                            "name": self._model.model_id,
                            "reasoning": False,
                            "input": ["text"],
                            "contextWindow": 128000,
                            "maxTokens": 16384,
                            "cost": {
                                "input": 0,
                                "output": 0,
                                "cacheRead": 0,
                                "cacheWrite": 0,
                            },
                        }
                    ],
                }
            }
        }

        models_path = os.path.join(self._config_dir, "models.json")
        with open(models_path, "w", encoding="utf-8") as f:
            json.dump(models_json, f)

    def _env(self) -> dict[str, str]:
        env = os.environ.copy()
        env["PI_CODING_AGENT_DIR"] = self._config_dir
        return env

    def _session_path(self, project_id: str) -> str:
        safe = re.sub(r"[^a-zA-Z0-9._-]+", "_", project_id).strip("_")
        sessions_root = os.path.join(self._repo_root, ".pi", "agent", "sessions")
        return os.path.join(sessions_root, f"{safe}.jsonl")

    async def _run_rpc_prompt(
        self,
        *,
        prompt: str,
        system_prompt: str | None,
        project_id: str,
    ) -> str:
        session_path = self._session_path(project_id)
        os.makedirs(os.path.dirname(session_path), exist_ok=True)

        cmd = [
            self._pi_binary,
            "--mode",
            "rpc",
            "--provider",
            self._model.provider,
            "--model",
            self._model.model_id,
            "--session",
            session_path,
            "--no-tools",
        ]
        if system_prompt:
            cmd.extend(["--system-prompt", system_prompt])

        logger.debug(f"Executing Pi command: {' '.join(cmd)}")
        logger.debug(f"Pi Config Dir (PI_CODING_AGENT_DIR): {self._config_dir}")
        
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self._env(),
                cwd=self._repo_root,
            )

            async def _read_stderr():
                while True:
                    line = await proc.stderr.readline()
                    if not line: break
                    logger.warning(f"Pi stderr: {line.decode().strip()}")
            
            asyncio.create_task(_read_stderr())
        except FileNotFoundError as e:
            raise RuntimeError("pi binary not found. Install with: npm install -g @mariozechner/pi-coding-agent") from e

        assert proc.stdin is not None
        assert proc.stdout is not None

        request = {"type": "prompt", "message": prompt}
        proc.stdin.write((json.dumps(request) + "\n").encode("utf-8"))
        await proc.stdin.drain()
        proc.stdin.close()

        final_text_parts: list[str] = []
        final_text: str | None = None

        async def _read_stream() -> None:
            nonlocal final_text
            while True:
                line = await proc.stdout.readline()
                if not line:
                    break

                raw = line.decode("utf-8", errors="replace").strip()
                if not raw:
                    continue

                logger.debug(f"Pi raw: {raw}")
                try:
                    event = json.loads(raw)
                except json.JSONDecodeError:
                    # pi may output non-JSON lines (startup logs) when
                    # misconfigured. We ignore them because the RPC protocol
                    # should still be JSONL.
                    continue

                if event.get("type") == "message_update":
                    assistant_message_event = event.get("assistantMessageEvent") or {}
                    delta_type = assistant_message_event.get("type")

                    if delta_type == "text_delta":
                        delta = assistant_message_event.get("delta")
                        if isinstance(delta, str):
                            final_text_parts.append(delta)
                    elif delta_type == "text_end":
                        content = assistant_message_event.get("content")
                        if isinstance(content, str):
                            final_text = content

                else:
                    logger.debug(f"Other Pi event: {event.get('type')}")

                if event.get("type") == "agent_end":
                    agent_messages = event.get("messages", [])
                    if agent_messages and agent_messages[0].get("errorMessage"):
                         logger.error(f"Pi Error: {agent_messages[0].get('errorMessage')}")
                    break

        try:
            await asyncio.wait_for(_read_stream(), timeout=self._timeout_seconds)
        except TimeoutError as exc:
            proc.kill()
            raise TimeoutError(f"pi timed out after {self._timeout_seconds}s") from exc

        return final_text if final_text is not None else "".join(final_text_parts)

    async def chat_with_planner(self, *, project_id: str, messages: list[dict[str, str]]) -> str:
        system_prompt = (
            "You are a professional AI Project Planner. Your role is to help the user "
            "brainstorm and define their project idea clearly. Be inquisitive, "
            "helpful, and structured in your responses. Use Markdown (bold, lists) "
            "to emphasize important points."
        )

        # With pi session enabled, pi already keeps conversation context.
        # Send only the latest user message to avoid duplicating history.
        last_user = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"),
            None,
        )
        if last_user is None:
            raise ValueError("chat_with_planner requires at least one user message")

        return await self._run_rpc_prompt(
            prompt=last_user,
            system_prompt=system_prompt,
            project_id=project_id,
        )

    async def generate_project_report(self, *, project_id: str) -> str:
        """Generate a detailed PROJECT REPORT based on the chat history."""
        schema_example = {
            "title": "string",
            "goal": "string",
            "scope": ["string"],
            "constraints": ["string"],
            "suggested_tasks": ["string"],
        }

        # We rely on pi session history (stored in the selected session file).
        prompt = (
            "Generate a detailed PROJECT REPORT based on the conversation "
            "in the current pi session.\n\n"
            "Return ONLY a single valid JSON object (no markdown, no triple "
            "backticks, no extra text).\n"
            "The JSON object must match this schema exactly:\n"
            + json.dumps(schema_example, ensure_ascii=False, indent=2)
        )

        return await self._run_rpc_prompt(
            prompt=prompt,
            system_prompt="You are a strict JSON generator.",
            project_id=project_id,
        )


# Singleton instance used by the FastAPI app.
pi_runner = PiRunner(
    model=PiModelConfig(model_id=settings.LLM_MODEL_NAME),
    base_url=settings.LLM_BASE_URL,
    api_key=settings.LLM_API_KEY,
)


# JSON parsing removed as we transitioned to BAML parsing in services.py.

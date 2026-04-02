"""Centralized configuration for the application using Pydantic Settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings and environment variables."""

    # LLM Settings
    LLM_BASE_URL: str = "http://localhost:20128/v1"
    LLM_API_KEY: str = "9router-test-dat"
    LLM_MODEL_NAME: str = "gemini-unlimited"


    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()

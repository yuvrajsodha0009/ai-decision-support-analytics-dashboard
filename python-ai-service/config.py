import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, Field


load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")


class Settings(BaseModel):
    groq_api_key: str = Field(default_factory=lambda: os.getenv("GROQ_API_KEY", ""))
    mongodb_uri: str = Field(
        default_factory=lambda: os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    )
    mongodb_db: str = Field(default_factory=lambda: os.getenv("MONGODB_DB", "analytics"))

    copilot_llm_provider: str = Field(
        default_factory=lambda: os.getenv("COPILOT_LLM_PROVIDER", "groq")
    )
    copilot_router_provider: str = Field(
        default_factory=lambda: os.getenv("COPILOT_ROUTER_PROVIDER", "")
    )
    copilot_answer_provider: str = Field(
        default_factory=lambda: os.getenv("COPILOT_ANSWER_PROVIDER", "")
    )
    groq_model: str = Field(
        default_factory=lambda: os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    )
    copilot_router_model: str = Field(
        default_factory=lambda: os.getenv("COPILOT_ROUTER_MODEL", "")
    )
    copilot_answer_model: str = Field(
        default_factory=lambda: os.getenv("COPILOT_ANSWER_MODEL", "")
    )
    groq_timeout_seconds: int = Field(
        default_factory=lambda: int(os.getenv("GROQ_TIMEOUT_SECONDS", "30"))
    )
    copilot_router_temperature: float = Field(
        default_factory=lambda: float(os.getenv("COPILOT_ROUTER_TEMPERATURE", "0"))
    )
    copilot_answer_temperature: float = Field(
        default_factory=lambda: float(os.getenv("COPILOT_ANSWER_TEMPERATURE", "0.2"))
    )
    max_result_limit: int = Field(default_factory=lambda: int(os.getenv("MAX_RESULT_LIMIT", "50")))
    mongo_server_selection_timeout_ms: int = Field(
        default_factory=lambda: int(os.getenv("MONGO_SERVER_SELECTION_TIMEOUT_MS", "2500"))
    )
    mongo_connect_timeout_ms: int = Field(
        default_factory=lambda: int(os.getenv("MONGO_CONNECT_TIMEOUT_MS", "2500"))
    )
    copilot_history_turn_limit: int = Field(
        default_factory=lambda: int(os.getenv("COPILOT_HISTORY_TURN_LIMIT", "10"))
    )
    copilot_series_limit: int = Field(
        default_factory=lambda: int(os.getenv("COPILOT_SERIES_LIMIT", "60"))
    )
    copilot_group_limit: int = Field(
        default_factory=lambda: int(os.getenv("COPILOT_GROUP_LIMIT", "20"))
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel


load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")


class Settings(BaseModel):
    pass


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()

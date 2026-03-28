import logging
import os
import sys
from pathlib import Path
from typing import Any


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

logger = logging.getLogger("python-ai-service")


def _approved_interpreters() -> list[Path]:
    service_dir = Path(__file__).resolve().parent
    repo_dir = service_dir.parent

    candidates = [
        repo_dir / "venv" / "Scripts" / "python.exe",
        service_dir / "venv" / "Scripts" / "python.exe",
    ]

    return [path.resolve() for path in candidates if path.exists()]


def _enforce_runtime_guard() -> None:
    allow_non_venv = os.getenv("ALLOW_NON_VENV_PYTHON", "false").strip().lower() == "true"
    current_python = Path(sys.executable).resolve()
    allowed = _approved_interpreters()

    logger.info("Python executable: %s", current_python)

    if allow_non_venv:
        logger.warning(
            "ALLOW_NON_VENV_PYTHON=true set; skipping venv runtime guard."
        )
        return

    if not allowed:
        logger.warning("No approved venv python executable found; skipping runtime guard.")
        return

    if current_python not in allowed:
        allowed_list = ", ".join(str(path) for path in allowed)
        raise RuntimeError(
            "Refusing to start with non-venv Python interpreter. "
            f"Current: {current_python}. Allowed: {allowed_list}. "
            "Use project venv python, or set ALLOW_NON_VENV_PYTHON=true to bypass."
        )


_enforce_runtime_guard()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import get_settings
from router import route_analysis


class AnalyzeRequest(BaseModel):
    intent: str
    metric: str | None = None
    data: list[Any] = Field(default_factory=list)
    filters: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)
    question: str | None = None


app = FastAPI(title="Analytics Dashboard AI Gateway", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    get_settings()
    return {
    "status": "ok",
    }


@app.post("/analyze")
async def analyze(request: AnalyzeRequest) -> dict[str, Any]:
    try:
        return await route_analysis(request.model_dump())
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive top-level guard
        logger.exception("Unhandled error while analyzing request: %s", exc)
        raise HTTPException(status_code=500, detail="AI gateway failed") from exc

import logging
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import get_settings
from router import route_analysis


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

logger = logging.getLogger("python-ai-service")


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
        return route_analysis(request.model_dump())
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive top-level guard
        logger.exception("Unhandled error while analyzing request: %s", exc)
        raise HTTPException(status_code=500, detail="AI gateway failed") from exc

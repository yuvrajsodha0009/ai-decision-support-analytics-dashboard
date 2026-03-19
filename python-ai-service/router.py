import logging
from typing import Any

from fastapi import HTTPException

from services import anomaly, forecasting, nlq, recommendation


logger = logging.getLogger("python-ai-service.router")

SUPPORTED_INTENTS = {
    "anomaly": anomaly.detect_anomaly,
    "forecast": forecasting.generate_forecast,
    "recommendation": recommendation.generate_recommendation,
    "nlq": nlq.run_nlq_query,
}


def route_analysis(payload: dict[str, Any]) -> dict[str, Any]:
    intent = str(payload.get("intent", "")).strip().lower()
    metric = payload.get("metric")
    data = payload.get("data") or []
    filters = payload.get("filters") or {}
    context = payload.get("context") or {}
    question = payload.get("question")

    handler = SUPPORTED_INTENTS.get(intent)
    if handler is None:
        raise HTTPException(status_code=400, detail=f"Unsupported intent: {intent}")

    try:
        if intent == "nlq":
            response_payload = handler(question=question or "", data=data, context=context)
        else:
            response_payload = handler(data=data, metric=metric, context=context)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Intent handler '%s' failed: %s", intent, exc)
        raise HTTPException(
            status_code=500,
            detail=str(exc) or "Intent processing failed",
        ) from exc

    result_text = "AI pipeline connected successfully"
    provider = "placeholder"

    if isinstance(response_payload, dict):
        result_text = response_payload.get("text") or result_text
        provider = response_payload.get("provider") or provider

    return {
        "result": result_text,
        "intent": intent,
        "payload": response_payload,
        "meta": {
            "provider": provider,
            "recordsReceived": len(data),
            "metric": metric,
        },
    }

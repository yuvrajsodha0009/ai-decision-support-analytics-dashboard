import logging
from typing import Any

from fastapi import HTTPException

from services import anomaly, execution_service, forecasting, intent_service, nlq, recommendation, response_service
from services.insight_builder import build_insight_pack
from utils.mongo_builder import build_orders_pipeline
from utils.validator import validate_intent


logger = logging.getLogger("python-ai-service.router")

SUPPORTED_INTENTS = {
    "anomaly": anomaly.detect_anomaly,
    "forecast": forecasting.generate_forecast,
    "recommendation": recommendation.generate_recommendation,
    "nlq": nlq.run_nlq_query,
    "analytics_copilot": None,
}


def _detect_data_source(execution_rows: list[dict[str, Any]], raw_data: list[dict[str, Any]], raw_context: dict[str, Any]) -> str:
    has_dashboard_context = bool(raw_data) or bool(raw_context)
    if execution_rows and has_dashboard_context:
        return "hybrid"
    if execution_rows:
        return "mongo"
    if has_dashboard_context:
        return "dashboard_context"
    return "minimal_context"


async def _run_analytics_copilot(
    question: str,
    filters: dict[str, Any],
    data: list[dict[str, Any]],
    context: dict[str, Any],
) -> dict[str, Any]:
    if not question or not str(question).strip():
        raise HTTPException(status_code=400, detail="Question is required for analytics_copilot")

    try:
        intent = await intent_service.parse_intent(
            question,
            chat_history=context.get("chatHistory") if isinstance(context, dict) else None,
            dashboard_context=context if isinstance(context, dict) else {},
            filters=filters,
        )
        validated = validate_intent(intent=intent, external_filters=filters)

        execution_rows: list[dict[str, Any]] = []
        if intent.query_type not in {"conversational_greeting", "out_of_domain"}:
            pipeline = build_orders_pipeline(validated)
            try:
                execution_rows = await execution_service.execute_orders_aggregation(pipeline)
            except Exception as exec_error:
                logger.warning(
                    "analytics_copilot mongo execution failed; using dashboard fallback",
                    exc_info=exec_error,
                )

        data_source = _detect_data_source(execution_rows, data, context)
        insight_result = build_insight_pack(
            question=question,
            intent=intent,
            execution_rows=execution_rows,
            raw_data=data,
            raw_context=context,
            data_source=data_source,
        )
        response_envelope = await response_service.build_ask_ai_response(
            question=question,
            intent=intent,
            raw_data=data,
            raw_context=context,
            insight_result=insight_result,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return response_envelope


async def route_analysis(payload: dict[str, Any]) -> dict[str, Any]:
    intent = str(payload.get("intent", "")).strip().lower()
    metric = payload.get("metric")
    data = payload.get("data") or []
    filters = payload.get("filters") or {}
    context = payload.get("context") or {}
    question = payload.get("question")

    if intent not in SUPPORTED_INTENTS:
        raise HTTPException(status_code=400, detail=f"Unsupported intent: {intent}")

    try:
        if intent == "analytics_copilot":
            return await _run_analytics_copilot(
                question=question or "",
                filters=filters,
                data=data,
                context=context,
            )
        if intent == "nlq":
            response_payload = SUPPORTED_INTENTS[intent](question=question or "", data=data, context=context)
        else:
            response_payload = SUPPORTED_INTENTS[intent](data=data, metric=metric, context=context)
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

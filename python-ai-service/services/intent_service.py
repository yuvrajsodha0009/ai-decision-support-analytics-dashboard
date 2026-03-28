import json
import re
from typing import Any

from langchain_core.prompts import ChatPromptTemplate

from config import get_settings
from models.ask_ai_model import AskAIIntent
from prompts.intent_prompt import (
    ROUTER_PLANNER_HUMAN_PROMPT,
    ROUTER_PLANNER_SYSTEM_PROMPT,
)
from services.llm_provider import get_chat_model


def _build_router_chain():
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", ROUTER_PLANNER_SYSTEM_PROMPT),
            ("human", ROUTER_PLANNER_HUMAN_PROMPT),
        ]
    )
    llm = get_chat_model(task="router")
    return prompt | llm.with_structured_output(AskAIIntent)


def _trim_history(chat_history: list[dict] | None) -> list[dict[str, str]]:
    settings = get_settings()
    turns = chat_history or []
    normalized: list[dict[str, str]] = []

    for turn in turns[-settings.copilot_history_turn_limit :]:
        role = str(turn.get("role", "user")).strip().lower()
        content = str(turn.get("content", "")).strip()
        if role not in {"user", "assistant"} or not content:
            continue
        normalized.append({"role": role, "content": content})

    return normalized


def _context_payload(dashboard_context: dict[str, Any] | None, filters: dict[str, Any] | None) -> dict[str, Any]:
    context = dashboard_context or {}
    summary = context.get("summary") if isinstance(context.get("summary"), dict) else {}

    return {
        "activeContext": context.get("activeContext"),
        "contextLabel": context.get("contextLabel"),
        "filters": filters or {},
        "summary": {
            "totalRevenue": summary.get("totalRevenue"),
            "totalOrders": summary.get("totalOrders"),
            "aov": summary.get("aov"),
            "conversionRate": summary.get("conversionRate"),
        },
        "topCategories": (context.get("topCategories") or [])[:3],
        "topRegions": (context.get("topRegions") or [])[:3],
    }


def _looks_like_greeting(text: str) -> bool:
    normalized = text.strip().lower()
    if normalized in {"hi", "hello", "hey", "thanks", "thank you", "good morning", "good evening"}:
        return True
    return bool(
        re.fullmatch(r"(hi|hello|hey|thanks|thank you)[!. ]*", normalized)
    )


def _looks_like_out_of_domain(text: str) -> bool:
    normalized = text.strip().lower()
    analytics_tokens = [
        "revenue",
        "sales",
        "orders",
        "trend",
        "compare",
        "category",
        "region",
        "chart",
        "dashboard",
        "aov",
        "conversion",
        "performance",
        "week",
        "month",
        "date",
        "pattern",
        "recommend",
        "why",
        "drop",
        "spike",
    ]
    if any(token in normalized for token in analytics_tokens):
        return False
    return any(
        token in normalized
        for token in [
            "weather",
            "recipe",
            "movie",
            "code",
            "poem",
            "translate",
            "capital of",
            "joke",
            "who is",
            "what is the population",
        ]
    )


def _is_driver_question(text: str) -> bool:
    normalized = str(text or "").strip().lower()
    has_orders = "order" in normalized or "volume" in normalized
    has_aov = "aov" in normalized or "average order value" in normalized
    return has_orders and has_aov


def _fallback_plan(question: str, chat_history: list[dict[str, str]] | None, dashboard_context: dict[str, Any] | None) -> AskAIIntent:
    text = str(question or "").strip()
    normalized = text.lower()
    active_context = str((dashboard_context or {}).get("activeContext") or "").strip().lower()

    if _looks_like_greeting(normalized):
        query_type = "conversational_greeting"
    elif _looks_like_out_of_domain(normalized):
        query_type = "out_of_domain"
    elif any(token in normalized for token in ["recommend", "action", "what should", "how do we", "how can we"]):
        query_type = "recommendation"
    elif _is_driver_question(normalized) or any(token in normalized for token in ["compare", "versus", "vs", "difference", "more than", "less than"]):
        query_type = "comparison"
    elif any(token in normalized for token in ["why", "cause", "caused", "driver", "drove", "drop", "spike", "dip", "recovered"]):
        query_type = "diagnostic"
    elif any(token in normalized for token in ["pattern", "trend", "trajectory", "repeat", "repeating", "streak", "volatility"]):
        query_type = "pattern"
    else:
        query_type = "aggregation"

    if _is_driver_question(normalized):
        metric = "revenue"
        aggregation = "sum"
    elif "order" in normalized or active_context == "orders_chart":
        metric = "orders"
        aggregation = "count"
    else:
        metric = "revenue"
        aggregation = "sum"

    group_by = "none"
    sort = "desc"
    chart_type = "none"
    if "category" in normalized:
        group_by = "category"
    elif "region" in normalized:
        group_by = "region"
    elif any(token in normalized for token in ["trend", "day", "date", "week", "month", "spike", "dip", "recovered"]):
        group_by = "date"
        sort = "asc"
        chart_type = "line"

    filters = {
        "date_range": None,
        "region": None,
        "category": None,
    }
    if "today" in normalized:
        filters["date_range"] = "today"
    elif any(token in normalized for token in ["last 7", "this week", "recent", "past week"]):
        filters["date_range"] = "last_7_days"
    elif "this month" in normalized:
        filters["date_range"] = "this_month"

    last_answer_summary = ""
    for turn in reversed(chat_history or []):
        if turn.get("role") == "assistant":
            last_answer_summary = turn.get("content", "")[:240]
            break

    follow_up_mode = "optional"
    tone = "direct_analytical"
    confidence_score = 0.72
    if query_type == "out_of_domain":
        follow_up_mode = "redirect"
        tone = "redirect_supportive"
        confidence_score = 0.95
    elif query_type == "conversational_greeting":
        tone = "redirect_supportive"
        confidence_score = 0.92
    elif query_type in {"comparison", "diagnostic"}:
        confidence_score = 0.66
        tone = "measured_analytical"

    response_goal = {
        "aggregation": "Answer the KPI question directly with concrete values.",
        "diagnostic": "Explain the strongest movement using observed changes only.",
        "comparison": "Compare both sides numerically and highlight the delta.",
        "pattern": "Describe the shape, reversals, and repeated behavior in the series.",
        "recommendation": "Recommend the next action grounded in observed evidence.",
        "conversational_greeting": "Greet briefly and redirect into helpful analytics questions.",
        "out_of_domain": "Redirect politely to supported analytics tasks.",
    }[query_type]

    return AskAIIntent(
        metric=metric,
        aggregation=aggregation,
        group_by=group_by,
        filters=filters,
        sort=sort,
        limit=1 if any(token in normalized for token in ["top", "highest", "best"]) and group_by != "none" else None,
        chart_type=chart_type,
        query_type=query_type,
        conversation_context={
            "session_goal": "Understand the current dashboard performance.",
            "active_metric_or_dimension": metric if group_by == "none" else group_by,
            "referenced_periods": [token for token in ["today", "this week", "last 7 days", "this month"] if token in normalized],
            "last_answer_summary": last_answer_summary,
            "open_follow_up": text if query_type in {"comparison", "diagnostic", "recommendation"} else "",
        },
        answer_plan={
            "response_goal": response_goal,
            "evidence_priority": [
                "primary_insight",
                "insight_summary",
                "comparisons" if query_type == "comparison" else "anomalies" if query_type == "diagnostic" else "evidence_rows",
            ],
            "comparison_axes": [metric, "time"] if query_type in {"comparison", "pattern", "diagnostic"} else [metric],
            "required_mentions": (
                ["orders % change", "AOV % change", "dominant driver", "numbers", "dates"]
                if _is_driver_question(normalized)
                else ["premise validation", "likely cause", "confidence", "numbers", "dates"]
                if query_type == "diagnostic"
                else ["numbers", "dates"]
                if query_type not in {"conversational_greeting", "out_of_domain"}
                else ["supported analytics tasks"]
            ),
            "recommendation_mode": "required" if query_type == "recommendation" else "optional",
            "tone": tone,
            "needs_visuals": group_by in {"date", "category", "region"} and query_type in {"comparison", "pattern"},
            "follow_up_mode": follow_up_mode,
        },
        confidence_score=confidence_score,
    )


def _normalize_router_output(intent: AskAIIntent, question: str, dashboard_context: dict[str, Any] | None) -> AskAIIntent:
    text = str(question or "").strip().lower()
    active_context = str((dashboard_context or {}).get("activeContext") or "").strip().lower()

    if _is_driver_question(text):
        intent.query_type = "comparison"
        intent.metric = "revenue"
        intent.aggregation = "sum"
        intent.group_by = "date" if any(token in text for token in ["date", "day", "period", "week", "month", "trend"]) else "none"
        intent.answer_plan.required_mentions = [
            "orders % change",
            "AOV % change",
            "dominant driver",
            "numbers",
            "dates",
        ]
    elif "order" in text or (active_context == "orders_chart" and "revenue" not in text and "sales" not in text):
        intent.metric = "orders"
        intent.aggregation = "count"
    elif "revenue" in text or "sales" in text:
        intent.metric = "revenue"
        if intent.aggregation == "count":
            intent.aggregation = "sum"

    if any(token in text for token in ["trend", "spike", "dip", "recovered", "recovery", "pattern"]) and intent.group_by == "none":
        intent.group_by = "date"
        intent.sort = "asc"

    if "today" in text:
        intent.filters.date_range = "today"
    elif any(token in text for token in ["last 7", "this week", "recent", "past week"]):
        intent.filters.date_range = "last_7_days"
    elif "this month" in text:
        intent.filters.date_range = "this_month"

    if intent.query_type in {"conversational_greeting", "out_of_domain"}:
        intent.group_by = "none"
        intent.limit = None
        intent.chart_type = "none"
        intent.answer_plan.needs_visuals = False
    elif intent.query_type == "diagnostic":
        required_mentions = list(intent.answer_plan.required_mentions or [])
        for mention in ["premise validation", "likely cause", "confidence", "numbers", "dates"]:
            if mention not in required_mentions:
                required_mentions.append(mention)
        intent.answer_plan.required_mentions = required_mentions

    if intent.confidence_score >= 0.75:
        intent.answer_plan.tone = "direct_analytical"
    elif intent.confidence_score >= 0.55:
        intent.answer_plan.tone = "measured_analytical"
    else:
        intent.answer_plan.tone = "redirect_supportive"

    return intent


async def parse_intent(
    question: str,
    chat_history: list[dict] | None = None,
    dashboard_context: dict[str, Any] | None = None,
    filters: dict[str, Any] | None = None,
) -> AskAIIntent:
    if not question or not str(question).strip():
        raise ValueError("Question is required")

    normalized_question = str(question).strip()
    normalized_history = _trim_history(chat_history)
    context_json = json.dumps(
        _context_payload(dashboard_context=dashboard_context, filters=filters),
        default=str,
    )
    history_json = json.dumps(normalized_history, default=str)

    try:
        chain = _build_router_chain()
        parsed = await chain.ainvoke(
            {
                "question": normalized_question,
                "history_json": history_json,
                "context_json": context_json,
            }
        )
        return _normalize_router_output(parsed, normalized_question, dashboard_context)
    except Exception:
        return _fallback_plan(
            normalized_question,
            chat_history=normalized_history,
            dashboard_context=dashboard_context,
        )

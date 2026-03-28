import json
import re
from typing import Any

from langchain_core.prompts import ChatPromptTemplate

from models.ask_ai_model import (
    AnswerSections,
    AskAIIntent,
    AskAIResponseEnvelope,
    CopilotAnswer,
    CopilotArtifacts,
    FinalAnswerOutput,
    InsightPack,
    QueryExecuted,
)
from prompts.response_prompt import (
    FINAL_ANSWER_HUMAN_PROMPT,
    FINAL_ANSWER_SYSTEM_PROMPT,
)
from services.llm_provider import get_chat_model


def _serialize_json(value: Any) -> str:
    return json.dumps(value, default=str, ensure_ascii=True)


def _build_answer_chain():
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", FINAL_ANSWER_SYSTEM_PROMPT),
            ("human", FINAL_ANSWER_HUMAN_PROMPT),
        ]
    )
    llm = get_chat_model(task="answer")
    return prompt | llm.with_structured_output(FinalAnswerOutput)


def _dedupe_strings(values: list[str] | None) -> list[str]:
    deduped: list[str] = []
    seen: set[str] = set()
    for value in values or []:
        normalized = str(value or "").strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(normalized)
    return deduped


def _is_why_question(question: str) -> bool:
    lower = str(question or "").lower()
    return any(token in lower for token in ["why", "cause", "caused", "reason", "likely caused"])


def _is_driver_question(question: str) -> bool:
    lower = str(question or "").lower()
    has_orders = "order" in lower or "volume" in lower
    has_aov = "aov" in lower or "average order value" in lower
    return has_orders and has_aov


def _summary_duplicates_insight(summary: str, insight: str) -> bool:
    left = re.sub(r"\s+", " ", str(summary or "").strip().lower())
    right = re.sub(r"\s+", " ", str(insight or "").strip().lower())
    return bool(left and right and left == right)


def _stringify_sections(
    ai_summary: str,
    sections: AnswerSections,
    likely_cause: str | None = None,
    confidence_level: str | None = None,
    follow_up_suggestions: list[str] | None = None,
    follow_up_suggestion: str | None = None,
) -> str:
    parts: list[str] = []
    if ai_summary:
        parts.append(ai_summary)
    if sections.key_insight:
        parts.append(sections.key_insight)
    if sections.supporting_evidence:
        parts.append("Supporting evidence: " + " ".join(sections.supporting_evidence))
    if likely_cause:
        confidence_suffix = f" Confidence: {confidence_level}." if confidence_level else ""
        parts.append(f"Likely cause: {likely_cause}{confidence_suffix}")
    if sections.conclusion:
        parts.append(sections.conclusion)
    if sections.recommendations:
        parts.append("Recommendations: " + " ".join(sections.recommendations))
    if follow_up_suggestions:
        parts.append("Try next: " + " ".join(_dedupe_strings(follow_up_suggestions)[:3]))
    if follow_up_suggestion:
        parts.append(f"Suggested follow-up: {follow_up_suggestion}")
    return "\n\n".join(part for part in parts if part).strip()


def _has_numeric_or_date(text: str) -> bool:
    normalized = str(text or "")
    if re.search(r"\d", normalized):
        return True
    return bool(
        re.search(r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b", normalized.lower())
    )


def _uses_numeric_abbreviation(text: str) -> bool:
    normalized = str(text or "").lower()
    return bool(
        re.search(
            r"\b\d+(?:,\d{2,3})*(?:\.\d+)?\s?(?:k|m|mn|b|bn|cr|crore|crores|lakh|lakhs|lac|lacs)\b",
            normalized,
        )
    )


def _meaningful_terms(text: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-zA-Z]{4,}", str(text or "").lower())
        if token not in {"that", "with", "from", "this", "have", "into", "over", "your", "selected"}
    }


def _build_default_follow_ups(intent: AskAIIntent, insight_pack: dict[str, Any]) -> list[str]:
    explicit = _dedupe_strings(list(insight_pack.get("follow_up_options", [])))
    if explicit:
        return explicit[:3]

    if intent.answer_plan.follow_up_mode == "none":
        return []

    suggestions = {
        "aggregation": [
            f"Would you like a comparison by category for {intent.metric}?",
            f"Should I break {intent.metric} down by region next?",
        ],
        "diagnostic": [
            f"Do you want to compare the break window against the surrounding periods for {intent.metric}?",
            "Should I check whether orders or AOV drove that move?",
        ],
        "comparison": [
            "Would you like the comparison broken down by category next?",
            "Should I run the same comparison by date?",
        ],
        "pattern": [
            f"Would you like the same pattern check on orders versus {intent.metric}?",
            "Should I isolate the biggest reversal by category?",
        ],
        "recommendation": [
            "Would you like the top 2 actions ranked by likely impact next?",
            "Should I break the strongest and weakest dates down by category?",
        ],
        "conversational_greeting": [
            "Try asking why a spike happened.",
            "Ask how this week compares with the previous one.",
            "Ask what action to take next.",
        ],
        "out_of_domain": [
            "Try asking about revenue, orders, spikes, comparisons, or recommended next actions.",
        ],
    }
    return suggestions.get(intent.query_type, [])


def _validate_final_answer(
    final_answer: FinalAnswerOutput,
    intent: AskAIIntent,
    insight_pack: dict[str, Any],
    question: str,
) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    primary_insight = str(insight_pack.get("primary_insight") or "")
    ai_summary = str(final_answer.ai_summary or "")
    likely_cause = str(final_answer.likely_cause or "")
    evidence_exists = bool(
        insight_pack.get("evidence_rows")
        or insight_pack.get("comparisons")
        or insight_pack.get("anomalies")
        or insight_pack.get("driver_signals")
    )

    if primary_insight:
      primary_terms = _meaningful_terms(primary_insight)
      lead_terms = _meaningful_terms(final_answer.key_insight)
      if primary_terms and not (primary_terms & lead_terms):
          reasons.append("primary_insight_not_reflected")

    if not ai_summary:
        reasons.append("missing_ai_summary")
    elif _summary_duplicates_insight(ai_summary, final_answer.key_insight):
        reasons.append("summary_duplicates_primary")

    if evidence_exists:
        combined_text = " ".join(
            [
                final_answer.key_insight,
                ai_summary,
                " ".join(final_answer.supporting_evidence),
                final_answer.conclusion,
            ]
        )
        if not _has_numeric_or_date(combined_text):
            reasons.append("missing_numbers_or_dates")

    if intent.query_type == "comparison":
        combined_text = " ".join(final_answer.supporting_evidence + [final_answer.key_insight, final_answer.conclusion])
        if not re.search(r"\bvs\b|\bversus\b|\bdelta\b|%", combined_text.lower()):
            reasons.append("missing_comparison_delta")

    if intent.query_type in {"conversational_greeting", "out_of_domain"}:
        lower = " ".join(
            [final_answer.key_insight, final_answer.conclusion, final_answer.follow_up_suggestion or ""]
        ).lower()
        if "try asking" not in lower and "ask about" not in lower:
            reasons.append("missing_redirect_guidance")

    if _is_why_question(question):
        if not likely_cause:
            reasons.append("missing_likely_cause")
        if final_answer.confidence_level not in {"low", "medium", "high"}:
            reasons.append("missing_confidence_level")

    if _is_driver_question(question):
        combined_text = " ".join(
            [
                final_answer.key_insight,
                " ".join(final_answer.supporting_evidence),
                likely_cause,
            ]
        ).lower()
        if "orders" not in combined_text or ("aov" not in combined_text and "average order value" not in combined_text):
            reasons.append("missing_driver_comparison")

    premise_validation = str(insight_pack.get("premise_validation") or "")
    if premise_validation and "did not" in premise_validation.lower():
        visible_text = " ".join([ai_summary, final_answer.key_insight]).lower()
        if "did not" not in visible_text:
            reasons.append("missing_premise_correction")

    generic_patterns = [
        "based on the data provided",
        "it appears that",
        "shows an upward trend",
        "shows a downward trend",
    ]
    lower_text = " ".join(
        [final_answer.key_insight, " ".join(final_answer.supporting_evidence), final_answer.conclusion]
    ).lower()
    if any(pattern in lower_text for pattern in generic_patterns):
        reasons.append("generic_wording")
    if _uses_numeric_abbreviation(lower_text):
        reasons.append("abbreviated_numeric_units")
    if not _dedupe_strings(final_answer.follow_up_suggestions):
        reasons.append("missing_contextual_follow_ups")

    return len(reasons) == 0, reasons


def _safe_fallback(intent: AskAIIntent, insight_pack: dict[str, Any]) -> tuple[FinalAnswerOutput, list[str]]:
    summary = [item for item in insight_pack.get("insight_summary", []) if item][:2]
    if not summary:
        summary = [item for item in insight_pack.get("evidence_rows", []) if item][:2]
    follow_ups = _build_default_follow_ups(intent, insight_pack)
    primary = str(
        insight_pack.get("primary_insight")
        or "I could not validate a stronger answer from the current context."
    ).strip()
    ai_summary = str(
        insight_pack.get("ai_summary")
        or insight_pack.get("premise_validation")
        or primary
        or "I could not validate a stronger answer from the current context."
    ).strip()
    if _summary_duplicates_insight(ai_summary, primary):
        ai_summary = (
            str(summary[0]).strip()
            if summary
            else f"In short, {primary[0].lower() + primary[1:]}" if len(primary) > 1 else primary
        )
    likely_cause = str(insight_pack.get("likely_cause") or "").strip() or None

    answer = FinalAnswerOutput(
        ai_summary=ai_summary,
        key_insight=primary,
        supporting_evidence=summary,
        likely_cause=likely_cause,
        confidence_level=insight_pack.get("confidence_level"),
        conclusion=(
            "This fallback stays close to the most reliable evidence currently available."
            if summary
            else "The current context is too limited for a stronger validated answer."
        ),
        recommendations=list(insight_pack.get("next_actions", []))[:3],
        follow_up_suggestion=follow_ups[0] if follow_ups else None,
        follow_up_suggestions=follow_ups[:3],
    )
    return answer, ["validation_fallback"]


def _coerce_sections(final_answer: FinalAnswerOutput, intent: AskAIIntent, insight_pack: dict[str, Any]) -> AnswerSections:
    recommendations = list(final_answer.recommendations or [])
    if not recommendations and insight_pack.get("next_actions"):
        recommendations = insight_pack["next_actions"][:3]
    elif intent.query_type == "recommendation" and not recommendations and insight_pack.get("recommendation_basis"):
        recommendations = insight_pack["recommendation_basis"][:2]

    return AnswerSections(
        key_insight=final_answer.key_insight.strip(),
        supporting_evidence=[item.strip() for item in final_answer.supporting_evidence if str(item).strip()],
        conclusion=final_answer.conclusion.strip(),
        recommendations=[item.strip() for item in recommendations if str(item).strip()],
    )


def _query_description(intent: AskAIIntent) -> str:
    return (
        f"{intent.query_type} query on {intent.metric} grouped by {intent.group_by}"
        if intent.query_type not in {"conversational_greeting", "out_of_domain"}
        else f"{intent.query_type} copilot response"
    )


async def build_ask_ai_response(
    question: str,
    intent: AskAIIntent,
    raw_data: list[dict[str, Any]] | None,
    raw_context: dict[str, Any] | None,
    insight_result: dict[str, Any],
) -> dict[str, Any]:
    raw_data = raw_data or []
    raw_context = raw_context or {}
    insight_pack_dict = insight_result.get("insight_pack") or {}

    chain = _build_answer_chain()
    follow_up_defaults = _build_default_follow_ups(intent, insight_pack_dict)

    try:
        final_answer = await chain.ainvoke(
            {
                "premise_validation": str(insight_pack_dict.get("premise_validation") or ""),
                "ai_summary_hint": str(insight_pack_dict.get("ai_summary") or ""),
                "likely_cause_hint": str(insight_pack_dict.get("likely_cause") or ""),
                "confidence_level_hint": str(insight_pack_dict.get("confidence_level") or ""),
                "primary_insight": str(insight_pack_dict.get("primary_insight") or ""),
                "prioritized_insights_json": _serialize_json(insight_pack_dict.get("prioritized_insights", [])),
                "insight_summary_json": _serialize_json(insight_pack_dict.get("insight_summary", [])),
                "answer_plan_json": _serialize_json(intent.answer_plan.model_dump()),
                "next_actions_json": _serialize_json(insight_pack_dict.get("next_actions", [])),
                "follow_up_options_json": _serialize_json(insight_pack_dict.get("follow_up_options", [])),
                "raw_data_json": _serialize_json(raw_data),
                "filters_json": _serialize_json(raw_context.get("filters") or {}),
                "conversation_context_json": _serialize_json(intent.conversation_context.model_dump()),
                "history_json": _serialize_json(raw_context.get("chatHistory") or []),
                "question": question,
            }
        )
        if not final_answer.ai_summary:
            final_answer.ai_summary = str(
                insight_pack_dict.get("ai_summary")
                or insight_pack_dict.get("premise_validation")
                or insight_pack_dict.get("primary_insight")
                or ""
            ).strip()
        if not final_answer.likely_cause and insight_pack_dict.get("likely_cause"):
            final_answer.likely_cause = str(insight_pack_dict.get("likely_cause")).strip()
        if not final_answer.confidence_level and insight_pack_dict.get("confidence_level"):
            final_answer.confidence_level = insight_pack_dict.get("confidence_level")
        final_answer.follow_up_suggestions = _dedupe_strings(
            list(final_answer.follow_up_suggestions or [])
            + ([final_answer.follow_up_suggestion] if final_answer.follow_up_suggestion else [])
            + follow_up_defaults
        )[:3]
        if not final_answer.follow_up_suggestion and final_answer.follow_up_suggestions:
            final_answer.follow_up_suggestion = final_answer.follow_up_suggestions[0]
        is_valid, validation_reasons = _validate_final_answer(final_answer, intent, insight_pack_dict, question)
    except Exception:
        final_answer, validation_reasons = _safe_fallback(intent, insight_pack_dict)
        is_valid = False

    if not is_valid:
        final_answer, fallback_reasons = _safe_fallback(intent, insight_pack_dict)
        validation_reasons = list(dict.fromkeys(validation_reasons + fallback_reasons))

    sections = _coerce_sections(final_answer, intent, insight_pack_dict)
    content = _stringify_sections(
        final_answer.ai_summary,
        sections,
        final_answer.likely_cause,
        final_answer.confidence_level,
        final_answer.follow_up_suggestions,
        final_answer.follow_up_suggestion,
    )
    artifacts = insight_result.get("artifacts") or {}
    answer_type = "chart" if artifacts.get("chart") else "text"

    answer = CopilotAnswer(
        type=answer_type,
        ai_summary=(final_answer.ai_summary or str(insight_pack_dict.get("ai_summary") or "")).strip(),
        primary_insight=str(insight_pack_dict.get("primary_insight") or final_answer.key_insight).strip(),
        prioritized_insights=list(insight_pack_dict.get("prioritized_insights", []))[:6],
        likely_cause=(final_answer.likely_cause or str(insight_pack_dict.get("likely_cause") or "")).strip() or None,
        confidence_level=final_answer.confidence_level or insight_pack_dict.get("confidence_level"),
        sections=sections,
        follow_up_suggestion=final_answer.follow_up_suggestion,
        follow_up_suggestions=_dedupe_strings(final_answer.follow_up_suggestions)[:3],
        content=content,
    )

    envelope = AskAIResponseEnvelope(
        answer=answer,
        artifacts=CopilotArtifacts.model_validate(artifacts or {}),
        context_used=insight_result.get("context_used") or {},
        query_executed=QueryExecuted(
            description=_query_description(intent),
            metric=intent.metric,
            aggregation=intent.aggregation,
            grouping=intent.group_by,
            query_type=intent.query_type,
            confidence_score=float(intent.confidence_score),
        ),
        insight_pack=InsightPack.model_validate(insight_pack_dict),
        data_source=insight_result.get("data_source") or "dashboard_context",
        meta={
            "provider": "copilot-final-answer",
            "validationFallback": not is_valid,
            "validationReasons": validation_reasons,
        },
    )
    return envelope.model_dump()

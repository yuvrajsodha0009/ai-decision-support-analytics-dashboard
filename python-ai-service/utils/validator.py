from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from config import get_settings
from models.ask_ai_model import AskAIIntent


@dataclass(slots=True)
class ValidatedIntent:
    intent: AskAIIntent
    custom_start: datetime | None = None
    custom_end: datetime | None = None


def _parse_iso_datetime(value: Any) -> datetime | None:
    if value is None:
        return None

    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    text = str(value).strip()
    if not text:
        return None

    if text.endswith("Z"):
        text = text[:-1] + "+00:00"

    parsed = datetime.fromisoformat(text)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return parsed.astimezone(timezone.utc)


def validate_intent(intent: AskAIIntent, external_filters: dict[str, Any] | None = None) -> ValidatedIntent:
    settings = get_settings()

    if intent.metric == "orders" and intent.aggregation in {"sum", "avg"}:
        intent.aggregation = "count"

    if intent.query_type in {"conversational_greeting", "out_of_domain"}:
        intent.group_by = "none"
        intent.limit = None
        intent.chart_type = "none"

    if intent.limit is not None and intent.limit > settings.max_result_limit:
        intent.limit = settings.max_result_limit

    if intent.group_by == "none":
        intent.limit = None

    filters = external_filters or {}
    if not intent.filters.region and filters.get("region"):
        intent.filters.region = str(filters.get("region"))
    if not intent.filters.category and filters.get("category"):
        intent.filters.category = str(filters.get("category"))

    custom_start = None
    custom_end = None
    if intent.filters.date_range == "custom":
        custom_start = _parse_iso_datetime(filters.get("start") or filters.get("start_date"))
        custom_end = _parse_iso_datetime(filters.get("end") or filters.get("end_date"))

        if custom_start is None or custom_end is None:
            intent.filters.date_range = "last_7_days"
            custom_start = None
            custom_end = None
        elif custom_start > custom_end:
            raise ValueError("Custom date range start must be <= end")

    return ValidatedIntent(intent=intent, custom_start=custom_start, custom_end=custom_end)

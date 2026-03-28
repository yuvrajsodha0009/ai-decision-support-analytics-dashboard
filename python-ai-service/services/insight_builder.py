from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime
import re
from statistics import mean, pstdev
from typing import Any

from config import get_settings
from models.ask_ai_model import AskAIIntent
from utils.data_formatter import extract_series_points, humanize_metric


MONTH_LOOKUP = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}

QUESTION_DAY_MONTH_PATTERN = re.compile(
    r"\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b",
    re.IGNORECASE,
)


def _to_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _format_number(value: float) -> str:
    if float(value).is_integer():
        return f"{int(value):,}"
    return f"{value:,.2f}"


def _format_metric_value(metric: str, value: float) -> str:
    if metric == "revenue":
        return f"Rs {_format_number(value)}"
    return _format_number(value)


def _parse_date(value: Any) -> date | None:
    text = str(value or "").strip()
    if not text:
        return None

    if text.endswith("Z"):
        text = text.replace("Z", "+00:00")

    for candidate in (text, text[:10]):
        try:
            if len(candidate) == 10 and "T" not in candidate:
                return datetime.strptime(candidate, "%Y-%m-%d").date()
            return datetime.fromisoformat(candidate).date()
        except ValueError:
            continue

    return None


def _format_period(value: Any) -> str:
    parsed = _parse_date(value)
    if parsed:
        return parsed.strftime("%d %b")
    return str(value or "selected period")


def _infer_reference_year(series: list[dict[str, Any]], raw_context: dict[str, Any]) -> int:
    for row in series:
        parsed = _parse_date(row.get("label"))
        if parsed:
            return parsed.year

    filters = raw_context.get("filters") if isinstance(raw_context.get("filters"), dict) else {}
    for key in ("start", "end"):
        parsed = _parse_date(filters.get(key))
        if parsed:
            return parsed.year

    return datetime.utcnow().year


def _extract_question_dates(
    question: str,
    series: list[dict[str, Any]],
    raw_context: dict[str, Any],
) -> list[date]:
    reference_year = _infer_reference_year(series, raw_context)
    matches: list[date] = []

    for day_text, month_text in QUESTION_DAY_MONTH_PATTERN.findall(str(question or "")):
        month = MONTH_LOOKUP.get(month_text.lower())
        if not month:
            continue
        try:
            matches.append(date(reference_year, month, int(day_text)))
        except ValueError:
            continue

    deduped: list[date] = []
    seen: set[date] = set()
    for item in matches:
        if item in seen:
            continue
        seen.add(item)
        deduped.append(item)
    return deduped


def _normalize_rows(rows: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        label = row.get("label") or row.get("period") or row.get("date") or "unknown"
        normalized.append(
            {
                "label": str(label),
                "value": _to_float(row.get("value")),
            }
        )
    return normalized


def _sort_date_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    parsed_rows: list[tuple[date, dict[str, Any]]] = []
    unparsed_rows: list[dict[str, Any]] = []

    for row in rows:
        parsed = _parse_date(row.get("label"))
        if parsed:
            parsed_rows.append((parsed, row))
        else:
            unparsed_rows.append(row)

    parsed_rows.sort(key=lambda item: item[0])
    return [row for _, row in parsed_rows] + unparsed_rows


def _pct_change(first: float, last: float) -> float:
    if first == 0:
        return 0.0
    return ((last - first) / first) * 100.0


def _extract_metric_series(raw_data: list[dict[str, Any]], raw_context: dict[str, Any], metric: str) -> list[dict[str, Any]]:
    points = extract_series_points(raw_data or [], metric)
    if not points:
        dashboard = raw_context.get("dashboardData") if isinstance(raw_context.get("dashboardData"), dict) else {}
        if metric == "revenue":
            points = extract_series_points(dashboard.get("revenueSeries") or dashboard.get("ordersSeries") or [], metric)
        elif metric == "orders":
            points = extract_series_points(dashboard.get("ordersSeries") or dashboard.get("revenueSeries") or [], metric)

    series = [
        {"label": str(point.get("period", "unknown")), "value": _to_float(point.get("value"))}
        for point in points
    ]
    return _sort_date_rows(series)


def _rows_from_context(intent: AskAIIntent, raw_context: dict[str, Any]) -> list[dict[str, Any]]:
    if intent.group_by == "category":
        source = raw_context.get("topCategories") if isinstance(raw_context.get("topCategories"), list) else []
        rows = []
        for item in source[: get_settings().copilot_group_limit]:
            if not isinstance(item, dict):
                continue
            label = item.get("category") or item.get("label")
            value = item.get("revenue") if intent.metric == "revenue" else item.get("orders")
            if label is None or value is None:
                continue
            rows.append({"label": str(label), "value": _to_float(value)})
        return rows

    if intent.group_by == "region":
        source = raw_context.get("topRegions") if isinstance(raw_context.get("topRegions"), list) else []
        rows = []
        for item in source[: get_settings().copilot_group_limit]:
            if not isinstance(item, dict):
                continue
            label = item.get("region") or item.get("label")
            value = item.get("revenue") if intent.metric == "revenue" else item.get("orders")
            if label is None or value is None:
                continue
            rows.append({"label": str(label), "value": _to_float(value)})
        return rows

    summary = raw_context.get("summary") if isinstance(raw_context.get("summary"), dict) else {}
    if intent.group_by == "none":
        value = summary.get("totalRevenue") if intent.metric == "revenue" else summary.get("totalOrders")
        if value is not None:
            return [{"label": "total", "value": _to_float(value)}]

    return []


def _rows_from_raw_data(intent: AskAIIntent, raw_data: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if intent.group_by == "date":
        return _extract_metric_series(raw_data, {}, intent.metric)

    if intent.group_by not in {"category", "region"}:
        return []

    buckets: dict[str, list[float]] = defaultdict(list)
    for row in raw_data or []:
        if not isinstance(row, dict):
            continue

        label = row.get(intent.group_by)
        if label is None:
            continue

        if intent.metric == "orders":
            value = row.get("orders") or row.get("currentOrders") or row.get("totalOrders") or row.get("value")
        else:
            value = row.get("revenue") or row.get("currentRevenue") or row.get("totalRevenue") or row.get("value")

        if value is None:
            continue
        buckets[str(label)].append(_to_float(value))

    rows: list[dict[str, Any]] = []
    for label, values in buckets.items():
        if intent.aggregation == "avg":
            aggregated = sum(values) / len(values)
        elif intent.metric == "orders" or intent.aggregation == "count":
            aggregated = sum(values) if any(value > 1 for value in values) else float(len(values))
        else:
            aggregated = sum(values)
        rows.append({"label": label, "value": float(aggregated)})

    return rows


def _effective_rows(intent: AskAIIntent, execution_rows: list[dict[str, Any]], raw_data: list[dict[str, Any]], raw_context: dict[str, Any]) -> list[dict[str, Any]]:
    if execution_rows:
        return _normalize_rows(execution_rows)
    rows = _rows_from_raw_data(intent, raw_data)
    if rows:
        return rows[: get_settings().copilot_group_limit]
    return _rows_from_context(intent, raw_context)[: get_settings().copilot_group_limit]


def _series_analysis(series: list[dict[str, Any]], metric: str) -> dict[str, Any]:
    if not series:
        return {
            "series": [],
            "start": None,
            "latest": None,
            "change_pct": 0.0,
            "peak": None,
            "trough": None,
            "max_spike": None,
            "max_drop": None,
            "volatility": "unknown",
        }

    values = [_to_float(item.get("value")) for item in series]
    start = series[0]
    latest = series[-1]
    peak = max(series, key=lambda item: _to_float(item.get("value")))
    trough = min(series, key=lambda item: _to_float(item.get("value")))
    change_pct = _pct_change(_to_float(start.get("value")), _to_float(latest.get("value")))

    max_spike = None
    max_drop = None
    for index in range(1, len(series)):
        prev = series[index - 1]
        current = series[index]
        prev_value = _to_float(prev.get("value"))
        current_value = _to_float(current.get("value"))
        if prev_value == 0:
            continue
        step_pct = ((current_value - prev_value) / prev_value) * 100.0
        payload = {
            "from": prev.get("label"),
            "to": current.get("label"),
            "percent": step_pct,
            "delta": current_value - prev_value,
        }
        if max_spike is None or step_pct > max_spike["percent"]:
            max_spike = payload
        if max_drop is None or step_pct < max_drop["percent"]:
            max_drop = payload

    volatility = "stable"
    if len(values) >= 2:
        avg = mean(values)
        deviation = pstdev(values)
        if avg and deviation / avg >= 0.18:
            volatility = "volatile"

    return {
        "series": series,
        "start": start,
        "latest": latest,
        "change_pct": change_pct,
        "peak": peak,
        "trough": trough,
        "max_spike": max_spike,
        "max_drop": max_drop,
        "volatility": volatility,
    }


def _build_aov_series(
    revenue_series: list[dict[str, Any]],
    orders_series: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    length = min(len(revenue_series), len(orders_series))
    aov: list[dict[str, Any]] = []

    for index in range(length):
        orders_value = _to_float(orders_series[index].get("value"))
        revenue_value = _to_float(revenue_series[index].get("value"))
        aov.append(
            {
                "label": revenue_series[index].get("label"),
                "value": (revenue_value / orders_value) if orders_value else 0.0,
            }
        )

    return aov


def _series_row_index(
    series: list[dict[str, Any]],
    target_date: date | None = None,
    target_label: str | None = None,
) -> int | None:
    for index, row in enumerate(series):
        if target_date and _parse_date(row.get("label")) == target_date:
            return index
        if target_label and str(row.get("label")) == str(target_label):
            return index
    return None


def _step_payload(previous_row: dict[str, Any] | None, current_row: dict[str, Any] | None) -> dict[str, Any] | None:
    if not previous_row or not current_row:
        return None

    previous_value = _to_float(previous_row.get("value"))
    current_value = _to_float(current_row.get("value"))
    percent = ((current_value - previous_value) / previous_value) * 100.0 if previous_value else 0.0

    return {
        "from": previous_row.get("label"),
        "to": current_row.get("label"),
        "from_value": previous_value,
        "to_value": current_value,
        "delta": current_value - previous_value,
        "percent": percent,
    }


def _question_assumption(question: str) -> str:
    text = str(question or "").lower()
    if any(token in text for token in ["drop", "dip", "decline", "fell", "fall"]):
        return "drop"
    if any(token in text for token in ["spike", "rise", "grew", "growth", "increase", "jump", "peak"]):
        return "rise"
    if any(token in text for token in ["recover", "rebound", "bounce back"]):
        return "recovery"
    return ""


def _build_event_context(
    question: str,
    series_analysis: dict[str, Any],
    raw_context: dict[str, Any],
    metric: str,
) -> dict[str, Any]:
    series = series_analysis.get("series") or []
    if not series:
        return {}

    question_lower = str(question or "").lower()
    question_dates = _extract_question_dates(question, series, raw_context)
    assumption = _question_assumption(question_lower)

    target_index: int | None = None
    target_mode = "derived"

    for target_date in question_dates:
        target_index = _series_row_index(series, target_date=target_date)
        if target_index is not None:
            target_mode = "referenced_date"
            break

    if target_index is None:
        biggest_drop = any(token in question_lower for token in ["biggest drop", "largest drop", "biggest dip", "largest dip"])
        biggest_rise = any(token in question_lower for token in ["biggest rise", "largest rise", "biggest spike", "largest spike", "peak"])
        if biggest_drop and series_analysis.get("max_drop"):
            target_index = _series_row_index(series, target_label=series_analysis["max_drop"].get("to"))
            target_mode = "max_drop"
        elif biggest_rise and series_analysis.get("max_spike"):
            target_index = _series_row_index(series, target_label=series_analysis["max_spike"].get("to"))
            target_mode = "max_spike"
        elif assumption == "drop" and series_analysis.get("max_drop"):
            target_index = _series_row_index(series, target_label=series_analysis["max_drop"].get("to"))
            target_mode = "max_drop"
        elif assumption in {"rise", "recovery"} and series_analysis.get("max_spike"):
            target_index = _series_row_index(series, target_label=series_analysis["max_spike"].get("to"))
            target_mode = "max_spike"
        else:
            target_index = len(series) - 1

    current_row = series[target_index] if target_index is not None and 0 <= target_index < len(series) else None
    previous_row = series[target_index - 1] if target_index and target_index > 0 else None
    next_row = series[target_index + 1] if target_index is not None and target_index < len(series) - 1 else None
    incoming_step = _step_payload(previous_row, current_row)
    outgoing_step = _step_payload(current_row, next_row)
    peak = series_analysis.get("peak")
    trough = series_analysis.get("trough")

    premise_validation = ""
    if current_row and target_mode == "referenced_date":
        current_period = _format_period(current_row.get("label"))
        current_value = _format_metric_value(metric, _to_float(current_row.get("value")))
        if assumption == "drop" and incoming_step and incoming_step["percent"] >= 0:
            premise_validation = (
                f"{humanize_metric(metric).title()} did not drop on {current_period}; it reached {current_value}."
            )
            if peak and str(peak.get("label")) == str(current_row.get("label")):
                premise_validation = (
                    f"{humanize_metric(metric).title()} did not drop on {current_period}; it peaked at {current_value}."
                )
        elif assumption == "rise" and incoming_step and incoming_step["percent"] <= 0:
            premise_validation = (
                f"{humanize_metric(metric).title()} did not spike on {current_period}; it moved down to {current_value}."
            )
        elif assumption == "recovery" and outgoing_step and outgoing_step["percent"] <= 0:
            premise_validation = (
                f"{humanize_metric(metric).title()} did not recover on {current_period}; it was followed by another decline."
            )

    if not premise_validation and current_row and target_mode == "referenced_date":
        if trough and str(trough.get("label")) == str(current_row.get("label")):
            premise_validation = f"{_format_period(current_row.get('label'))} is the low point in the current view."
        elif peak and str(peak.get("label")) == str(current_row.get("label")):
            premise_validation = f"{_format_period(current_row.get('label'))} is the peak in the current view."

    return {
        "mode": target_mode,
        "assumption": assumption,
        "current_row": current_row,
        "previous_row": previous_row,
        "next_row": next_row,
        "incoming_step": incoming_step,
        "outgoing_step": outgoing_step,
        "premise_validation": premise_validation,
    }


def _event_driver_analysis(
    raw_data: list[dict[str, Any]],
    raw_context: dict[str, Any],
    event_context: dict[str, Any],
) -> dict[str, Any]:
    previous_row = event_context.get("previous_row")
    current_row = event_context.get("current_row")
    incoming_step = event_context.get("incoming_step")
    if not previous_row or not current_row or not incoming_step:
        return {
            "summary": "",
            "confidence_level": "low",
            "evidence": [],
            "dominant_driver": "",
            "orders_change": None,
            "aov_change": None,
        }

    revenue_series = _extract_metric_series(raw_data, raw_context, "revenue")
    orders_series = _extract_metric_series(raw_data, raw_context, "orders")
    if not revenue_series or not orders_series:
        return {
            "summary": "",
            "confidence_level": "low",
            "evidence": [],
            "dominant_driver": "",
            "orders_change": None,
            "aov_change": None,
        }

    aov_series = _build_aov_series(revenue_series, orders_series)
    from_label = previous_row.get("label")
    to_label = current_row.get("label")
    orders_to_index = _series_row_index(orders_series, target_label=to_label)
    orders_from_index = _series_row_index(orders_series, target_label=from_label)
    aov_to_index = _series_row_index(aov_series, target_label=to_label)
    aov_from_index = _series_row_index(aov_series, target_label=from_label)
    revenue_to_index = _series_row_index(revenue_series, target_label=to_label)
    revenue_from_index = _series_row_index(revenue_series, target_label=from_label)

    order_step = _step_payload(
        orders_series[orders_from_index] if orders_from_index is not None else None,
        orders_series[orders_to_index] if orders_to_index is not None else None,
    )
    aov_step = _step_payload(
        aov_series[aov_from_index] if aov_from_index is not None else None,
        aov_series[aov_to_index] if aov_to_index is not None else None,
    )
    revenue_step = _step_payload(
        revenue_series[revenue_from_index] if revenue_from_index is not None else None,
        revenue_series[revenue_to_index] if revenue_to_index is not None else None,
    )

    if not order_step or not aov_step or not revenue_step:
        return {
            "summary": "",
            "confidence_level": "low",
            "evidence": [],
            "dominant_driver": "",
            "orders_change": None,
            "aov_change": None,
        }

    dominant_driver = "orders" if abs(order_step["percent"]) >= abs(aov_step["percent"]) else "AOV"
    gap = abs(abs(order_step["percent"]) - abs(aov_step["percent"]))
    confidence_level = "high" if gap >= 15 else "medium" if gap >= 5 else "low"
    direction = "drop" if revenue_step["percent"] < 0 else "rise"

    if dominant_driver == "orders":
        summary = (
            f"{humanize_metric('revenue').title()} looks primarily volume-driven here: orders moved {order_step['percent']:.2f}% "
            f"from {_format_period(from_label)} to {_format_period(to_label)}, versus AOV {aov_step['percent']:.2f}%."
        )
    else:
        summary = (
            f"{humanize_metric('revenue').title()} looks primarily ticket-size driven here: AOV moved {aov_step['percent']:.2f}% "
            f"from {_format_period(from_label)} to {_format_period(to_label)}, versus orders {order_step['percent']:.2f}%."
        )

    if direction == "drop" and event_context.get("outgoing_step") and event_context["outgoing_step"]["percent"] > 20:
        summary += " The immediate rebound afterward suggests a short-lived disruption rather than a sustained decline."

    evidence = [
        f"{_format_period(from_label)} to {_format_period(to_label)}: revenue {revenue_step['percent']:.2f}%.",
        f"{_format_period(from_label)} to {_format_period(to_label)}: orders {order_step['percent']:.2f}%.",
        f"{_format_period(from_label)} to {_format_period(to_label)}: AOV {aov_step['percent']:.2f}%.",
    ]

    return {
        "summary": summary,
        "confidence_level": confidence_level,
        "evidence": evidence,
        "dominant_driver": dominant_driver,
        "orders_change": order_step["percent"],
        "aov_change": aov_step["percent"],
        "revenue_change": revenue_step["percent"],
    }


def _contextual_actions(
    intent: AskAIIntent,
    event_context: dict[str, Any],
    driver_event: dict[str, Any],
) -> list[str]:
    current_row = event_context.get("current_row")
    target_period = _format_period(current_row.get("label")) if current_row else "this move"
    dominant_driver = driver_event.get("dominant_driver")

    if intent.query_type == "diagnostic":
        actions = [
            f"Break down {target_period} by category to isolate the weakest segment.",
            f"Compare {target_period} against the surrounding dates to confirm whether this was a one-off break.",
        ]
        if dominant_driver:
            actions.append(
                f"Check the {dominant_driver} shift on {target_period} to confirm it was the dominant driver."
            )
        return actions[:3]

    if intent.query_type == "comparison" and dominant_driver:
        return [
            f"Break down the {dominant_driver} move by category to see where it was strongest.",
            f"Compare the {dominant_driver} mix across regions before scaling action.",
            "Repeat the same driver check for the previous window to confirm it is persistent.",
        ]

    if intent.query_type == "recommendation":
        return [
            f"Protect the conditions behind the strongest day before trying to scale {humanize_metric(intent.metric)} further.",
            "Compare the peak window with the weakest window to isolate what changed materially.",
            "Prioritize the segment with the clearest contribution gap before broad rollout.",
        ]

    return []


def _contextual_follow_ups(
    intent: AskAIIntent,
    event_context: dict[str, Any],
    driver_event: dict[str, Any],
) -> list[str]:
    current_row = event_context.get("current_row")
    target_period = _format_period(current_row.get("label")) if current_row else "this move"
    dominant_driver = driver_event.get("dominant_driver")

    if intent.query_type == "diagnostic":
        follow_ups = [
            f"Do you want to break down the {target_period} move by category?",
            f"Should I compare {target_period} against the surrounding dates?",
        ]
        if dominant_driver:
            follow_ups.append(
                f"Do you want to see whether orders or AOV drove the {target_period} move?"
            )
        return follow_ups[:3]

    if intent.query_type == "comparison" and dominant_driver:
        return [
            f"Do you want the {dominant_driver} comparison by category or region?",
            "Should I run the same driver check for the previous window?",
            "Do you want the exact daily deltas for orders and AOV next?",
        ]

    if intent.query_type == "pattern":
        return [
            f"Do you want to break down the biggest break in this pattern by category?",
            "Should I compare this pattern with orders next?",
            "Do you want the same pattern check for the previous window?",
        ]

    if intent.query_type == "recommendation":
        return [
            "Do you want the top actions ranked by likely impact?",
            "Should I break the strongest and weakest dates down by category?",
            "Do you want to check whether orders or AOV is the faster lever to improve?",
        ]

    return []


def _ai_summary_line(
    intent: AskAIIntent,
    primary: str,
    premise_validation: str,
    likely_cause: str,
    series_analysis: dict[str, Any],
    driver_event: dict[str, Any],
) -> str:
    metric_label = humanize_metric(intent.metric).title()
    if premise_validation:
        return premise_validation

    if intent.query_type == "diagnostic" and likely_cause:
        return likely_cause.split(" Confidence:")[0].strip()

    if intent.query_type == "comparison" and driver_event.get("dominant_driver"):
        return (
            f"{metric_label} is moving more with {driver_event['dominant_driver']} than with the alternative driver in this view."
        )

    if intent.query_type == "pattern" and series_analysis.get("start") and series_analysis.get("latest"):
        return (
            f"{metric_label} moved {series_analysis['change_pct']:.2f}% overall, but the path was {series_analysis['volatility']} rather than smooth."
        )

    if intent.query_type == "recommendation":
        return "The next move should focus on protecting the strongest day while reducing exposure to the weakest one."

    start = series_analysis.get("start")
    latest = series_analysis.get("latest")
    if start and latest:
        return (
            f"{metric_label} moved from {_format_metric_value(intent.metric, _to_float(start.get('value')))} on {_format_period(start.get('label'))} "
            f"to {_format_metric_value(intent.metric, _to_float(latest.get('value')))} on {_format_period(latest.get('label'))}."
        )

    return primary


def _driver_analysis(raw_data: list[dict[str, Any]], raw_context: dict[str, Any]) -> dict[str, Any]:
    revenue = _extract_metric_series(raw_data, raw_context, "revenue")
    orders = _extract_metric_series(raw_data, raw_context, "orders")

    if not revenue or not orders:
        return {
            "signals": [],
            "dominant_driver": "",
        }

    length = min(len(revenue), len(orders))
    aov: list[dict[str, Any]] = []
    for index in range(length):
        orders_value = _to_float(orders[index].get("value"))
        revenue_value = _to_float(revenue[index].get("value"))
        aov.append(
            {
                "label": revenue[index].get("label"),
                "value": (revenue_value / orders_value) if orders_value else 0.0,
            }
        )

    revenue_change = _pct_change(_to_float(revenue[0].get("value")), _to_float(revenue[-1].get("value"))) if len(revenue) >= 2 else 0.0
    orders_change = _pct_change(_to_float(orders[0].get("value")), _to_float(orders[-1].get("value"))) if len(orders) >= 2 else 0.0
    aov_change = _pct_change(_to_float(aov[0].get("value")), _to_float(aov[-1].get("value"))) if len(aov) >= 2 else 0.0
    dominant_driver = "order volume" if abs(orders_change) >= abs(aov_change) else "average order value"

    signals = [
        f"Revenue changed {revenue_change:.2f}% over the observed window.",
        f"Orders changed {orders_change:.2f}% over the observed window.",
        f"AOV changed {aov_change:.2f}% over the observed window.",
    ]

    return {
        "signals": signals,
        "dominant_driver": dominant_driver,
        "orders_change": orders_change,
        "aov_change": aov_change,
        "revenue_change": revenue_change,
    }


def _top_gap(rows: list[dict[str, Any]], metric: str) -> tuple[str, list[str], list[str]]:
    if not rows:
        return "", [], []

    sorted_rows = sorted(rows, key=lambda item: _to_float(item.get("value")), reverse=True)
    leader = sorted_rows[0]
    primary = f"{leader['label']} leads {humanize_metric(metric)} at {_format_metric_value(metric, leader['value'])}."
    prioritized = [primary]
    comparisons: list[str] = []

    if len(sorted_rows) > 1:
        runner_up = sorted_rows[1]
        gap = _to_float(leader.get("value")) - _to_float(runner_up.get("value"))
        comparisons.append(
            f"{leader['label']} exceeds {runner_up['label']} by {_format_metric_value(metric, gap)}."
        )
        prioritized.append(
            f"{runner_up['label']} is next at {_format_metric_value(metric, runner_up['value'])}."
        )

    if len(sorted_rows) > 2:
        bottom = sorted_rows[-1]
        prioritized.append(
            f"{bottom['label']} is the weakest segment at {_format_metric_value(metric, bottom['value'])}."
        )

    return primary, prioritized, comparisons


def _recommendation_basis(series_analysis: dict[str, Any], metric: str) -> list[str]:
    basis: list[str] = []
    peak = series_analysis.get("peak")
    trough = series_analysis.get("trough")
    if peak:
        basis.append(
            f"Peak {humanize_metric(metric)} was {_format_metric_value(metric, _to_float(peak.get('value')))} on {_format_period(peak.get('label'))}."
        )
    if trough and trough != peak:
        basis.append(
            f"Lowest {humanize_metric(metric)} was {_format_metric_value(metric, _to_float(trough.get('value')))} on {_format_period(trough.get('label'))}."
        )
    max_drop = series_analysis.get("max_drop")
    if max_drop:
        basis.append(
            f"The sharpest drop was {abs(max_drop['percent']):.2f}% from {_format_period(max_drop['from'])} to {_format_period(max_drop['to'])}."
        )
    return basis


def _baseline_summary(intent: AskAIIntent, rows: list[dict[str, Any]], series_analysis: dict[str, Any]) -> list[str]:
    metric_label = humanize_metric(intent.metric)
    summary: list[str] = []
    if rows and intent.group_by == "none":
        summary.append(
            f"Observed {metric_label} total is {_format_metric_value(intent.metric, _to_float(rows[0].get('value')))}."
        )
    if series_analysis.get("latest") and series_analysis.get("start"):
        latest = series_analysis["latest"]
        start = series_analysis["start"]
        summary.append(
            f"Latest {metric_label} is {_format_metric_value(intent.metric, _to_float(latest.get('value')))} on {_format_period(latest.get('label'))}."
        )
        summary.append(
            f"Window change versus {_format_period(start.get('label'))} is {series_analysis['change_pct']:.2f}%."
        )
    return summary


def _aggregation_pack(intent: AskAIIntent, rows: list[dict[str, Any]], series_analysis: dict[str, Any]) -> dict[str, Any]:
    metric_label = humanize_metric(intent.metric)
    if not rows:
        return {
            "primary_insight": f"I do not have enough {metric_label} data in the current context to answer this directly.",
            "prioritized_insights": [],
            "evidence_rows": [f"Missing usable {metric_label} rows for the selected view."],
            "comparisons": [],
            "anomalies": [],
            "recommendation_basis": [],
        }

    if intent.group_by in {"category", "region"}:
        primary, prioritized, comparisons = _top_gap(rows, intent.metric)
        return {
            "primary_insight": primary,
            "prioritized_insights": prioritized,
            "evidence_rows": prioritized[:2],
            "comparisons": comparisons,
            "anomalies": [],
            "recommendation_basis": [],
        }

    if intent.group_by == "date" and series_analysis.get("latest"):
        latest = series_analysis["latest"]
        start = series_analysis["start"]
        primary = (
            f"{metric_label.title()} closed at {_format_metric_value(intent.metric, _to_float(latest.get('value')))} on "
            f"{_format_period(latest.get('label'))}, {series_analysis['change_pct']:.2f}% versus {_format_period(start.get('label'))}."
        )
        return {
            "primary_insight": primary,
            "prioritized_insights": [
                primary,
                f"Peak was {_format_metric_value(intent.metric, _to_float(series_analysis['peak'].get('value')))} on {_format_period(series_analysis['peak'].get('label'))}.",
            ],
            "evidence_rows": _baseline_summary(intent, rows, series_analysis),
            "comparisons": [],
            "anomalies": [],
            "recommendation_basis": [],
        }

    total_row = rows[0]
    primary = f"Total {metric_label} in the selected view is {_format_metric_value(intent.metric, _to_float(total_row.get('value')))}."
    return {
        "primary_insight": primary,
        "prioritized_insights": [primary],
        "evidence_rows": _baseline_summary(intent, rows, series_analysis),
        "comparisons": [],
        "anomalies": [],
        "recommendation_basis": [],
    }


def _comparison_pack(
    intent: AskAIIntent,
    question: str,
    rows: list[dict[str, Any]],
    series_analysis: dict[str, Any],
    driver_analysis: dict[str, Any],
    driver_event: dict[str, Any],
) -> dict[str, Any]:
    text = str(question or "").lower()
    metric_label = humanize_metric(intent.metric)

    if any(token in text for token in ["aov", "average order value", "order volume", "orders"]) and driver_analysis.get("dominant_driver"):
        driver_orders_change = driver_event.get("orders_change")
        driver_aov_change = driver_event.get("aov_change")
        driver_revenue_change = driver_event.get("revenue_change")
        if driver_orders_change is None:
            driver_orders_change = driver_analysis.get("orders_change", 0.0)
        if driver_aov_change is None:
            driver_aov_change = driver_analysis.get("aov_change", 0.0)
        if driver_revenue_change is None:
            driver_revenue_change = driver_analysis.get("revenue_change", 0.0)
        primary = (
            f"Revenue change is primarily driven by {driver_analysis['dominant_driver']}: orders changed {driver_orders_change:.2f}% "
            f"versus AOV {driver_aov_change:.2f}%."
        )
        return {
            "primary_insight": primary,
            "prioritized_insights": [primary] + driver_event.get("evidence", [])[:2],
            "evidence_rows": driver_event.get("evidence", []) or driver_analysis.get("signals", []),
            "comparisons": [
                f"Revenue changed {driver_revenue_change:.2f}% over the same window."
            ],
            "anomalies": [],
            "recommendation_basis": [],
        }

    if intent.group_by in {"category", "region"} and len(rows) >= 2:
        primary, prioritized, comparisons = _top_gap(rows, intent.metric)
        return {
            "primary_insight": primary,
            "prioritized_insights": prioritized,
            "evidence_rows": prioritized[:2],
            "comparisons": comparisons,
            "anomalies": [],
            "recommendation_basis": [],
        }

    latest = series_analysis.get("latest")
    start = series_analysis.get("start")
    if latest and start:
        delta = _to_float(latest.get("value")) - _to_float(start.get("value"))
        primary = (
            f"{metric_label.title()} moved from {_format_metric_value(intent.metric, _to_float(start.get('value')))} on {_format_period(start.get('label'))} "
            f"to {_format_metric_value(intent.metric, _to_float(latest.get('value')))} on {_format_period(latest.get('label'))}, "
            f"a delta of {_format_metric_value(intent.metric, delta)} ({series_analysis['change_pct']:.2f}%)."
        )
        return {
            "primary_insight": primary,
            "prioritized_insights": [primary],
            "evidence_rows": _baseline_summary(intent, rows, series_analysis),
            "comparisons": [
                f"Peak {metric_label} was {_format_metric_value(intent.metric, _to_float(series_analysis['peak'].get('value')))} on {_format_period(series_analysis['peak'].get('label'))}.",
                f"Lowest {metric_label} was {_format_metric_value(intent.metric, _to_float(series_analysis['trough'].get('value')))} on {_format_period(series_analysis['trough'].get('label'))}.",
            ],
            "anomalies": [],
            "recommendation_basis": [],
        }

    return _aggregation_pack(intent, rows, series_analysis)


def _diagnostic_pack(
    intent: AskAIIntent,
    question: str,
    rows: list[dict[str, Any]],
    series_analysis: dict[str, Any],
    driver_analysis: dict[str, Any],
    event_context: dict[str, Any],
    driver_event: dict[str, Any],
) -> dict[str, Any]:
    metric_label = humanize_metric(intent.metric)
    current_row = event_context.get("current_row")
    previous_row = event_context.get("previous_row")
    incoming_step = event_context.get("incoming_step")
    outgoing_step = event_context.get("outgoing_step")
    premise_validation = event_context.get("premise_validation", "")

    if not current_row:
        return _pattern_pack(intent, rows, series_analysis)

    primary_parts: list[str] = []
    if premise_validation:
        primary_parts.append(premise_validation)

    if incoming_step:
        movement = "drop" if incoming_step["percent"] < 0 else "rise"
        primary_parts.append(
            f"The strongest confirmed {movement} was {abs(incoming_step['percent']):.2f}% from {_format_period(incoming_step['from'])} "
            f"to {_format_period(incoming_step['to'])}, ending at {_format_metric_value(intent.metric, incoming_step['to_value'])}."
        )

    if outgoing_step and outgoing_step["percent"] > 15:
        primary_parts.append(
            f"It was followed by a {outgoing_step['percent']:.2f}% rebound into {_format_period(outgoing_step['to'])}."
        )

    primary = " ".join(primary_parts).strip()
    if not primary:
        primary = (
            f"{metric_label.title()} reached {_format_metric_value(intent.metric, _to_float(current_row.get('value')))} "
            f"on {_format_period(current_row.get('label'))}."
        )

    evidence = []
    if previous_row and incoming_step:
        evidence.append(
            f"{_format_period(previous_row.get('label'))}: {_format_metric_value(intent.metric, _to_float(previous_row.get('value')))}."
        )
        evidence.append(
            f"{_format_period(current_row.get('label'))}: {_format_metric_value(intent.metric, _to_float(current_row.get('value')))} ({incoming_step['percent']:.2f}%)."
        )
    if driver_event.get("evidence"):
        evidence.extend(driver_event["evidence"][:2])
    elif driver_analysis.get("signals"):
        evidence.extend(driver_analysis["signals"][:2])

    prioritized = [primary]
    if driver_event.get("summary"):
        prioritized.append(driver_event["summary"])

    return {
        "primary_insight": primary,
        "prioritized_insights": prioritized[:3],
        "evidence_rows": evidence[:4] or _baseline_summary(intent, rows, series_analysis),
        "comparisons": [],
        "anomalies": [item for item in [premise_validation, driver_event.get("summary")] if item],
        "recommendation_basis": _recommendation_basis(series_analysis, intent.metric),
    }


def _pattern_pack(intent: AskAIIntent, rows: list[dict[str, Any]], series_analysis: dict[str, Any]) -> dict[str, Any]:
    metric_label = humanize_metric(intent.metric)
    latest = series_analysis.get("latest")
    start = series_analysis.get("start")
    if not latest or not start:
        return _aggregation_pack(intent, rows, series_analysis)

    direction = "upward"
    if series_analysis["change_pct"] < -3:
        direction = "downward"
    elif abs(series_analysis["change_pct"]) <= 3:
        direction = "flat"

    primary = (
        f"{metric_label.title()} shows a {direction} pattern with {series_analysis['volatility']} movement: "
        f"{_format_metric_value(intent.metric, _to_float(start.get('value')))} on {_format_period(start.get('label'))} to "
        f"{_format_metric_value(intent.metric, _to_float(latest.get('value')))} on {_format_period(latest.get('label'))}."
    )
    prioritized = [
        primary,
        f"Peak was {_format_metric_value(intent.metric, _to_float(series_analysis['peak'].get('value')))} on {_format_period(series_analysis['peak'].get('label'))}.",
        f"Low point was {_format_metric_value(intent.metric, _to_float(series_analysis['trough'].get('value')))} on {_format_period(series_analysis['trough'].get('label'))}.",
    ]
    anomalies = []
    if series_analysis.get("max_drop"):
        anomalies.append(
            f"Largest drop was {abs(series_analysis['max_drop']['percent']):.2f}% into {_format_period(series_analysis['max_drop']['to'])}."
        )
    if series_analysis.get("max_spike"):
        anomalies.append(
            f"Largest rise was {series_analysis['max_spike']['percent']:.2f}% into {_format_period(series_analysis['max_spike']['to'])}."
        )
    return {
        "primary_insight": primary,
        "prioritized_insights": prioritized,
        "evidence_rows": _baseline_summary(intent, rows, series_analysis),
        "comparisons": [],
        "anomalies": anomalies,
        "recommendation_basis": [],
    }


def _recommendation_pack(intent: AskAIIntent, rows: list[dict[str, Any]], series_analysis: dict[str, Any], driver_analysis: dict[str, Any]) -> dict[str, Any]:
    basis = _recommendation_basis(series_analysis, intent.metric)
    dominant_driver = driver_analysis.get("dominant_driver")
    primary = (
        f"The strongest next move is to protect the conditions behind the recent peak and stabilize the drop window around {_format_period(series_analysis['trough'].get('label'))}."
        if series_analysis.get("trough")
        else f"The strongest next move is to protect the highest-performing {humanize_metric(intent.metric)} driver in the current window."
    )
    prioritized = [primary]
    if dominant_driver:
        prioritized.append(
            f"Prioritize the {dominant_driver} lever because it moved more sharply than the alternative driver."
        )
    prioritized.extend(basis[:2])
    return {
        "primary_insight": primary,
        "prioritized_insights": prioritized,
        "evidence_rows": _baseline_summary(intent, rows, series_analysis),
        "comparisons": [],
        "anomalies": [],
        "recommendation_basis": basis or driver_analysis.get("signals", []),
    }


def _greeting_pack(raw_context: dict[str, Any]) -> dict[str, Any]:
    summary = raw_context.get("summary") if isinstance(raw_context.get("summary"), dict) else {}
    total_revenue = summary.get("totalRevenue")
    total_orders = summary.get("totalOrders")
    evidence = []
    if total_revenue is not None:
        evidence.append(f"Current dashboard revenue is {_format_metric_value('revenue', _to_float(total_revenue))}.")
    if total_orders is not None:
        evidence.append(f"Current dashboard orders are {_format_metric_value('orders', _to_float(total_orders))}.")

    return {
        "primary_insight": "I can help analyze the current dashboard and answer focused questions about revenue, orders, drivers, trends, and actions.",
        "ai_summary": "I can help explain what changed in this dashboard and what to do next.",
        "prioritized_insights": [
            "Try asking why a spike or dip happened on a specific date.",
            "You can also ask for a comparison, a pattern readout, or an action recommendation.",
        ],
        "evidence_rows": evidence,
        "comparisons": [],
        "anomalies": [],
        "recommendation_basis": [],
        "follow_up_options": [
            "Why did revenue spike on the strongest day?",
            "How does this week compare with the previous one?",
            "What action should we take next?",
        ],
    }


def _out_of_domain_pack() -> dict[str, Any]:
    return {
        "primary_insight": "I can help with analytics questions about this dashboard, but I cannot answer unrelated general-purpose requests from this copilot surface.",
        "ai_summary": "This copilot is tuned for dashboard analysis rather than general-purpose questions.",
        "prioritized_insights": [
            "Try asking about revenue, orders, trends, comparisons, anomalies, or recommended actions.",
        ],
        "evidence_rows": [],
        "comparisons": [],
        "anomalies": [],
        "recommendation_basis": [],
        "follow_up_options": [
            "Why did revenue change on a specific date?",
            "Compare this period with the previous one.",
            "What actions would improve performance next?",
        ],
    }


def _ranked_summary(pack: dict[str, Any]) -> list[str]:
    summary: list[str] = []
    for key in [
        "premise_validation",
        "ai_summary",
        "likely_cause",
        "primary_insight",
        "prioritized_insights",
        "evidence_rows",
        "comparisons",
        "anomalies",
        "recommendation_basis",
    ]:
        value = pack.get(key)
        if isinstance(value, str) and value:
            summary.append(value)
        elif isinstance(value, list):
            summary.extend([item for item in value if item])
        if len(summary) >= 8:
            break
    return summary[:8]


def _build_artifacts(intent: AskAIIntent, rows: list[dict[str, Any]]) -> dict[str, Any]:
    if len(rows) < 2:
        return {}

    should_chart = intent.answer_plan.needs_visuals or intent.query_type in {"pattern", "comparison"}
    if not should_chart:
        return {}

    chart_type = intent.chart_type if intent.chart_type != "none" else "line" if intent.group_by == "date" else "bar"
    title = (
        f"{humanize_metric(intent.metric).title()} trend"
        if intent.group_by == "date"
        else f"{humanize_metric(intent.metric).title()} by {intent.group_by}"
    )
    return {
        "chart": {
            "chartType": chart_type,
            "title": title,
            "data": rows[: get_settings().copilot_group_limit],
        },
        "table": {
            "columns": ["label", "value"],
            "rows": [[str(row.get("label")), float(row.get("value", 0))] for row in rows[: get_settings().copilot_group_limit]],
        },
    }


def build_insight_pack(
    question: str,
    intent: AskAIIntent,
    execution_rows: list[dict[str, Any]],
    raw_data: list[dict[str, Any]] | None = None,
    raw_context: dict[str, Any] | None = None,
    data_source: str = "dashboard_context",
) -> dict[str, Any]:
    raw_data = raw_data or []
    raw_context = raw_context or {}

    if intent.query_type == "conversational_greeting":
        pack = _greeting_pack(raw_context)
        rows: list[dict[str, Any]] = []
        source = "minimal_context"
    elif intent.query_type == "out_of_domain":
        pack = _out_of_domain_pack()
        rows = []
        source = "minimal_context"
    else:
        rows = _effective_rows(intent, execution_rows, raw_data, raw_context)
        series = _extract_metric_series(raw_data, raw_context, intent.metric)
        if intent.group_by == "date" and rows:
            series = _sort_date_rows(rows)
        series_analysis = _series_analysis(series or rows, intent.metric)
        driver_analysis = _driver_analysis(raw_data, raw_context)
        event_context = _build_event_context(question, series_analysis, raw_context, intent.metric)
        driver_event = _event_driver_analysis(raw_data, raw_context, event_context)

        if intent.query_type == "comparison":
            pack = _comparison_pack(
                intent,
                question,
                rows,
                series_analysis,
                driver_analysis,
                driver_event,
            )
        elif intent.query_type == "diagnostic":
            pack = _diagnostic_pack(
                intent,
                question,
                rows,
                series_analysis,
                driver_analysis,
                event_context,
                driver_event,
            )
        elif intent.query_type == "pattern":
            pack = _pattern_pack(intent, rows, series_analysis)
        elif intent.query_type == "recommendation":
            pack = _recommendation_pack(intent, rows, series_analysis, driver_analysis)
        else:
            pack = _aggregation_pack(intent, rows, series_analysis)

        pack["premise_validation"] = event_context.get("premise_validation") or None
        pack["likely_cause"] = (
            driver_event.get("summary")
            if intent.query_type == "diagnostic"
            else None
        )
        pack["confidence_level"] = (
            driver_event.get("confidence_level")
            if intent.query_type == "diagnostic" and driver_event.get("summary")
            else None
        )
        pack["next_actions"] = _contextual_actions(intent, event_context, driver_event)
        pack["follow_up_options"] = _contextual_follow_ups(intent, event_context, driver_event)
        pack["ai_summary"] = _ai_summary_line(
            intent,
            pack.get("primary_insight", ""),
            pack.get("premise_validation") or "",
            pack.get("likely_cause") or "",
            series_analysis,
            driver_event,
        )
        pack["driver_signals"] = driver_analysis.get("signals", [])
        source = data_source

    pack["insight_summary"] = _ranked_summary(pack)
    artifacts = _build_artifacts(intent, rows)

    return {
        "rows": rows,
        "artifacts": artifacts,
        "data_source": source,
        "insight_pack": {
            "primary_insight": pack.get("primary_insight", ""),
            "prioritized_insights": pack.get("prioritized_insights", [])[:6],
            "premise_validation": pack.get("premise_validation"),
            "ai_summary": pack.get("ai_summary"),
            "likely_cause": pack.get("likely_cause"),
            "confidence_level": pack.get("confidence_level"),
            "insight_summary": pack.get("insight_summary", [])[:8],
            "evidence_rows": pack.get("evidence_rows", [])[:6],
            "driver_signals": pack.get("driver_signals", [])[:4],
            "anomalies": pack.get("anomalies", [])[:4],
            "comparisons": pack.get("comparisons", [])[:4],
            "recommendation_basis": pack.get("recommendation_basis", [])[:4],
            "next_actions": pack.get("next_actions", [])[:3],
            "follow_up_options": pack.get("follow_up_options", [])[:3],
        },
        "context_used": {
            "activeContext": raw_context.get("activeContext"),
            "filters": raw_context.get("filters") or {},
            "conversation_context": intent.conversation_context.model_dump(),
            "query_type": intent.query_type,
        },
    }

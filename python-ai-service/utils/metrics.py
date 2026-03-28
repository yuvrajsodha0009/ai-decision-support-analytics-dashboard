from __future__ import annotations

from collections import defaultdict
from statistics import mean, pstdev
from typing import Any

from utils.data_formatter import extract_series_points


def _to_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _pct_change(first: float, last: float) -> float:
    if first == 0:
        return 0.0
    return ((last - first) / first) * 100.0


def _trend_direction(first: float, last: float) -> str:
    pct = _pct_change(first, last)
    if pct > 3:
        return "up"
    if pct < -3:
        return "down"
    return "flat"


def _build_metric_series(data: list[dict[str, Any]] | None, metric: str) -> list[dict[str, Any]]:
    points = extract_series_points(data or [], metric)
    return [{"label": str(point.get("period", "")), "value": _to_float(point.get("value"))} for point in points]


def _build_category_shares(grouped_rows: list[dict[str, Any]]) -> dict[str, float]:
    total = sum(_to_float(item.get("value")) for item in grouped_rows)
    if total <= 0:
        return {}
    return {
        str(item.get("label", "unknown")): (_to_float(item.get("value")) / total) * 100.0
        for item in grouped_rows
    }


def _step_anomalies(series: list[dict[str, Any]]) -> dict[str, Any]:
    if len(series) < 2:
        return {
            "max_spike": None,
            "max_drop": None,
        }

    best_spike = {"from": None, "to": None, "percent": float("-inf")}
    best_drop = {"from": None, "to": None, "percent": float("inf")}

    for idx in range(1, len(series)):
        prev_value = _to_float(series[idx - 1].get("value"))
        curr_value = _to_float(series[idx].get("value"))
        if prev_value == 0:
            continue

        change_pct = ((curr_value - prev_value) / prev_value) * 100.0
        if change_pct > best_spike["percent"]:
            best_spike = {
                "from": series[idx - 1].get("label"),
                "to": series[idx].get("label"),
                "percent": change_pct,
            }
        if change_pct < best_drop["percent"]:
            best_drop = {
                "from": series[idx - 1].get("label"),
                "to": series[idx].get("label"),
                "percent": change_pct,
            }

    if best_spike["percent"] == float("-inf"):
        best_spike = None
    if best_drop["percent"] == float("inf"):
        best_drop = None

    return {
        "max_spike": best_spike,
        "max_drop": best_drop,
    }


def compute_derived_metrics(
    data: list[dict[str, Any]] | None,
    rows: list[dict[str, Any]] | None,
    raw_context: dict[str, Any] | None,
    metric: str,
) -> dict[str, Any]:
    raw_context = raw_context or {}
    rows = rows or []
    data = data or []

    dashboard_data = raw_context.get("dashboardData") if isinstance(raw_context.get("dashboardData"), dict) else {}

    metric_series = _build_metric_series(data, metric)
    if not metric_series and isinstance(dashboard_data, dict):
        if metric == "revenue":
            metric_series = _build_metric_series(dashboard_data.get("revenueSeries") or dashboard_data.get("ordersSeries"), "revenue")
        elif metric == "orders":
            metric_series = _build_metric_series(dashboard_data.get("ordersSeries") or dashboard_data.get("revenueSeries"), "orders")

    values = [_to_float(item.get("value")) for item in metric_series]
    first = values[0] if values else 0.0
    last = values[-1] if values else 0.0

    grouped_rows = rows if len(rows) > 1 else []
    if not grouped_rows:
        top_categories = raw_context.get("topCategories") if isinstance(raw_context.get("topCategories"), list) else []
        top_regions = raw_context.get("topRegions") if isinstance(raw_context.get("topRegions"), list) else []
        if top_categories:
            grouped_rows = [
                {"label": item.get("category") or item.get("label"), "value": _to_float(item.get("revenue") or item.get("orders") or item.get("value"))}
                for item in top_categories
                if isinstance(item, dict)
            ]
        elif top_regions:
            grouped_rows = [
                {"label": item.get("region") or item.get("label"), "value": _to_float(item.get("revenue") or item.get("orders") or item.get("value"))}
                for item in top_regions
                if isinstance(item, dict)
            ]

    shares = _build_category_shares(grouped_rows)
    top_label = None
    bottom_label = None
    if grouped_rows:
        ordered = sorted(grouped_rows, key=lambda item: _to_float(item.get("value")), reverse=True)
        top_label = ordered[0].get("label")
        bottom_label = ordered[-1].get("label")

    variance = 0.0
    std_dev = 0.0
    if len(values) >= 2:
        avg = mean(values)
        variance = sum((value - avg) ** 2 for value in values) / len(values)
        std_dev = pstdev(values)

    anomalies = _step_anomalies(metric_series)

    # Correlation inputs: revenue, orders, aov
    revenue_series = _build_metric_series(data, "revenue")
    orders_series = _build_metric_series(data, "orders")
    aov_series = _build_metric_series(data, "aov")

    if not aov_series and revenue_series and orders_series:
        length = min(len(revenue_series), len(orders_series))
        aov_series = []
        for idx in range(length):
            orders_value = _to_float(orders_series[idx].get("value"))
            revenue_value = _to_float(revenue_series[idx].get("value"))
            aov_series.append(
                {
                    "label": revenue_series[idx].get("label"),
                    "value": (revenue_value / orders_value) if orders_value else 0.0,
                }
            )

    def _series_change(series: list[dict[str, Any]]) -> float:
        if len(series) < 2:
            return 0.0
        first_val = _to_float(series[0].get("value"))
        last_val = _to_float(series[-1].get("value"))
        return _pct_change(first_val, last_val)

    return {
        "metric": metric,
        "series": metric_series,
        "trend": _trend_direction(first, last) if values else "flat",
        "trend_direction": _trend_direction(first, last) if values else "flat",
        "change_percent": _pct_change(first, last) if values else 0.0,
        "max": max(values) if values else 0.0,
        "min": min(values) if values else 0.0,
        "variance": variance,
        "std_dev": std_dev,
        "top_category": top_label,
        "bottom_category": bottom_label,
        "category_share": shares,
        "grouped_rows": grouped_rows,
        "anomalies": anomalies,
        "drivers": {
            "orders_change_pct": _series_change(orders_series),
            "aov_change_pct": _series_change(aov_series),
            "revenue_change_pct": _series_change(revenue_series),
        },
    }

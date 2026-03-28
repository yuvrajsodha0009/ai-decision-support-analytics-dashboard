from __future__ import annotations

from typing import Any


def _fmt_pct(value: float) -> str:
    return f"{value:+.1f}%"


def _top_share_text(category_share: dict[str, float]) -> str:
    if not category_share:
        return ""
    top = sorted(category_share.items(), key=lambda item: item[1], reverse=True)[0]
    return f"{top[0]} contributes {top[1]:.1f}% of total."


def _decision_signal(drivers: dict[str, float]) -> str:
    orders_change = float(drivers.get("orders_change_pct", 0.0))
    aov_change = float(drivers.get("aov_change_pct", 0.0))

    if orders_change > 2 and aov_change < -2:
        return "Revenue pressure is tied to weaker ticket size, not demand volume."
    if orders_change < -2 and aov_change > 2:
        return "Demand softness is the main risk even though ticket size improved."
    if orders_change < -2 and aov_change < -2:
        return "Both demand and ticket size are down, indicating broad weakness."
    if orders_change > 2 and aov_change > 2:
        return "Both demand and ticket size are improving, indicating healthy momentum."
    return "No strong mixed-signal pattern is visible in demand versus ticket size."


def reason_over_metrics(intent: str, metrics: dict[str, Any], metric_label: str) -> dict[str, str] | None:
    trend = metrics.get("trend_direction", "flat")
    change_pct = float(metrics.get("change_percent", 0.0))
    max_value = float(metrics.get("max", 0.0))
    min_value = float(metrics.get("min", 0.0))
    std_dev = float(metrics.get("std_dev", 0.0))
    grouped_rows = metrics.get("grouped_rows") or []
    anomalies = metrics.get("anomalies") or {}
    category_share = metrics.get("category_share") or {}
    top_category = metrics.get("top_category")
    bottom_category = metrics.get("bottom_category")
    drivers = metrics.get("drivers") or {}

    if intent == "trend":
        direction_word = "upward" if trend == "up" else "downward" if trend == "down" else "flat"
        insight = f"{metric_label} shows a {direction_word} trend at {_fmt_pct(change_pct)} over the selected period."
        supporting = f"Range is {min_value:,.2f} to {max_value:,.2f}."
        return {"insight": insight, "supporting": supporting}

    if intent == "comparison":
        if top_category and bottom_category:
            insight = f"Performance is concentrated: {top_category} leads while {bottom_category} trails on {metric_label}."
            supporting = _top_share_text(category_share) or "Category distribution indicates a visible spread between top and bottom segments."
            return {"insight": insight, "supporting": supporting}
        return {
            "insight": f"{metric_label} moved {_fmt_pct(change_pct)} versus the earliest visible point.",
            "supporting": f"Observed range is {min_value:,.2f} to {max_value:,.2f}.",
        }

    if intent == "distribution":
        if top_category:
            insight = f"{top_category} is the largest contributor to {metric_label}."
            supporting = _top_share_text(category_share) or "Contribution mix is skewed toward the top segment."
            return {"insight": insight, "supporting": supporting}
        return {
            "insight": f"{metric_label} distribution can be assessed from segment spread and concentration.",
            "supporting": "No strong category concentration was detected from available grouped rows.",
        }

    if intent == "anomaly":
        max_spike = anomalies.get("max_spike")
        max_drop = anomalies.get("max_drop")
        if max_spike and max_drop:
            insight = (
                f"Largest spike occurred from {max_spike.get('from')} to {max_spike.get('to')} at "
                f"{_fmt_pct(float(max_spike.get('percent', 0.0)))}."
            )
            supporting = (
                f"Largest drop occurred from {max_drop.get('from')} to {max_drop.get('to')} at "
                f"{_fmt_pct(float(max_drop.get('percent', 0.0)))}."
            )
            return {"insight": insight, "supporting": supporting}
        return {
            "insight": "No high-confidence anomaly was detected from step-to-step changes.",
            "supporting": f"Volatility baseline (std dev) is {std_dev:,.2f}.",
        }

    if intent == "volatility":
        insight = f"{metric_label} volatility is {'elevated' if std_dev > 0 and abs(change_pct) > 8 else 'moderate'} based on period-to-period spread."
        supporting = f"Standard deviation is {std_dev:,.2f} with total change {_fmt_pct(change_pct)}."
        return {"insight": insight, "supporting": supporting}

    if intent == "decision":
        insight = _decision_signal(drivers)
        supporting = (
            f"Orders {_fmt_pct(float(drivers.get('orders_change_pct', 0.0)))}, "
            f"AOV {_fmt_pct(float(drivers.get('aov_change_pct', 0.0)))}, "
            f"Revenue {_fmt_pct(float(drivers.get('revenue_change_pct', 0.0)))}."
        )
        return {"insight": insight, "supporting": supporting}

    if intent == "behavior":
        insight = f"Customer behavior signals are {'improving' if change_pct > 3 else 'weakening' if change_pct < -3 else 'stable'} based on {metric_label} trajectory."
        supporting = f"Net move is {_fmt_pct(change_pct)} with observed range {min_value:,.2f}-{max_value:,.2f}."
        return {"insight": insight, "supporting": supporting}

    if intent == "correlation":
        orders_change = float(drivers.get("orders_change_pct", 0.0))
        revenue_change = float(drivers.get("revenue_change_pct", 0.0))
        aligned = (orders_change >= 0 and revenue_change >= 0) or (orders_change < 0 and revenue_change < 0)
        insight = (
            "Revenue and orders move in the same direction, suggesting volume is a primary driver."
            if aligned
            else "Revenue and orders are diverging, indicating mix or pricing effects."
        )
        supporting = f"Orders {_fmt_pct(orders_change)} vs Revenue {_fmt_pct(revenue_change)} over the same horizon."
        return {"insight": insight, "supporting": supporting}

    return None

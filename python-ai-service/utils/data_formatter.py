from datetime import datetime, timedelta


def _coerce_number(value):
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None

    return numeric


def _to_pascal_case(value):
    parts = [part for part in str(value or "").replace("-", "_").split("_") if part]
    return "".join(part[:1].upper() + part[1:] for part in parts)


def _metric_candidate_keys(metric):
    normalized_metric = str(metric or "").strip()
    derived_keys = []

    if normalized_metric:
        pascal_metric = _to_pascal_case(normalized_metric)
        derived_keys.extend(
            [
                normalized_metric,
                f"current{pascal_metric}",
                f"total{pascal_metric}",
            ]
        )

    fallback_keys = [
        "currentValue",
        "value",
        "currentRevenue",
        "totalRevenue",
        "currentOrders",
        "totalOrders",
        "currentAov",
    ]

    ordered_keys = []
    for key in [*derived_keys, *fallback_keys]:
        if key and key not in ordered_keys:
            ordered_keys.append(key)

    return ordered_keys


def extract_series_points(data, metric=None):
    points = []
    metric_keys = _metric_candidate_keys(metric)

    for index, row in enumerate(data or []):
        if isinstance(row, (int, float)):
            points.append(
                {
                    "period": f"point-{index + 1}",
                    "value": float(row),
                }
            )
            continue

        if not isinstance(row, dict):
            numeric_value = _coerce_number(row)
            if numeric_value is None:
                continue

            points.append(
                {
                    "period": f"point-{index + 1}",
                    "value": numeric_value,
                }
            )
            continue

        period = row.get("period") or row.get("date") or f"point-{index + 1}"

        value = None
        for key in metric_keys:
            if key in row and row.get(key) is not None:
                try:
                    value = float(row.get(key))
                    break
                except (TypeError, ValueError):
                    value = None

        if value is None:
            continue

        points.append({"period": str(period), "value": value})

    return points


def build_metric_overview(data, metric):
    points = extract_series_points(data, metric)
    values = [point["value"] for point in points]

    return {
        "metric": metric,
        "count": len(points),
        "min": min(values) if values else 0,
        "max": max(values) if values else 0,
        "latest": values[-1] if values else 0,
    }


def build_context_overview(context):
    if not context:
        return "no additional context"

    keys = sorted(str(key) for key in context.keys())
    return ", ".join(keys)


def humanize_metric(metric):
    normalized_metric = str(metric or "revenue").strip()
    metric_labels = {
        "revenue": "revenue",
        "orders": "orders",
        "aov": "average order value",
        "currentValue": "revenue",
        "currentRevenue": "revenue",
        "totalRevenue": "revenue",
        "currentOrders": "orders",
        "totalOrders": "orders",
        "currentAov": "average order value",
    }
    return metric_labels.get(normalized_metric, normalized_metric.replace("_", " "))


def _normalize_filter_value(value, default="all"):
    if value is None:
        return default

    if isinstance(value, str):
        normalized = value.strip()
        return normalized or default

    if isinstance(value, bool):
        return "yes" if value else "no"

    return str(value)


def _format_numeric_value(value):
    if value is None:
        return "0"

    if float(value).is_integer():
        return str(int(value))

    return f"{value:.2f}"


def build_context_snapshot(context):
    if not context:
        return "No additional dashboard context was provided."

    snapshot_lines = []

    total_revenue = context.get("totalRevenue")
    if total_revenue is not None:
        snapshot_lines.append(f"- Total Revenue: {_format_numeric_value(total_revenue)}")

    total_orders = context.get("totalOrders")
    if total_orders is not None:
        snapshot_lines.append(f"- Total Orders: {_format_numeric_value(total_orders)}")

    top_categories = context.get("topCategories") or []
    if top_categories:
        category_labels = ", ".join(
            str(category.get("category") or "unknown")
            for category in top_categories[:3]
            if isinstance(category, dict)
        )
        if category_labels:
            snapshot_lines.append(f"- Top Categories: {category_labels}")

    if not snapshot_lines:
        snapshot_lines.append("- Context Keys: " + build_context_overview(context))

    return "\n".join(snapshot_lines)


def forecast_period_label(step):
    next_period = datetime.utcnow() + timedelta(days=step)
    return next_period.strftime("%Y-%m-%d")

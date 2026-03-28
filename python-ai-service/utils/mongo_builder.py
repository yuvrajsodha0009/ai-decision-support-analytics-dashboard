from datetime import datetime, timedelta, timezone

from utils.validator import ValidatedIntent

ALLOWED_MONGO_FIELDS = {"amount", "category", "region", "createdAt"}


def _metric_expression(metric: str, aggregation: str) -> dict:
    if metric == "orders":
        return {"$sum": 1}

    if aggregation == "sum":
        return {"$sum": "$amount"}
    if aggregation == "avg":
        return {"$avg": "$amount"}
    if aggregation == "count":
        return {"$sum": 1}

    raise ValueError(f"Unsupported aggregation: {aggregation}")


def _group_id(group_by: str):
    if group_by == "category":
        return "$category"
    if group_by == "region":
        return "$region"
    if group_by == "date":
        return {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}}
    if group_by == "none":
        return None

    raise ValueError(f"Unsupported group_by: {group_by}")


def _build_date_match(date_range: str | None, custom_start=None, custom_end=None) -> dict:
    if not date_range:
        return {}

    now = datetime.now(timezone.utc)

    if date_range == "today":
        day_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
        return {"$gte": day_start, "$lte": now}

    if date_range == "last_7_days":
        return {"$gte": now - timedelta(days=7), "$lte": now}

    if date_range == "this_month":
        month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        return {"$gte": month_start, "$lte": now}

    if date_range == "custom":
        if custom_start is None or custom_end is None:
            raise ValueError("Custom date range boundaries are missing")
        return {"$gte": custom_start, "$lte": custom_end}

    raise ValueError(f"Unsupported date range: {date_range}")


def build_orders_pipeline(validated: ValidatedIntent) -> list[dict]:
    intent = validated.intent
    pipeline: list[dict] = []

    match_stage: dict = {}

    if intent.filters.region:
        match_stage["region"] = intent.filters.region

    if intent.filters.category:
        match_stage["category"] = intent.filters.category

    date_match = _build_date_match(
        intent.filters.date_range,
        custom_start=validated.custom_start,
        custom_end=validated.custom_end,
    )
    if date_match:
        match_stage["createdAt"] = date_match

    for field_name in match_stage:
        if field_name not in ALLOWED_MONGO_FIELDS:
            raise ValueError(f"Unsafe match field: {field_name}")

    if match_stage:
        pipeline.append({"$match": match_stage})

    group_key = _group_id(intent.group_by)
    expression = _metric_expression(intent.metric, intent.aggregation)

    pipeline.append(
        {
            "$group": {
                "_id": group_key,
                "value": expression,
            }
        }
    )

    if intent.group_by == "none":
        pipeline.append(
            {
                "$project": {
                    "_id": 0,
                    "label": {"$literal": "total"},
                    "value": 1,
                }
            }
        )
        return pipeline

    sort_direction = -1 if intent.sort == "desc" else 1
    pipeline.append({"$sort": {"value": sort_direction, "_id": 1}})

    if intent.limit:
        pipeline.append({"$limit": int(intent.limit)})

    pipeline.append(
        {
            "$project": {
                "_id": 0,
                "label": {"$ifNull": [{"$toString": "$_id"}, "unknown"]},
                "value": 1,
            }
        }
    )

    return pipeline

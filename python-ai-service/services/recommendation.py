from utils.data_formatter import build_metric_overview


def generate_recommendation(data, metric=None, context=None):
    overview = build_metric_overview(data, metric or "metric")

    return {
        "items": [
            {
                "id": "rec-monitor",
                "title": "Monitor variance",
                "detail": f"Continue monitoring {overview['metric']} over the next reporting window.",
            },
            {
                "id": "rec-compare",
                "title": "Compare drivers",
                "detail": "Compare top-performing segments before enabling real recommendation models.",
            },
        ],
        "text": "Placeholder recommendations generated successfully.",
    }

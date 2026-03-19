from utils.data_formatter import extract_series_points


def detect_anomaly(data, metric=None, context=None):
    points = extract_series_points(data, metric)
    if not points:
        return {
            "items": [],
            "text": "No data points were supplied for anomaly analysis.",
        }

    ranked = sorted(points, key=lambda item: item["value"], reverse=True)
    candidate = ranked[0]

    return {
        "items": [
            {
                "id": f"anomaly-{candidate['period']}",
                "period": candidate["period"],
                "value": candidate["value"],
                "severity": "medium",
                "label": "Placeholder anomaly candidate",
                "reason": f"Highest observed {metric or 'metric'} in the supplied series.",
            }
        ],
        "text": "Placeholder anomaly scan completed successfully.",
    }

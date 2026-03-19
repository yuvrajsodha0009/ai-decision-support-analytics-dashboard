from utils.data_formatter import extract_series_points, forecast_period_label


def generate_forecast(data, metric=None, context=None):
    points = extract_series_points(data, metric)
    base_value = points[-1]["value"] if points else 0

    series = []
    for step in range(1, 4):
        series.append(
            {
                "period": forecast_period_label(step),
                "value": round(base_value * (1 + (step * 0.03)), 2),
                "confidence": 0.65 - (step * 0.05),
            }
        )

    return {
        "series": series,
        "text": "Placeholder forecast generated from the latest observed value.",
    }

from utils.data_formatter import build_context_overview, build_metric_overview


def run_nlq_query(question, data=None, context=None):
    metric_overview = build_metric_overview(data or [], "metric")
    context_overview = build_context_overview(context or {})
    text = (
        "NLQ service is available without smart summary generation. "
        f"Question received: {question or 'N/A'}. "
        f"Data points: {metric_overview.get('count', 0)}. "
        f"Context keys: {context_overview}."
    )
    provider = "rule-based"

    return {
        "text": text,
        "provider": provider,
        "question": question,
        "suggestions": [
            "Ask for top category movement in the selected filters.",
            "Ask which category needs attention.",
        ],
    }

def build_nlq_prompt(question, metric_overview, context_overview):
    return (
        "You are a placeholder analytics NLQ engine. "
        f"Question: {question}. "
        f"Metric overview: {metric_overview}. "
        f"Context: {context_overview}. "
        "Return a concise answer that acknowledges this is scaffold output."
    )

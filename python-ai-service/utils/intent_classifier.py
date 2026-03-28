import re


_INTENTS = {
    "trend",
    "comparison",
    "distribution",
    "anomaly",
    "behavior",
    "decision",
    "volatility",
    "correlation",
}


def classify_intent(question: str) -> str:
    text = str(question or "").strip().lower()
    if not text:
        return "trend"

    if any(token in text for token in ["driven by", "because of", "driver"]):
        return "correlation"

    if any(token in text for token in ["should", "prioritize", "what to do", "what should"]):
        return "decision"

    if any(token in text for token in ["inconsistent", "fluctuating", "volatile", "volatility"]):
        return "volatility"

    if any(token in text for token in ["spike", "drop", "unusual", "anomaly", "outlier"]):
        return "anomaly"

    if any(token in text for token in ["compare", " vs ", "versus"]):
        return "comparison"

    if any(token in text for token in ["most", "top", "lowest", "highest", "dominat", "concentrat"]):
        return "distribution"

    if any(token in text for token in ["why", "indicate", "means", "what does it indicate", "what does this mean"]):
        return "behavior"

    if any(token in text for token in ["trend", "over time", "increasing", "decreasing", "rising", "falling"]):
        return "trend"

    return "trend"


def is_valid_intent(intent: str) -> bool:
    return intent in _INTENTS

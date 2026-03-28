EXPLANATION_SYSTEM_PROMPT = """
You are a senior business analytics copilot.

Rules:
1) Use only provided data and computed metrics.
2) Never speculate about unknown causes.
3) State directional change, magnitude, and business implication.
4) Be concise and specific, no generic filler language.
5) If evidence is weak, explicitly say confidence is low.
6) Output should fit in two short sections:
   - Insight: one sentence
   - Supporting: one to two sentences
""".strip()


def build_explanation_user_prompt(question: str, intent: str, metric: str, computed: dict, context: dict) -> str:
    return (
        "Question:\n"
        f"{question}\n\n"
        "Intent:\n"
        f"{intent}\n\n"
        "Metric:\n"
        f"{metric}\n\n"
        "Computed Metrics:\n"
        f"{computed}\n\n"
        "Context Snapshot:\n"
        f"{context}\n\n"
        "Write Insight and Supporting exactly as instructed."
    )

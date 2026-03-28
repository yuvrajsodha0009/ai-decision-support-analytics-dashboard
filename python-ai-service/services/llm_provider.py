from langchain_groq import ChatGroq

from config import get_settings


def _resolve_provider(task: str) -> str:
    settings = get_settings()
    if task == "router" and settings.copilot_router_provider:
        return settings.copilot_router_provider
    if task == "answer" and settings.copilot_answer_provider:
        return settings.copilot_answer_provider
    return settings.copilot_llm_provider


def _resolve_model(task: str, override: str | None = None) -> str:
    settings = get_settings()
    if override:
        return override
    if task == "router" and settings.copilot_router_model:
        return settings.copilot_router_model
    if task == "answer" and settings.copilot_answer_model:
        return settings.copilot_answer_model
    return settings.groq_model


def get_chat_model(task: str = "answer", model: str | None = None):
    settings = get_settings()
    provider = _resolve_provider(task)

    if provider != "groq":
        raise ValueError(
            f"Unsupported copilot provider '{provider}'. Install the matching provider adapter or use COPILOT_LLM_PROVIDER=groq."
        )

    if not settings.groq_api_key:
        raise ValueError("GROQ_API_KEY is required for Ask AI copilot")

    temperature = (
        settings.copilot_router_temperature
        if task == "router"
        else settings.copilot_answer_temperature
    )

    return ChatGroq(
        model=_resolve_model(task, model),
        api_key=settings.groq_api_key,
        temperature=temperature,
        max_retries=2,
        timeout=settings.groq_timeout_seconds,
    )


def get_groq_chat(model: str | None = None) -> ChatGroq:
    return get_chat_model(task="answer", model=model)

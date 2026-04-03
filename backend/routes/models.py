from fastapi import APIRouter

from schemas.models import ModelsResponse
from services.model_loader import (
    ALLOWED_EMBEDDING_MODELS,
    ALLOWED_LLM_MODELS,
    get_ollama_available_model_names,
    is_family_available,
)


router = APIRouter()


@router.get("", response_model=ModelsResponse)
async def get_models() -> ModelsResponse:
    # Best-effort: if Ollama isn't reachable, still return allowed models
    # as "not available" so the UI doesn't get stuck.
    try:
        available_names = await get_ollama_available_model_names()
    except Exception:
        available_names = set()

    llm_models = [
        {"name": name, "available": is_family_available(name, available_names)}
        for name in sorted(ALLOWED_LLM_MODELS)
    ]
    embedding_models = [
        {"name": name, "available": is_family_available(name, available_names)}
        for name in sorted(ALLOWED_EMBEDDING_MODELS)
    ]

    return ModelsResponse(llm_models=llm_models, embedding_models=embedding_models)


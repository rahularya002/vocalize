import httpx
import os
from fastapi import HTTPException


ALLOWED_LLM_MODELS = {"qwen2.5:7b", "llama3.1:8b", "qwen2.5:14b"}
ALLOWED_EMBEDDING_MODELS = {"nomic-embed-text", "bge-m3"}
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")


def validate_llm_model(model_name: str) -> None:
    if model_name not in ALLOWED_LLM_MODELS:
        raise HTTPException(status_code=400, detail="Unsupported LLM model")


def validate_embedding_model(model_name: str) -> None:
    if model_name not in ALLOWED_EMBEDDING_MODELS:
        raise HTTPException(status_code=400, detail="Unsupported embedding model")


def get_llm(model_name: str) -> str:
    validate_llm_model(model_name)
    return model_name


def get_embeddings(model_name: str) -> str:
    validate_embedding_model(model_name)
    return model_name


async def get_ollama_available_model_names() -> set[str]:
    """
    Returns model names that are currently pulled on this machine.
    """
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
    if response.status_code != 200:
        raise HTTPException(status_code=503, detail="Failed to fetch models from Ollama")

    data = response.json()
    models = data.get("models", [])
    names: set[str] = set()
    for m in models:
        name = m.get("name") or m.get("model")
        if name:
            names.add(name)
    return names


def _is_family_match(requested_allowed_name: str, pulled_model_tag: str) -> bool:
    """
    Treat the requested allowed name as a "family prefix".
    Examples:
      - requested: nomic-embed-text
        pulled:    nomic-embed-text:latest
      - requested: llama3.1:8b
        pulled:    llama3.1:8b-instruct-q4_K_M
    """
    if pulled_model_tag == requested_allowed_name:
        return True
    return pulled_model_tag.startswith(f"{requested_allowed_name}:") or pulled_model_tag.startswith(requested_allowed_name)


def is_family_available(allowed_name: str, available_names: set[str]) -> bool:
    return any(_is_family_match(allowed_name, name) for name in available_names)


async def _resolve_llm_or_embedding_name(allowed_name: str) -> str:
    """
    Resolve an allowed "base" name to the actual pulled Ollama tag.
    If the exact name exists, we use it. Otherwise we try family prefix matches.
    """
    # Best-effort: if tags are incomplete/unavailable, return allowed_name and
    # let Ollama decide. We'll only strictly resolve when we can.
    try:
        available_names = await get_ollama_available_model_names()
    except Exception:
        return allowed_name

    if allowed_name in available_names:
        return allowed_name

    candidates = [n for n in available_names if _is_family_match(allowed_name, n)]
    if candidates:
        # Prefer deterministic ordering
        return sorted(candidates)[0]

    # Tags may not list every model; try the allowed name directly.
    return allowed_name


async def resolve_llm_model(allowed_llm_name: str) -> str:
    validate_llm_model(allowed_llm_name)
    return await _resolve_llm_or_embedding_name(allowed_llm_name)


async def embed_text(text: str, model_name: str) -> list[float]:
    base_model = get_embeddings(model_name)

    async def _call(model: str) -> httpx.Response:
        async with httpx.AsyncClient(timeout=60) as client:
            return await client.post(
                f"{OLLAMA_BASE_URL}/api/embeddings",
                json={"model": model, "prompt": text},
            )

    # Try the allowed base name first (works even if /api/tags is incomplete).
    response = await _call(base_model)
    if response.status_code == 404:
        # Fallback: try to resolve a compatible pulled tag and retry once.
        resolved = await _resolve_llm_or_embedding_name(base_model)
        if resolved != base_model:
            response = await _call(resolved)

    if response.status_code == 404:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama embedding model '{base_model}' not found. Pull it first in Ollama.",
        )

    response.raise_for_status()
    data = response.json()
    return data["embedding"]

from fastapi import APIRouter, HTTPException

from schemas.assistant import AssistantCreateRequest, AssistantConfig
from services.model_loader import validate_embedding_model, validate_llm_model
from utils.storage import create_assistant, delete_assistant, get_assistant, list_assistants


router = APIRouter()


@router.post("/create", response_model=AssistantConfig)
async def create_assistant_route(payload: AssistantCreateRequest) -> AssistantConfig:
    if payload.provider == "local":
        validate_llm_model(payload.llm_model)
        validate_embedding_model(payload.embedding_model)
    return create_assistant(payload)


@router.get("", response_model=list[AssistantConfig])
async def list_assistants_route() -> list[AssistantConfig]:
    return list_assistants()


@router.get("/{assistant_id}", response_model=AssistantConfig)
async def get_assistant_route(assistant_id: str) -> AssistantConfig:
    assistant = get_assistant(assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    return assistant


@router.delete("/{assistant_id}")
async def delete_assistant_route(assistant_id: str) -> dict:
    deleted = delete_assistant(assistant_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Assistant not found")
    return {"assistant_id": assistant_id, "deleted": True}

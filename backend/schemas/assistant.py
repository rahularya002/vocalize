from typing import Literal

from pydantic import BaseModel, Field


class AssistantCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    use_case: str = Field(min_length=2, max_length=80)
    provider: Literal["local", "runpod"] = "local"
    llm_model: str
    embedding_model: str
    voice: str
    voice_enabled: bool = False


class AssistantConfig(AssistantCreateRequest):
    assistant_id: str

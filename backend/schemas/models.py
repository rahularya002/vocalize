from pydantic import BaseModel, Field


class ModelOption(BaseModel):
    name: str
    available: bool = Field(default=False)


class ModelsResponse(BaseModel):
    llm_models: list[ModelOption]
    embedding_models: list[ModelOption]


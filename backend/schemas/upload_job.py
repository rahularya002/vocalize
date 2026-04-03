from typing import Literal

from pydantic import BaseModel, Field


class UploadJobCreateResponse(BaseModel):
    assistant_id: str
    job_id: str


class UploadJobStatusResponse(BaseModel):
    job_id: str
    assistant_id: str
    status: Literal["processing", "done", "error"]
    progress: int = Field(ge=0, le=100)
    ingested_chunks: int | None = None
    error: str | None = None


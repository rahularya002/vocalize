import asyncio

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from services.rag import ingest_documents
from utils.storage import get_assistant
from utils.jobs import create_job, get_job, set_job_done, set_job_error, set_job_progress
from schemas.upload_job import UploadJobCreateResponse, UploadJobStatusResponse


router = APIRouter()


@router.post("/{assistant_id}/upload")
async def upload_knowledge_route(
    background_tasks: BackgroundTasks,
    assistant_id: str,
    files: list[UploadFile] = File(...),
) -> UploadJobCreateResponse:
    assistant = get_assistant(assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    job_id = create_job(assistant_id)

    # Read files into memory so the background task doesn't depend on UploadFile lifetime.
    class _InMemoryUploadFile:
        def __init__(self, filename: str | None, content: bytes):
            self.filename = filename
            self._content = content

        async def read(self) -> bytes:
            return self._content

    in_memory_files = []
    for f in files:
        content = await f.read()
        in_memory_files.append(_InMemoryUploadFile(f.filename, content))

    async def _run_ingestion_async() -> None:
        try:
            total = max(len(in_memory_files), 1)

            def _on_progress(done_files: int, total_files: int) -> None:
                set_job_progress(job_id, int((done_files / max(total, 1)) * 100))

            ingested = await ingest_documents(
                assistant, in_memory_files, on_progress=_on_progress
            )
            set_job_done(job_id, ingested)
        except Exception as e:
            set_job_error(job_id, str(e))

    def _run_ingestion_sync() -> None:
        # FastAPI BackgroundTasks run in a sync context; ensure we execute the async
        # ingestion reliably whether an event loop is already present or not.
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            loop.create_task(_run_ingestion_async())
        else:
            asyncio.run(_run_ingestion_async())

    background_tasks.add_task(_run_ingestion_sync)

    return UploadJobCreateResponse(assistant_id=assistant_id, job_id=job_id)


@router.get("/{assistant_id}/upload/status/{job_id}", response_model=UploadJobStatusResponse)
async def upload_status_route(
    assistant_id: str,
    job_id: str,
) -> UploadJobStatusResponse:
    job = get_job(job_id)
    if not job or job.get("assistant_id") != assistant_id:
        raise HTTPException(status_code=404, detail="Job not found")
    return UploadJobStatusResponse(
        job_id=job_id,
        assistant_id=assistant_id,
        status=job["status"],
        progress=job["progress"],
        ingested_chunks=job.get("ingested_chunks"),
        error=job.get("error"),
    )

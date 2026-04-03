import time
import uuid
from typing import Any


JOBS: dict[str, dict[str, Any]] = {}


def create_job(assistant_id: str) -> str:
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {
        "job_id": job_id,
        "assistant_id": assistant_id,
        "status": "processing",
        "progress": 0,
        "created_at": time.time(),
        "ingested_chunks": None,
        "error": None,
    }
    return job_id


def set_job_progress(job_id: str, progress: int) -> None:
    job = JOBS.get(job_id)
    if not job:
        return
    job["progress"] = max(0, min(100, int(progress)))


def set_job_done(job_id: str, ingested_chunks: int) -> None:
    job = JOBS.get(job_id)
    if not job:
        return
    job["status"] = "done"
    job["ingested_chunks"] = ingested_chunks
    job["progress"] = 100


def set_job_error(job_id: str, error: str) -> None:
    job = JOBS.get(job_id)
    if not job:
        return
    job["status"] = "error"
    job["error"] = error


def get_job(job_id: str) -> dict[str, Any] | None:
    return JOBS.get(job_id)


import os
import re

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.assistant import router as assistant_router
from routes.chat import router as chat_router
from routes.models import router as models_router
from routes.upload import router as upload_router


def _env_truthy(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in ("1", "true", "yes", "on")


app = FastAPI(title="RAG Voice AI Assistant Builder API", version="1.0.0")

cors_origins_raw = os.getenv("CORS_ORIGINS", "").strip()
cors_origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]
cors_origin_regex = os.getenv("CORS_ORIGIN_REGEX", "").strip() or None

# Nuclear option for RunPod + Vercel debugging (no cookies on this API → * is OK).
if _env_truthy("CORS_ALLOW_ALL"):
    cors_origins = ["*"]
    cors_origin_regex = None
else:
    # Vercel Preview URLs look like https://<project>-git-<branch>-<team>.vercel.app
    _vercel_preview_re = r"https://.*\.vercel\.app"
    if _env_truthy("CORS_ALLOW_VERCEL_PREVIEWS"):
        if cors_origin_regex:
            cors_origin_regex = f"({_vercel_preview_re})|({cors_origin_regex})"
        else:
            cors_origin_regex = _vercel_preview_re

if cors_origin_regex is not None:
    # Starlette compiles this; invalid regex fails fast at import (fix env and redeploy).
    re.compile(cors_origin_regex)

app.add_middleware(
    CORSMiddleware,
    # Vercel production: set CORS_ORIGINS=https://your-domain.com,https://your-app.vercel.app
    # Vercel previews: set CORS_ALLOW_VERCEL_PREVIEWS=true (or set CORS_ORIGIN_REGEX yourself).
    # Stuck on "CORS failed" with status null: try CORS_ALLOW_ALL=true (see deploy/README-RUNPOD-PROXY.md).
    allow_origins=cors_origins if cors_origins else ["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=cors_origin_regex,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assistant_router, prefix="/assistant", tags=["assistant"])
app.include_router(models_router, prefix="/models", tags=["models"])
app.include_router(upload_router, prefix="/assistant", tags=["upload"])
app.include_router(chat_router, prefix="/assistant", tags=["chat"])


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}

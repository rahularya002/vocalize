import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.assistant import router as assistant_router
from routes.chat import router as chat_router
from routes.models import router as models_router
from routes.upload import router as upload_router


app = FastAPI(title="RAG Voice AI Assistant Builder API", version="1.0.0")

cors_origins_raw = os.getenv("CORS_ORIGINS", "").strip()
cors_origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]
cors_origin_regex = os.getenv("CORS_ORIGIN_REGEX", "").strip() or None

app.add_middleware(
    CORSMiddleware,
    # In production, set `CORS_ORIGINS` (comma-separated) to your Vercel domains.
    # For Vercel Preview deployments, you can set `CORS_ORIGIN_REGEX` to:
    #   https://.*\\.vercel\\.app
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

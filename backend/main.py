from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.assistant import router as assistant_router
from routes.chat import router as chat_router
from routes.models import router as models_router
from routes.upload import router as upload_router


app = FastAPI(title="RAG Voice AI Assistant Builder API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    # Important: when using allow_origins="*", browsers disallow
    # Access-Control-Allow-Credentials=true (CORS spec enforcement).
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

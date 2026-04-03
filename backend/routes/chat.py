from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from schemas.chat import ChatRequest, TTSRequest
from services.rag import stream_chat_answer
from services.voice import stream_tts_audio
from services.runpod_client import stream_runpod_tts
from utils.storage import get_assistant


router = APIRouter()


@router.post("/{assistant_id}/stream")
async def stream_chat_route(assistant_id: str, payload: ChatRequest) -> StreamingResponse:
    assistant = get_assistant(assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")

    return StreamingResponse(
        stream_chat_answer(assistant, payload),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.post("/{assistant_id}/tts")
async def tts_route(assistant_id: str, payload: TTSRequest) -> StreamingResponse:
    assistant = get_assistant(assistant_id)
    if not assistant:
        raise HTTPException(status_code=404, detail="Assistant not found")
    if not getattr(assistant, "voice_enabled", False):
        raise HTTPException(status_code=400, detail="Voice is disabled for this assistant")

    if getattr(assistant, "provider", "local") == "runpod":
        return StreamingResponse(
            stream_runpod_tts(payload.text, assistant.voice),
            media_type="audio/mpeg",
        )

    return StreamingResponse(
        stream_tts_audio(payload.text, assistant.voice),
        media_type="audio/mpeg",
    )

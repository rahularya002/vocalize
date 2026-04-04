import json
import os
from collections.abc import AsyncGenerator

import httpx


RUNPOD_BASE_URL = os.getenv(
    "RUNPOD_BASE_URL",
    "https://3msf2my21g1zl4-8000.proxy.runpod.net",
).rstrip("/")


def _as_history_lines(history: list[dict] | list[str] | None) -> list[str]:
    if not history:
        return []
    if history and isinstance(history[0], str):
        return [str(x) for x in history]
    lines: list[str] = []
    for h in history:  # type: ignore[assignment]
        role = str(h.get("role", "user"))
        content = str(h.get("content", ""))
        if content.strip():
            lines.append(f"{role}: {content}")
    return lines


async def stream_runpod_answer(
    question: str,
    voice: str,
    history: list[dict] | list[str] | None = None,
) -> AsyncGenerator[str, None]:
    """
    Proxy the Runpod backend /stream endpoint into our SSE format:
      data: {"token": "...", "done": false}
      ...
      data: {"token": "", "done": true, "sources": []}
    """
    payload = {
        "question": question,
        "voice": voice,
        "history": _as_history_lines(history),
    }

    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", f"{RUNPOD_BASE_URL}/stream", json=payload) as resp:
            resp.raise_for_status()

            content_type = (resp.headers.get("content-type") or "").lower()
            if "text/event-stream" in content_type:
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    if line.startswith("data:"):
                        raw = line.replace("data:", "", 1).strip()
                        # Try to parse json payloads, otherwise treat as text.
                        try:
                            data = json.loads(raw)
                            token = data.get("token") or data.get("response") or raw
                        except Exception:
                            token = raw
                        if str(token).strip() == "[DONE]":
                            continue
                        yield f"data: {json.dumps({'token': token, 'done': False})}\n\n"
                yield f"data: {json.dumps({'token': '', 'done': True, 'sources': []})}\n\n"
                return

            # Fallback: treat response body as streamed text.
            async for chunk in resp.aiter_text():
                if not chunk:
                    continue
                yield f"data: {json.dumps({'token': chunk, 'done': False})}\n\n"

    yield f"data: {json.dumps({'token': '', 'done': True, 'sources': []})}\n\n"


async def stream_runpod_tts(
    text: str,
    voice: str,
    speed: float = 1.0,
    pitch: float = 1.0,
    volume: float = 1.0,
) -> AsyncGenerator[bytes, None]:
    payload = {
        "question": text,
        "voice": voice,
        "speed": speed,
        "pitch": pitch,
        "volume": volume,
    }
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", f"{RUNPOD_BASE_URL}/stream_tts", json=payload) as resp:
            resp.raise_for_status()
            async for b in resp.aiter_bytes():
                if b:
                    yield b


from collections.abc import AsyncGenerator

import edge_tts


async def stream_tts_audio(text: str, voice: str) -> AsyncGenerator[bytes, None]:
    communicate = edge_tts.Communicate(text=text, voice=voice)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            yield chunk["data"]

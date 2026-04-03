import json
import os
import uuid
from collections.abc import AsyncGenerator, Callable

from io import BytesIO
import httpx
from fastapi import UploadFile

from pypdf import PdfReader

from schemas.assistant import AssistantConfig
from schemas.chat import ChatRequest
from services.model_loader import OLLAMA_BASE_URL, embed_text, resolve_llm_model
from services.vectorstore import get_collection
from services.runpod_client import stream_runpod_answer


DEFAULT_MAX_DISTANCE = float(os.getenv("RAG_MAX_DISTANCE", "1.5"))


def _chunk_text(text: str, chunk_size: int = 800, overlap: int = 120) -> list[str]:
    text = text.strip()
    if not text:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        if end == len(text):
            break
        start = max(end - overlap, 0)
    return chunks


async def _file_to_text(file: UploadFile) -> str:
    content = await file.read()
    ext = file.filename.lower().split(".")[-1] if file.filename else ""

    if ext in {"txt", "md"}:
        return content.decode("utf-8", errors="ignore")
    if ext == "pdf":
        try:
            reader = PdfReader(BytesIO(content))
            parts: list[str] = []
            for page in reader.pages:
                text = page.extract_text() or ""
                if text.strip():
                    parts.append(text)
            return "\n\n".join(parts).strip()
        except Exception:
            # If parsing fails, return empty string so ingestion skips it.
            return ""
    if ext == "json":
        try:
            obj = json.loads(content.decode("utf-8", errors="ignore"))
            return json.dumps(obj, ensure_ascii=True, indent=2)
        except json.JSONDecodeError:
            return content.decode("utf-8", errors="ignore")
    return content.decode("utf-8", errors="ignore")


async def ingest_documents(
    assistant: AssistantConfig,
    files: list[UploadFile],
    on_progress: Callable[[int, int], None] | None = None,
) -> int:
    collection = get_collection(assistant.assistant_id)
    inserted = 0
    total = max(len(files), 1)

    for idx, file in enumerate(files):
        text = await _file_to_text(file)
        chunks = _chunk_text(text)
        if not chunks:
            if on_progress:
                on_progress(idx + 1, total)
            continue

        embeddings = [await embed_text(chunk, assistant.embedding_model) for chunk in chunks]
        ids = [str(uuid.uuid4()) for _ in chunks]
        metadatas = [
            {
                "source": file.filename or "uploaded_file",
                "chunk_index": idx,
            }
            for idx in range(len(chunks))
        ]
        collection.add(
            ids=ids,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        inserted += len(chunks)
        if on_progress:
            on_progress(idx + 1, total)

    return inserted


def _strict_prompt(query: str, context: str, use_case: str, conversation: str) -> str:
    return (
        "You are a RAG assistant.\n"
        f"Use case: {use_case}\n\n"
        "Rules:\n"
        "1) Answer ONLY using the provided context.\n"
        "2) If context is insufficient, say: "
        "'I do not have enough information in the knowledge base.'\n"
        "3) Do not fabricate facts.\n\n"
        "Conversation history (for reference only):\n"
        f"{conversation}\n\n"
        f"Context:\n{context}\n\n"
        f"User question: {query}\n\n"
        "Answer:"
    )


async def stream_chat_answer(
    assistant: AssistantConfig, payload: ChatRequest
) -> AsyncGenerator[str, None]:
    if getattr(assistant, "provider", "local") == "runpod":
        async for evt in stream_runpod_answer(
            question=payload.message,
            voice=getattr(assistant, "voice", "en-US-AriaNeural"),
            history=[h.model_dump() for h in (payload.history or [])],
        ):
            yield evt
        return

    collection = get_collection(assistant.assistant_id)
    try:
        query_embedding = await embed_text(payload.message, assistant.embedding_model)
    except Exception:
        fallback = "I do not have enough information in the knowledge base."
        yield f"data: {json.dumps({'token': fallback, 'done': True, 'sources': []})}\n\n"
        return

    # Attempt to get documents, metadata, and distances.
    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=payload.k,
            include=["documents", "metadatas", "distances"],
        )
    except TypeError:
        results = collection.query(query_embeddings=[query_embedding], n_results=payload.k)

    docs = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0] or []
    distances = results.get("distances", [[]])[0] if "distances" in results else None

    context_parts: list[str] = []
    unique_sources: list[str] = []
    for idx, doc in enumerate(docs or []):
        if not isinstance(doc, str) or not doc.strip():
            continue
        md = metadatas[idx] if idx < len(metadatas) and isinstance(metadatas[idx], dict) else {}
        source = md.get("source") or "document"
        chunk_index = md.get("chunk_index")

        if source not in unique_sources:
            unique_sources.append(source)

        if chunk_index is not None:
            context_parts.append(f"[{source}:{chunk_index}]\n{doc}")
        else:
            context_parts.append(f"[{source}]\n{doc}")

    context = "\n\n".join(context_parts).strip()

    # Grounding fallback:
    # Chroma distance scales vary by metric and embedding family (often very large for L2),
    # so we do NOT gate on distance here. We only fall back when retrieval yields no text.
    should_fallback = not context

    fallback = "I do not have enough information in the knowledge base."
    if should_fallback:
        yield f"data: {json.dumps({'token': fallback, 'done': True, 'sources': []})}\n\n"
        return

    history_items = payload.history or []
    # Keep prompt small; most recent turns are more useful.
    history_tail = history_items[-10:]
    conversation = "\n".join([f"{h.role}: {h.content}" for h in history_tail]).strip()
    if not conversation:
        conversation = "None"

    prompt = _strict_prompt(payload.message, context, assistant.use_case, conversation)
    model = await resolve_llm_model(assistant.llm_model)

    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
            "POST",
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": model, "prompt": prompt, "stream": True},
        ) as response:
            response.raise_for_status()
            sources_payload = unique_sources[: payload.k]
            sources_sent = False
            async for line in response.aiter_lines():
                if not line:
                    continue
                try:
                    chunk = json.loads(line)
                except json.JSONDecodeError:
                    # Best-effort: ignore malformed/keep-alive lines
                    continue

                token = chunk.get("response", "")
                done = bool(chunk.get("done", False))

                payload_out = {"token": token, "done": done}
                if done and not sources_sent:
                    payload_out["sources"] = sources_payload
                    sources_sent = True

                yield f"data: {json.dumps(payload_out)}\n\n"

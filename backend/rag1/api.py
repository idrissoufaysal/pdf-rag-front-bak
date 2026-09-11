import json
from pathlib import Path
import tempfile
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage

# Import de la logique métier RAG depuis rag.py
from rag import run_rag_astream, ingest_file, filter_sources_by_relevance

app = FastAPI(title="RAG File Assistant API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Schemas Pydantic ---
class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' ou 'assistant'")
    content: str

class ChatRequest(BaseModel):
    question: str = Field(..., example="Quelles sont les actions de la Semaine 1 ?")
    history: Optional[List[ChatMessage]] = Field(default=[])
    session_id: Optional[str] = Field(default=None, description="Identifiant unique de session pour le suivi conversationnel Langfuse")


# --- Endpoint 1 : Upload de Fichier ---
@app.post("/api/upload")
async def upload_file_endpoint(file: UploadFile = File(...)):
    suffix = Path(file.filename).suffix.lower()
    if suffix not in [".pdf", ".txt", ".md"]:
        raise HTTPException(status_code=400, detail="Format non supporté.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_path = Path(temp_file.name)

    try:
        nb_chunks = await ingest_file(temp_path, original_filename=file.filename)
        return {"message": f"Fichier '{file.filename}' indexé avec succès !", "chunks_added": nb_chunks}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        if temp_path.exists():
            temp_path.unlink()


# --- Endpoint 2 : Chat RAG SSE avec Sources Filtrées & Streaming ---
@app.post("/api/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """Endpoint de Chat RAG avec sources filtrées et réponse streaming en SSE JSON."""
    
    chat_history: List[BaseMessage] = [
        HumanMessage(content=msg.content) if msg.role == "user" else AIMessage(content=msg.content)
        for msg in request.history
    ]

    async def event_generator():
        try:
            sources, stream_gen = await run_rag_astream(
                request.question,
                chat_history,
                session_id=request.session_id
            )

            full_response = ""
            async for chunk in stream_gen:
                full_response += chunk
                token_payload = json.dumps({"type": "token", "data": chunk})
                yield f"data: {token_payload}\n\n"

            # Émettre les sources uniquement si la question est pertinente et que le LLM a trouvé des réponses
            relevant_sources = filter_sources_by_relevance(request.question, sources, full_response)
            sources_payload = json.dumps({"type": "sources", "data": relevant_sources})
            yield f"data: {sources_payload}\n\n"

        except Exception as e:
            error_payload = json.dumps({"type": "error", "data": str(e)})
            yield f"data: {error_payload}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "RAG API"}

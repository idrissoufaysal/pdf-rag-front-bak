import os
from pathlib import Path
from typing import List, AsyncGenerator, Tuple, Dict, Any, Optional
from dotenv import load_dotenv

from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter


# FlashRank Reranking
from langchain_community.document_compressors import FlashrankRerank
from langchain_classic.retrievers import ContextualCompressionRetriever
load_dotenv()

# Langfuse Observability (v4)
from langfuse import observe, propagate_attributes, get_client
langfuse_handler = None
if os.getenv("LANGFUSE_HOST") and not os.getenv("LANGFUSE_BASE_URL"):
    os.environ["LANGFUSE_BASE_URL"] = os.getenv("LANGFUSE_HOST")
if os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY"):
    try:
        get_client()
        from langfuse.langchain import CallbackHandler
        langfuse_handler = CallbackHandler(
            public_key=os.getenv("LANGFUSE_PUBLIC_KEY")
        )
    except Exception as e:
        print(f"⚠️ Erreur Langfuse init: {e}")
        langfuse_handler = None

# --- Initialisation Singleton ---
embeddings = OpenAIEmbeddings(
    model="perplexity/pplx-embed-v1-0.6b",
    openai_api_key=os.getenv("OPENROUTER_KEY"),
    openai_api_base="https://openrouter.ai/api/v1",
    check_embedding_ctx_length=False
)
vector_store = Chroma(persist_directory="./.chroma_db", embedding_function=embeddings)

# 1. Base Retriever (Récupère 10 candidats larges)
base_retriever = vector_store.as_retriever(search_kwargs={"k": 10})

# 2. Reranker (Sélectionne les 3 meilleurs candidats réels)
compressor = FlashrankRerank(model="ms-marco-TinyBERT-L-2-v2", top_n=3)
retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=base_retriever
)

# Configuration du LLM : OpenRouter (modèle NVIDIA gratuit) ou fallback Groq

llm = ChatOpenAI(
        model="google/gemini-2.5-flash",
        api_key=os.getenv("OPENROUTER_KEY"),
        base_url="https://openrouter.ai/api/v1",
        temperature=0.3
    )


# Prompts
contextualize_q_prompt = ChatPromptTemplate.from_messages([
    ("system", "Étang donné un historique de discussion et la dernière question, formule une question autonome sans y répondre."),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}"),
])

history_aware_question_chain = contextualize_q_prompt | llm | StrOutputParser()

qa_prompt = ChatPromptTemplate.from_messages([
    ("system", """Tu es un assistant IA précis. Réponds à la question en t'appuyant STRICTEMENT sur le contexte ci-dessous.
Si le contexte ne contient pas l'information ou que la question est une simple salutation (ex: bonjour, salut, ok), réponds poliment sans utiliser les documents et indique que l'information n'est pas dans les documents si nécessaire.

Contexte :
{context}"""),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}"),
])
final_chain = qa_prompt | llm | StrOutputParser()


def format_docs(docs: List[Document]) -> str:
    return "\n\n---\n\n".join(doc.page_content for doc in docs)


def extract_sources_metadata(docs: List[Document]) -> List[Dict[str, Any]]:
    """Extrait les métadonnées de source propres pour l'affichage."""
    sources = []
    for doc in docs:
        source_path = doc.metadata.get("source", "Document inconnu")
        filename = Path(source_path).name
        page = doc.metadata.get("page", None)
        
        source_info = {"file": filename, "snippet": doc.page_content[:150] + "..."}
        if page is not None:
            source_info["page"] = page + 1
        
        sources.append(source_info)
    return sources


def filter_sources_by_relevance(query: str, sources: List[Dict[str, Any]], full_response: str) -> List[Dict[str, Any]]:
    """Filtre les sources si la question est du 'smalltalk' ou si le LLM indique que l'info n'est pas trouvée."""
    smalltalk_keywords = ["bonjour", "salut", "hello", "coucou", "ok", "d'accord", "merci", "thanks", "exit", "quit"]
    clean_query = query.strip().lower()

    if clean_query in smalltalk_keywords or len(clean_query) < 3:
        return []

    # Si le LLM a explicitement dit qu'il ne trouve pas l'information
    refusal_phrases = ["pas dans les documents", "pas mentionné", "ne trouve pas", "pas présent dans le contexte"]
    if any(phrase in full_response.lower() for phrase in refusal_phrases):
        return []

    return sources


# --- Ingestion ---
@observe(name="rag-ingest-file")
async def ingest_file(file_path: Path, original_filename: Optional[str] = None) -> int:
    loader = PyPDFLoader(str(file_path)) if file_path.suffix.lower() == ".pdf" else TextLoader(str(file_path), encoding="utf-8")
    raw_docs = loader.load()
    if original_filename:
        for doc in raw_docs:
            doc.metadata["source"] = original_filename
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(raw_docs)
    if not chunks:
        raise ValueError(
            "Aucun texte extractible dans ce fichier. "
            "Les PDF scannés (images) ou sans couche texte ne peuvent pas être indexés."
        )
    await vector_store.aadd_documents(chunks,)
    return len(chunks)



# --- Execution RAG avec Streaming (FastAPI) & Langfuse Callbacks ---

@observe(name="rag-query-stream")
async def run_rag_astream(query: str, chat_history: List[BaseMessage], session_id: Optional[str] = None) -> Tuple[List[Dict[str, Any]], AsyncGenerator[str, None]]:
    """Version asynchrone pour FastAPI avec streaming SSE."""
    with propagate_attributes(trace_name="rag-chat-stream", session_id=session_id):
        callbacks = [langfuse_handler] if langfuse_handler else []

        standalone_q = await history_aware_question_chain.ainvoke(
            {"input": query, "chat_history": chat_history},
            config={"callbacks": callbacks}
        ) if chat_history else query

        docs = await retriever.ainvoke(standalone_q, config={"callbacks": callbacks})
        sources = extract_sources_metadata(docs)
        context = format_docs(docs)

        async def stream_gen():
            with propagate_attributes(trace_name="rag-chat-stream", session_id=session_id):
                async for chunk in final_chain.astream(
                    {"context": context, "chat_history": chat_history, "input": query},
                    config={"callbacks": callbacks}
                ):
                    yield chunk

        return sources, stream_gen()


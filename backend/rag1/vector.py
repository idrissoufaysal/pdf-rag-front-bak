from pathlib import Path
from typing import List

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter


def load_and_split(file_path: Path) -> List[Document]:
    """Charge et découpe le document."""
    loader = PyPDFLoader(str(file_path)) if file_path.suffix == ".pdf" else TextLoader(str(file_path), encoding="utf-8")
    splitter = RecursiveCharacterTextSplitter(chunk_size=400, chunk_overlap=50)
    return splitter.split_documents(loader.load())


def create_vector_store(documents: List[Document], persist_directory: str = "./.chroma_db"):
    """Transforme les chunks en vecteurs et les persiste localement dans ChromaDB."""
    # Modèle d'embedding léger (384 dimensions), tournant 100% en local sur votre CPU
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2",)

    print("Vectorisation et indexation dans ChromaDB en cours...")
    vector_store = Chroma.from_documents(
        documents=documents,
        embedding=embeddings,
        persist_directory=persist_directory
    )
    return vector_store


if __name__ == "__main__":
    base_dir = Path(__file__).parent
    target_file = base_dir /"pdf"/"plan.pdf"

    # 1. Charger & Chunker
    docs = load_and_split(target_file)
    print(f"Total chunks à indexer : {len(docs)}")

    # 2. Créer la Vector DB
    db = create_vector_store(docs)

    # 3. Tester une recherche sémantique (Similarity Search)
    query = "c'est dans combien de jour le challenge ?"
    print(f"\n🔍 Recherche pour la question : '{query}'")
    
    results = db.similarity_search(query, k=1)  # On demande le TOP 1 chunk le plus proche

    for i, res in enumerate(results):
        print(f"\n--- Résultat {i+1} (Score Sémantique élevé) ---")
        print(res.page_content)

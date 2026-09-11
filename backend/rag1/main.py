from pathlib import Path
from typing import List

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


def load_and_split_document(
    file_path: str, chunk_size: int = 1000, chunk_overlap: int = 200
) -> List[Document]:
    """Charge un fichier (PDF ou TXT) et le découpe en chunks de texte."""
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"Le fichier {file_path} n'existe pas.")

    # 1. Sélection du Loader selon l'extension
    if path.suffix.lower() == ".pdf":
        loader = PyPDFLoader(str(path))
    else:
        loader = TextLoader(str(path), encoding="utf-8")

    raw_documents = loader.load()

    # 2. Stragétie de Chunking : RecursiveCharacterTextSplitter
    # Tente de couper dans l'ordre par : "\n\n", "\n", " ", "" pour garder du sens sémantique
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        is_separator_regex=False,
    )

    chunks = text_splitter.split_documents(raw_documents)
    return chunks


if __name__ == "__main__":
    # Dossier courant où se trouvent vos fichiers PDF
    base_dir = Path(__file__).parent
    pdf_name1 = "plan.pdf"
    pdf_name2 = "sample.txt"
    pdf_path = base_dir/"pdf"/pdf_name1

    if pdf_path.exists():
            print(f"\n--- Traitement de : {pdf_name1} ---")
            docs = load_and_split_document(str(pdf_path), chunk_size=500, chunk_overlap=50)
            print(f"Nombre de chunks générés : {len(docs)}")
            if docs:
                print(f"Aperçu du Chunk 0 :\n{docs[0].page_content[:200]}...")
                print(f"Metadata : {docs[0].metadata}")
    else:
            print(f"Fichier non trouvé : {pdf_path}")

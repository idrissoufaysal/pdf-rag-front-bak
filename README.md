# PDF RAG Monorepo (Frontend + Backend)

Monorepo pour l'application RAG (Retrieval-Augmented Generation) sur documents PDF, comprenant une interface web interactive et une API de traitement et recherche vectorielle / hybride.

## 📁 Structure du projet

```
pdf-rag-front-bak/
├── backend/
│   └── rag1/               # Service Backend RAG (FastAPI, LangChain, ChromaDB, BM25, UV)
│       ├── api.py          # Points de terminaison FastAPI (chat, upload PDF, indexation)
│       ├── rag.py          # Logique RAG, recherche hybride (EnsembleRetriever)
│       ├── pyproject.toml  # Dépendances Python (uv)
│       └── Dockerfile      # Configuration Docker
└── frontend/               # Application Frontend (Next.js 14, React, Tailwind CSS)
    ├── app/                # Pages et composants Next.js (Chat, Visualiseur PDF)
    ├── package.json        # Dépendances Node.js
    └── tsconfig.json       # Configuration TypeScript
```

---

## 🚀 Démarrage rapide

### 1. Backend (`backend/rag1`)

Le backend utilise Python et `uv` (ou `pip` / `venv`) avec FastAPI.

```bash
cd backend/rag1

# Installation des dépendances avec uv
uv sync

# Configuration de l'environnement (.env requis pour les clés d'API LLM / Embeddings)
# Lancer le serveur FastAPI
uv run python -m uvicorn api:app --reload --port 8000
```

Le backend est accessible sur `http://localhost:8000` (Documentation OpenAPI Swagger : `http://localhost:8000/docs`).

### 2. Frontend (`frontend`)

Le frontend est développé avec Next.js.

```bash
cd frontend

# Installation des dépendances
npm install
# ou yarn / pnpm

# Configuration (.env.local)
# Lancer le serveur de développement
npm run dev
```

L'application web est accessible sur `http://localhost:3000`.

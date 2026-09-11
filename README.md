# PDF RAG Monorepo (Frontend + Backend)

Monorepo pour l'application RAG (Retrieval-Augmented Generation) sur documents PDF, comprenant une interface web Next.js et une API Python FastAPI haute performance avec recherche vectorielle via ChromaDB et embeddings Perplexity (`pplx-embed-v1-0.6b`).

## 📁 Architecture du projet

```
pdf-rag-front-bak/
├── backend/
│   ├── main.py             # Point d'entrée FastAPI (endpoints: /health, /api/upload, /api/chat/stream)
│   ├── rag.py              # Moteur RAG (OpenRouter Perplexity Embeddings, ChromaDB, Flashrank, LangChain)
│   ├── pyproject.toml      # Dépendances Python (uv)
│   ├── uv.lock
│   ├── Dockerfile          # Image de conteneurisation FastAPI
│   └── docker-compose.yml  # Déploiement Docker Compose
└── frontend/               # Application Frontend (Next.js, React, Tailwind CSS)
    ├── app/
    │   ├── components/     # Chat.tsx, PDFViewer.tsx, PdfUploader.tsx
    │   ├── utils/          # config.ts (BACKEND_URL), fetchRAGResponse.ts (appels directs FastAPI)
    │   ├── page.tsx        # Vue principale
    │   └── layout.tsx
    ├── package.json        # Dépendances Node.js
    └── tsconfig.json       # Configuration TypeScript
```

---

## 🚀 Démarrage rapide

### 1. Backend (`backend`)

Le backend utilise Python 3.12 et `uv` avec FastAPI.

```bash
cd backend

# Installation des dépendances avec uv
uv sync

# Lancer le serveur FastAPI
uv run python -m uvicorn main:app --reload --port 8000
```

- API : `http://localhost:8000`
- Documentation Swagger : `http://localhost:8000/docs`
- Health check : `http://localhost:8000/health`

### 2. Frontend (`frontend`)

Le frontend est développé avec Next.js et communique directement avec l'API FastAPI.

```bash
cd frontend

# Installation des dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

- Application Web : `http://localhost:3000`

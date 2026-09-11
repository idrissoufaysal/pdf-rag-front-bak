FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Installation de uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copie des fichiers de dépendances
COPY pyproject.toml uv.lock ./

# Installation des dépendances du projet
RUN uv sync --no-cache

# Copie du reste du code source
COPY . .

EXPOSE 8000

# Commande de démarrage de l'API FastAPI avec Uvicorn
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Backend — Todo List API

FastAPI backend for the Tareas app. Managed with `uv`.

## Setup

```bash
cd backend
uv sync
cp .env.example .env  # then edit values as needed
uv run python -m app.main
```

The server listens on the host/port defined in `.env` (default `0.0.0.0:8000`).

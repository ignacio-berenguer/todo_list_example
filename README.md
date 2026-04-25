# Todo List Example

A small full-stack Tareas (to-do) manager for a family. UI is in Spanish; tasks have a description, due date, status (`pendiente` / `iniciada` / `completado`), and an assignee from a fixed list (Nacho / Gonzalo / María / Papá / Mamá). The default view is a Kanban board; a Search page is also available from the navbar.

## Stack

- **Backend** (`backend/`) — Python 3.12 + FastAPI + SQLAlchemy 2 + Pydantic v2 + uv
- **Frontend** (`frontend/`) — React 19 + Vite 7 + Tailwind 4 + TanStack Query + Axios + React Router 6 + Shadcn/ui patterns
- **Database** — SQLite at `db/todo_list.db` (schema in `db/schema.sql`, applied idempotently on backend startup)
- **Auth** — Clerk (JWT verified server-side via JWKS)
- **Logs** — `logs/task_manager_backend.log` (rotating, 5 MB × 5)

See [`specs/architecture/architecture.md`](specs/architecture/architecture.md) for the architecture overview and [`specs/features/`](specs/features/) for feature documentation.

## Prerequisites

- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- Node 20+ and npm
- A [Clerk](https://clerk.com/) application (free tier is enough)

## First-time setup

### 1. Clone and install dependencies

```bash
cd backend && uv sync && cd ..
cd frontend && npm install && cd ..
```

### 2. Get your Clerk values

In the Clerk dashboard, open your application and copy:

- **Publishable key** — `pk_test_...` or `pk_live_...` (frontend)
- **Frontend API URL** — e.g. `https://your-app.clerk.accounts.dev` (used as `CLERK_ISSUER` and as the root of `CLERK_JWKS_URL`)

In the Clerk dashboard's **Sessions → Customize session token**, leave the default settings (the JWT must include `email` if you want backend logs to record the actor; otherwise actor will appear as `None`).

### 3. Configure `.env` files

Copy the examples and fill in your values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

`backend/.env` — set at minimum:

```
CLERK_JWKS_URL=https://<your-app>.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://<your-app>.clerk.accounts.dev
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175
```

(The default `CORS_ORIGINS` already covers the typical Vite fallback ports — useful when 5173 is occupied.)

`frontend/.env`:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE_URL=http://localhost:8000
```

### 4. Add `http://localhost:5173` (and 5174/5175) as allowed origins in Clerk

Clerk dashboard → **Domains** → development host list. Add the same origins listed in `CORS_ORIGINS`.

## Running

Two terminals.

### Terminal 1 — backend

```bash
cd backend
uv run python -m app.main
```

Wait for `INFO  app.main — backend started host=0.0.0.0 port=8000`.

### Terminal 2 — frontend

```bash
cd frontend
npm run dev
```

Wait for the Vite "ready" line, then open the printed URL (typically `http://localhost:5173`). After signing in via Clerk, you land on `/kanban`.

## Useful endpoints

- `GET http://localhost:8000/health` — unauthenticated; returns `{"status":"ok"}`.
- `GET http://localhost:8000/docs` — Swagger UI (calls require a Clerk JWT pasted into the **Authorize** button).
- All `/api/tareas*` routes — Clerk-authenticated CRUD + paginated/filtered/sorted search.

## What the app does

- **Navbar** — two top-level entries, **Kanban** (default landing page) and **Búsqueda**, plus the theme toggle and Clerk user button.
- **Kanban board** (`/kanban`) — three columns (`Pendiente` → `Iniciada` → `Completada`). Each tarea is a card showing título (descripción), notas truncated to ~80 chars (full notas on hover), fecha prevista with overdue / near-due color cues, and the responsable. A **+** button per column opens the create modal with that estado pre-filled. Cards can be moved between columns and reordered within a column by drag-and-drop; changes are saved with optimistic UI and roll back on error.
- **Búsqueda page** (`/tareas`) — filter by descripción, estado, responsable, and date range; sortable columns; column picker (persisted in localStorage); pagination (10/20/50). **Crear Tarea** opens a modal.
- **Detail page** (`/tareas/:id`) — read-only view with **Editar** (modal) and **Eliminar** (confirmation dialog) buttons; **Volver** preserves the previous filters via the `?from=` query string.
- **Create / Edit modal** — descripción, fecha prevista, estado, responsable, notas. When opened in **Crear** mode, **fecha prevista** is pre-filled with today's local date; the user can still change it. Server-side validation mirrors client-side rules.
- **Delete** — available from a row in Search results and from the Detail page.

All Tareas are **shared** across signed-in users; there are no per-user lists. The Kanban order (per-column position) is also shared server-side state.

## Verification snippets

After backend changes:

```bash
cd backend && uv run python -c "from app.main import app; print('Backend OK')"
```

After frontend changes:

```bash
cd frontend && npm run build
```

## Logs

Backend writes to `logs/task_manager_backend.log` (also to console while `LOG_TO_CONSOLE=True`). Important operations log at INFO level: app startup/shutdown, schema applied, `tarea.created/updated/deleted` with the signed-in user's email. Set `LOG_LEVEL=DEBUG` in `backend/.env` for SQL-level detail.

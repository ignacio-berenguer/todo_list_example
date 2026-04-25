# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

The MVP shipped via `feature_001` exists: `backend/` (FastAPI + SQLAlchemy + uv), `frontend/` (React 19 + Vite + Tailwind 4), `db/schema.sql`, `logs/`, and a working `README.md` at the root with full setup and run instructions. Read `README.md` first for the developer-facing setup. Architecture details live in `specs/architecture/architecture.md`.

## Spec-driven workflow ("Architect First")

This project uses a strict four-stage workflow, exposed as user-invocable slash commands. **Do not jump ahead** — each stage produces artifacts the next stage depends on.

1. **`/create_feature <description>`** — scaffolds `specs/features/feature_NNN/requirements.md`. Feature numbers are zero-padded 3-digit, computed as `max(NNN across specs/features/ AND specs/features/implemented/) + 1`.
2. **`/plan_feature feature_NNN`** — reads `requirements.md`, produces `specs.md` (technical design) and `plan.md` (implementation phases). **Stop and wait for user review before coding.**
3. **`/develop_feature feature_NNN`** — only runs when all three docs (`requirements.md`, `specs.md`, `plan.md`) exist. Creates a TaskCreate task list from `plan.md` phases and executes them. Frontend and backend tasks can run in parallel via subagents when independent.
4. **`/close_feature feature_NNN`** — verifies README and `specs/architecture/architecture.md` reflect the feature, then `git mv specs/features/feature_NNN → specs/features/implemented/feature_NNN` and commits with message `Move feature_NNN to implemented`.

Key rule: a feature directory under `specs/features/` (top level) is in-progress; under `specs/features/implemented/` it is done. Both locations must be checked when computing the next feature number or looking up existing features.

When `requirements.md` still contains `[PLACEHOLDER - ...]` markers, warn the user before planning or developing — the requirements may be incomplete.

## Verification commands (post-implementation)

After backend changes:
```bash
cd backend && uv run python -c "from app.main import app; print('Backend OK')"
```

After frontend changes:
```bash
cd frontend && npm run build
```

## Run commands

Backend (FastAPI on `:8000`):
```bash
cd backend && uv run python -m app.main
```

Frontend (Vite on `:5173`, may fall back to 5174/5175 if occupied):
```bash
cd frontend && npm run dev
```

Both need their `.env` populated. See `README.md` for first-time setup including Clerk values.

## Architecture constraints to preserve

These come from `specs/architecture/architecture.md` and the feature template — apply them whenever generating new code or specs:

- **Stack is fixed:** Python 3.12 + FastAPI + SQLAlchemy 2.0 + Pydantic v2 + uv on the backend; React 19 + Vite + Tailwind 4 + TanStack Query + Axios + React Router 6 + Clerk + next-themes + lucide-react + Shadcn/ui patterns on the frontend.
- **Database:** SQLite at `db/todo_list.db`, schema DDL maintained in `db/schema.sql` (shared between modules).
- **Auth:** Clerk on both sides (backend uses PyJWT + cryptography for JWT verification).
- **UI language is Spanish** — user-facing strings in the frontend are in Spanish.
- **Configuration:** all config in a `.env` file (pydantic-settings + python-dotenv on the backend).
- **Logging:** backend writes to `logs/task_manager_backend.log` at INFO by default (level configurable via `.env`); the most important operations also log to console. Frontend logs to browser console.
- **Backwards compatibility:** every feature template includes the constraint *"existing application functionality from previous versions should be maintained as is, except for the changes in this feature."* Honor this when implementing.

When a feature changes the architecture, update `specs/architecture/architecture.md` as part of `close_feature` — that doc is the source of truth.

## Known runtime quirks worth remembering

- **Clerk env vars are intentionally optional.** `CLERK_JWKS_URL` and `CLERK_ISSUER` default to empty strings; when unset, the backend boots and `/health` works, but every `/api/tareas/*` request returns HTTP 503 `"Clerk no configurado"`. This deviates from the spec (which lists them as required) but was explicitly approved during `feature_001` so the backend can be started without credentials. Do not "fix" this back to required without checking with the user.
- **`fecha_actualizacion` is bumped Python-side** via SQLAlchemy `onupdate=datetime.utcnow`. Raw SQL `UPDATE`s won't bump it. The MVP only writes through the API, so this is fine.
- **Description search is best-effort accent-insensitive.** SQLite's `LOWER()` is ASCII-only; searching `"maria"` does not currently match a description containing `"María"`. If this becomes a real problem the fix is FTS5 or a normalized-text column.
- **Default `CORS_ORIGINS` covers 5173–5175** to handle Vite port fallback when 5173 is occupied. If you change it, also update the Clerk allowed-origins list.
- **No tests yet.** Spec §7 of `feature_001` deferred them. Adding a backend test harness (pytest + httpx + a temp SQLite file) is a natural next feature.

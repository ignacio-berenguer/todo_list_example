# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

The repository is currently **scaffolding only**: `specs/architecture/architecture.md` describes the intended stack, and `.claude/skills/` defines a spec-driven workflow, but the `backend/`, `frontend/`, `db/`, and `logs/` directories described in the architecture do not exist yet. They are created as features are developed.

There is no `README.md` at the project root yet — it will be created/updated as features land (the `close_feature` skill enforces this).

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

## Run commands (once modules exist)

Backend (Python 3.12+, FastAPI, SQLAlchemy 2.0, Pydantic v2, uv):
```bash
cd backend && uv sync && uv run python -m app.main
```

Frontend (React 19, Vite 7, Tailwind 4, npm):
```bash
cd frontend && npm install && npm run dev
```

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

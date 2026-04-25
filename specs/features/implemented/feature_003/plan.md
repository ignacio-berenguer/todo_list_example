# Implementation Plan — feature_003

## Default `fecha_prevista` to today in the "Crear tarea" form

The change is small and frontend-only. There are no parallel backend/frontend tracks to split; the work is sequential.

---

## Phase 1 — Frontend: default the date in `TareaModal`

**File:** `frontend/src/features/tareas/TareaModal.tsx`

1. Add a local helper `todayLocalISO(): string` that returns the current local calendar date as `YYYY-MM-DD` (using `getFullYear` / `getMonth` / `getDate`, **not** `toISOString`).
2. Change `emptyState(defaultEstado)` so its returned `fecha_prevista` is `todayLocalISO()` instead of the empty string.
3. Leave the `useEffect` that calls `emptyState(defaultEstado)` on open as-is — because `emptyState` is invoked there each time, today is recomputed on every open.
4. Do not change the edit branch (`fromTarea(t)`), the validation, or the submit payload construction.

**Acceptance check after Phase 1:**
- `cd frontend && npm run build` succeeds.
- Opening the create modal shows today's date pre-filled in **Fecha prevista**.
- Opening the edit modal on an existing tarea still shows that tarea's stored date.

---

## Phase 2 — Documentation

1. **`README.md`** — if there is a "Crear tarea" / usage section that documents the form fields, add a one-line note that **Fecha prevista** defaults to today. If no such section exists, no change is required.
2. **`specs/architecture/architecture.md`** — no structural change. Optionally add a one-line note in the frontend section about the create-form default if it improves clarity; otherwise leave untouched.

**Acceptance check after Phase 2:**
- `README.md` and `specs/architecture/architecture.md` accurately reflect the new behavior (or are left as-is if they did not previously document the create form).

---

## Phase 3 — Verification

1. `cd frontend && npm run build` — must pass.
2. `cd backend && uv run python -c "from app.main import app; print('Backend OK')"` — sanity check (backend not changed, but per repo convention).
3. Manual browser smoke test (per `specs.md` §5).

---

## Out-of-plan items (deferred / not done)

- No backend change.
- No `.env` change.
- No new logging — `POST /api/tareas` is already logged by the existing backend logger.
- No tests added (the repo has none yet; adding a test harness is its own future feature, per the note in `CLAUDE.md`).

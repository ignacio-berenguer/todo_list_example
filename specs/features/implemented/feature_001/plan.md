# Implementation Plan — feature_001

This plan turns `specs.md` into discrete, executable phases. Phases 3 and 4 are independent and can be developed in parallel by separate agents. Phase 5 ties them together and is the only phase that requires both modules to exist.

## Phase 0 — Repository scaffolding

**Files created**

- `db/.gitkeep`, `logs/.gitkeep`
- `db/schema.sql` (per spec §3.1)
- `README.md` (top-level, minimal: project name, links to architecture and feature folders, run instructions placeholder)

**Done when**: directories exist, `schema.sql` applies cleanly to a fresh SQLite file (`sqlite3 /tmp/test.db < db/schema.sql`).

## Phase 1 — Backend project skeleton

**Files created** (all under `backend/`)

- `pyproject.toml` (uv-managed) — dependencies: `fastapi`, `uvicorn[standard]`, `sqlalchemy>=2`, `pydantic>=2`, `pydantic-settings`, `python-dotenv`, `pyjwt[crypto]`, `cryptography`, `httpx`.
- `.python-version` (`3.12`).
- `.env.example` (per spec §4.2).
- `app/__init__.py`, `app/main.py`, `app/config.py`, `app/logging_config.py`, `app/database.py`.
- Empty package directories: `app/api/`, `app/api/routers/`, `app/auth/`, `app/models/`, `app/schemas/` (each with `__init__.py`).

**Done when**: `cd backend && uv sync && uv run python -c "from app.main import app; print('Backend OK')"` prints `Backend OK`.

## Phase 2 — Backend Tareas CRUD

**Files created/modified**

- `app/models/tarea.py` (SQLAlchemy model — spec §4.5).
- `app/schemas/tarea.py` (Pydantic schemas — spec §4.6).
- `app/auth/clerk.py` and `app/api/deps.py` (Clerk JWT verification — spec §4.7).
- `app/api/routers/tareas.py` (endpoints — spec §4.8).
- `app/main.py` updated to register the router and CORS, run `init_db()` on startup, and emit startup logs.

**Manual verification**

1. `uv run python -m app.main` starts uvicorn on `:8000`.
2. `GET /health` returns `{"status":"ok"}` without auth.
3. `GET /api/tareas` without `Authorization` → 401.
4. With a valid Clerk JWT (obtained from a quick frontend sign-in or the Clerk dashboard's session-token tool):
   - `POST /api/tareas` creates a row.
   - `GET /api/tareas` returns it.
   - `PATCH /api/tareas/{id}` updates it (verify `fecha_actualizacion` changes).
   - `GET /api/tareas?descripcion=...&estado=pendiente&page=1&page_size=10` filters correctly.
   - `DELETE /api/tareas/{id}` returns 204; subsequent `GET /api/tareas/{id}` returns 404.

**Done when**: all six manual steps pass and the log file in `logs/task_manager_backend.log` contains the corresponding INFO entries.

## Phase 3 — Frontend project skeleton  *(parallel with Phase 4)*

**Files created** (all under `frontend/`)

- `package.json` (npm) — dependencies: `react`, `react-dom`, `react-router-dom@6`, `@tanstack/react-query`, `axios`, `@clerk/clerk-react`, `next-themes`, `lucide-react`, `tailwindcss@4`, `@tailwindcss/vite`, `class-variance-authority`, `clsx`, `tailwind-merge`. Dev: `vite@7`, `typescript`, `@types/*`, `eslint`, `@vitejs/plugin-react`.
- `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `index.html`.
- `.env.example` (per spec §5.2).
- `src/main.tsx`, `src/App.tsx` with provider tree (Clerk → QueryClient → Router → Theme).
- `src/lib/api.ts`, `src/lib/queryClient.ts`, `src/lib/format.ts`.
- `src/components/ui/` Shadcn-style primitives: `button.tsx`, `input.tsx`, `select.tsx`, `dialog.tsx`, `table.tsx`, `badge.tsx`, `label.tsx`, `textarea.tsx`, `dropdown-menu.tsx`, `checkbox.tsx`.
- `src/components/layout/Header.tsx`.
- `src/routes/SignInPage.tsx` (Clerk's `<SignIn />`).

**Done when**: `cd frontend && npm install && npm run build` succeeds, and `npm run dev` boots a working sign-in page.

## Phase 4 — Frontend Tareas feature  *(parallel with Phase 3 once skeleton exists)*

This phase depends on Phase 3 being far enough along that the provider tree, axios client, and ui primitives exist. It does **not** require Phase 2 to be running — mock the API at the axios layer if necessary, then swap to real calls in Phase 5.

**Files created/modified**

- `src/features/tareas/types.ts` — TypeScript types matching the Pydantic schemas.
- `src/features/tareas/constants.ts` — `RESPONSABLES`, `ESTADOS`, `COLUMNAS`.
- `src/features/tareas/api.ts` — TanStack Query hooks (spec §5.5).
- `src/features/tareas/TareaFilters.tsx`.
- `src/features/tareas/TareaTable.tsx`.
- `src/features/tareas/TareaColumnPicker.tsx`.
- `src/features/tareas/TareaModal.tsx`.
- `src/features/tareas/DeleteConfirmDialog.tsx`.
- `src/hooks/useColumnPreferences.ts`.
- `src/routes/SearchPage.tsx`, `src/routes/DetailPage.tsx`.
- Router wiring in `src/App.tsx`.

**Manual verification (against mocks or real backend)**

1. Sign-in redirects to `/tareas`.
2. Filter form: typing in `descripción`, selecting `estado` and `responsable`, picking a date range, then **Buscar** updates the URL and the table.
3. **Limpiar filtros** clears the URL params.
4. Column picker toggles visibility; reload preserves it (localStorage).
5. Pagination controls (page navigation + page-size selector 10/20/50) work and round-trip via the URL.
6. **Crear Tarea** opens the modal; submitting creates a row that appears in the list.
7. Per-row "Detalle" navigates to `/tareas/:id?from=...`.
8. Per-row "Editar" opens the modal prefilled; saving keeps the user on Search and updates the row in place.
9. Per-row "Eliminar" opens confirmation; confirming removes the row.
10. On Detail: **Editar** keeps user on Detail post-save; **Eliminar** returns to Search; **Volver** restores previous filters via `?from=`.

**Done when**: `npm run build` succeeds and the manual steps pass against mocks (or the real backend if Phase 5 already happened).

## Phase 5 — Integration

- Configure both `.env` files with matching `CORS_ORIGINS`, Clerk keys, and API base URL.
- Run backend (`:8000`) and frontend (`:5173`) together.
- Re-run the Phase 4 manual steps end-to-end against the live backend.
- Verify backend logs contain `tarea.created`, `tarea.updated`, `tarea.deleted` entries with the signed-in user's email.

## Phase 6 — Documentation

- Update `README.md` with: stack overview, setup instructions for backend and frontend (including `.env` setup and Clerk key acquisition), and run commands.
- `specs/architecture/architecture.md` already describes the target stack accurately, but if any deviations were made during implementation, capture them there.
- Verify CLAUDE.md remains accurate (no scaffolding-only language now that the modules exist).

## Phase ordering and parallelism

```
Phase 0 ──► Phase 1 ──► Phase 2 ────────────┐
                                            ├──► Phase 5 ──► Phase 6
       └─► Phase 3 ──► Phase 4 ─────────────┘
```

Phase 1 must finish before Phase 2 (same module). Phases 1/2 are independent of Phases 3/4 and can run on parallel agents. Phase 5 needs both branches to be feature-complete.

## Risks / open questions

- **Clerk credentials**: development requires a Clerk application; the user will need to provide publishable & secret/JWKS-related values into the `.env` files. If these are not yet available, Phase 5 verification is blocked even though Phases 1–4 can complete.
- **Accent-folding search**: `LOWER(...) LIKE` won't fold accents. If the user reports that searching `"maria"` should match a description containing `"María"`, we'll need FTS5 or a normalized-text column.
- **`fecha_actualizacion`** is set on the Python side via `onupdate=datetime.utcnow`. This means raw-SQL updates would not bump it; for the MVP only the API touches the table, so this is acceptable.

# Implementation Plan — feature_002 (Kanban board)

Phases are ordered to keep the app working at every step. Backend phases land first so the frontend can develop against real endpoints. Phases 4–6 (frontend) can run in parallel with each other once Phase 3 is done.

Each phase lists deliverables and how to verify it. Verification commands come from `CLAUDE.md`:
- Backend: `cd backend && uv run python -c "from app.main import app; print('Backend OK')"`
- Frontend: `cd frontend && npm run build`

## Phase 1 — Database schema & migration

**Goal:** support `iniciada` estado and `orden` column on existing and fresh databases.

**Tasks:**
1. Update `db/schema.sql`:
   - Extend the `estado` CHECK to `('pendiente', 'iniciada', 'completado')`.
   - Add `orden INTEGER NOT NULL DEFAULT 0`.
   - Note: the new `idx_tareas_estado_orden` index is **not** declared in `schema.sql`. `executescript(ddl)` runs before the migration helper, so on an upgrade an index referencing `orden` would fire before the column exists. The migration helper creates the index unconditionally (step 3 below), which covers both fresh installs and upgrades. A comment in `schema.sql` records the pointer.
2. Add an idempotent migration helper `_migrate_tareas_v2()` invoked from `init_db()` in `backend/app/database.py`:
   - Check for `orden` column via `PRAGMA table_info(tareas)`. If missing, `ALTER TABLE` to add it, then backfill `orden` per estado using `ROW_NUMBER() OVER (PARTITION BY estado ORDER BY fecha_prevista, id) - 1`.
   - Inspect the stored CHECK on `tareas.estado` (read `sqlite_master.sql` for the table). If `'iniciada'` is missing, perform the SQLite 12-step rebuild: rename `tareas` → `tareas_old`, create new `tareas` with the updated CHECK + `orden`, copy rows, drop `tareas_old`, recreate all indexes.
   - Always ensure `idx_tareas_estado_orden` exists (this is the sole creation site for the new index).
   - Log each step at INFO with row counts.

**Verify:**
- Delete any local `db/todo_list.db` and run the backend; schema applies cleanly. Re-run; idempotent.
- With an existing pre-migration DB, run the backend; verify `orden` populated, CHECK includes `iniciada`, no data lost.
- `cd backend && uv run python -c "from app.main import app; print('Backend OK')"` passes.

## Phase 2 — Backend models, schemas, and existing endpoints

**Tasks:**
1. `backend/app/models/tarea.py`: add `orden: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")`.
2. `backend/app/schemas/tarea.py`:
   - Update `EstadoEnum` to `Literal["pendiente", "iniciada", "completado"]`.
   - Add `orden: int` to `TareaRead`.
   - Add `orden: int | None = None` to `TareaCreate` and `TareaUpdate`.
3. `backend/app/api/routers/tareas.py`:
   - On `POST /api/tareas`: when `orden` is `None`, assign `max(orden) + 1` within the destination column (single transaction; use `with_for_update()` not needed on SQLite, but wrap in a transaction for atomicity).
   - On `PATCH /api/tareas/{id}`: allow updating `orden` (no neighbor resequencing — that's the reorder endpoint's job).
   - The `estado` filter on `GET /api/tareas` automatically accepts `iniciada` via the schema change.

**Verify:**
- Backend boots cleanly.
- `curl -H "Authorization: Bearer ..." http://localhost:8000/api/tareas` returns items with an `orden` field.
- Creating a tarea with no `orden` produces a sensible value (max+1 in its column).

## Phase 3 — Backend reorder endpoint

**Tasks:**
1. Add `TareaReorderColumn` and `TareaReorderRequest` Pydantic schemas.
2. Add `POST /api/tareas/reorder` to `tareas.py`:
   - Validate: every ID exists; no ID appears twice across columns; every `estado` is in the allowed set.
   - Apply within a single SQLAlchemy transaction: for each `column.ordered_ids`, set `(estado, orden)` to `(column.estado, idx)` for `idx, id in enumerate(column.ordered_ids)`.
   - Return `204 No Content`. On validation error → `400`. On DB integrity error → `409 Conflict`.
   - Log INFO with affected count and column transitions.

**Verify:**
- Manually invoke with a payload that moves IDs across two columns; confirm DB reflects the new sequence and no `orden` gaps.
- Invalid payload (duplicate ID, unknown estado, missing ID) returns the expected error code.
- Backend smoke check still passes.

## Phase 4 — Frontend foundation (constants, types, library install)

**Tasks:**
1. `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` inside `frontend/`.
2. Update `frontend/src/features/tareas/types.ts`:
   - `Estado = "pendiente" | "iniciada" | "completado"`.
   - Add `orden: number` to the `Tarea` type and any related shapes.
3. Update `frontend/src/features/tareas/constants.ts` `ESTADOS` to include `iniciada` between the other two; update label of `completado` to `"Completada"`.
4. Update `frontend/src/lib/format.ts` `ESTADO_LABEL` accordingly.
5. Add `useReorderMutation` to `frontend/src/features/tareas/api.ts`:
   - `POST /api/tareas/reorder`.
   - `onMutate`: snapshot, optimistic update of the `["tareas"]` cache.
   - `onError`: restore snapshot.
   - `onSettled`: invalidate `["tareas"]`.

**Verify:**
- `cd frontend && npm run build` passes (TypeScript clean, Vite builds).
- The existing list view still loads, the estado dropdown shows three options, "Completada" label is shown for previously-completado rows.

## Phase 5 — Navbar & routing

**Tasks:**
1. Convert `frontend/src/components/Header.tsx` (or wherever the header lives) into a navbar:
   - Left/center: brand + two `NavLink`s — **Kanban** (`/kanban`), **Búsqueda** (`/tareas`).
   - Active styling via `NavLink`'s `isActive` (e.g. underline + font-weight).
   - Right: theme toggle + Clerk `UserButton`, unchanged.
2. Update `frontend/src/App.tsx`:
   - Add a route `/kanban` → `KanbanPage` (placeholder component for now if needed).
   - Change the root (`/`) redirect from `/tareas` → `/kanban`.
   - Change the catch-all redirect to `/kanban`.

**Verify:**
- After login, the user lands on `/kanban`.
- Both navbar entries route correctly; the active one is visually distinct.
- `/tareas` still works when typed directly.
- `npm run build` passes.

## Phase 6 — Kanban page (frontend, no DnD yet)

**Tasks:**
1. Create `frontend/src/routes/KanbanPage.tsx`:
   - Calls `useTareasQuery({ page: 1, page_size: 50 })`.
   - Groups items by `estado`. Sorts each group by `orden` (ascending) client-side.
   - Renders three `KanbanColumn`s in fixed order: pendiente, iniciada, completado.
   - Loading / error states reuse existing patterns.
2. Create `KanbanColumn.tsx`:
   - Props: `estado`, `tareas`.
   - Header: estado label, count badge, "+" button.
   - Body: vertical list of `KanbanCard`.
   - Drop zone styling (handled in Phase 7).
3. Create `KanbanCard.tsx`:
   - Props: `tarea`.
   - Layout from spec §5.5.
   - `notas` truncation to 80 chars + ellipsis; `title` attribute holds full text.
   - Overdue / near-due badge logic per spec §6.2.
4. Wire the "+" button to open `TareaModal` in create mode with `defaultEstado` set to the column's estado. Add the `defaultEstado?: Estado` prop to `TareaModal`.
5. Wire `onClick` on each card to open `TareaModal` in edit mode (existing behavior parameter).

**Verify:**
- `/kanban` shows three columns with cards distributed by estado.
- Cards display título (descripcion), 80-char truncated notas, fecha_prevista with badges, responsable.
- Clicking "+" in any column opens the modal with that estado pre-selected; saving creates a card that appears in the right column.
- Clicking a card opens the edit modal.
- `npm run build` passes.

## Phase 7 — Drag-and-drop integration

**Tasks:**
1. Wrap `KanbanPage` in `DndContext` with a `PointerSensor` configured with `activationConstraint: { distance: 5 }` (so a click is not interpreted as a drag).
2. Each column wraps its card list in `SortableContext` with `verticalListSortingStrategy`.
3. `KanbanCard` uses `useSortable({ id: tarea.id })`, applying the transform to its style.
4. Implement `onDragEnd`:
   - Determine source column, destination column, and destination index.
   - Compute the new `ordered_ids` arrays for the affected column(s).
   - Call `useReorderMutation` with the appropriate payload.
   - The mutation's `onMutate` writes the optimistic cache update; `onError` rolls back; `onSettled` invalidates.
5. Add visual cues: dragged card has elevated shadow; drop zones (column bodies) get a subtle highlight during a drag.
6. Empty-column drop: the column body has a `min-height` so it remains a valid drop target when empty.

**Verify:**
- Drag a card from Pendiente to Iniciada → it appears in Iniciada immediately. Refresh → still there.
- Reorder a card within a column → order persists across refresh.
- Stop the backend, drag a card → optimistic update happens, then rolls back when the mutation fails; an error is logged in the console.
- Drag into an empty column → works.
- Plain click (no drag) opens the edit modal as before.
- `npm run build` passes.

## Phase 8 — Documentation

**Tasks:**
1. Update `README.md`:
   - Mention the Kanban as the default view, the new `iniciada` estado, and the navbar with Kanban + Búsqueda.
   - Update any "What you can do" / feature-list section.
   - No env-var changes to document (none added).
2. Update `specs/architecture/architecture.md`:
   - Note the addition of `@dnd-kit/*` to the frontend stack.
   - Note the `orden` column on `tareas` and the per-estado ordering invariant.
   - Note the new `POST /api/tareas/reorder` endpoint.
   - Estado now has three values; document them.

**Verify:**
- README accurately describes how to use the app.
- Architecture doc reflects current state.

## Phase 9 — Final smoke pass

**Tasks:**
- Boot backend and frontend together.
- Walk through: login → land on Kanban → create one tarea per column → drag between columns → reorder within a column → open `/tareas` and verify list still works → search filters still work → estado filter offers `iniciada`.
- Confirm logs in `logs/task_manager_backend.log` show the reorder INFO entries.

## Risk register

| Risk | Mitigation |
|------|------------|
| Migration breaks an existing local DB. | Idempotent migration with row-count logging; tested by running against a pre-migration DB before merging. |
| dnd-kit click-vs-drag disambiguation feels off. | Tunable `activationConstraint.distance` (start at 5px); verify on touchscreen if available. |
| Optimistic cache update drifts from server truth on error. | `onError` restores the exact pre-mutation snapshot; `onSettled` always refetches. |
| `descripcion`-as-title is confusing for future readers. | Field-mapping table is in `specs.md` §2 and re-stated in the Kanban card component as a comment. |

## Dependencies between phases

- **1 → 2 → 3:** sequential (each builds on the previous backend layer).
- **4 depends on 3:** the reorder hook needs the endpoint.
- **5, 6 can run in parallel after 4** (different files).
- **7 depends on 4 and 6.**
- **8, 9 are last.**

## Closing notes (post-implementation)

- All 9 phases shipped. Backend boots cleanly; frontend builds.
- One notable deviation from the original draft: `idx_tareas_estado_orden` was moved out of `db/schema.sql` and into the migration helper because `executescript(ddl)` runs before the migration, so on an upgrade the index would have been created against a `tareas` table that lacked the `orden` column. The migration creates the index idempotently for both fresh installs and upgrades.
- The transient `activeId` state in `KanbanPage` (drafted in §5.6 of `specs.md` for visual feedback) was dropped in favor of dnd-kit's built-in `useSortable` / `isDragging` styling — it was dead state.
- No new tests were added; the project still has no test harness (see `specs.md` §9).

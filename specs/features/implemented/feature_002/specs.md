# Technical Specification — feature_002 (Kanban board)

This document translates `requirements.md` into concrete technical decisions. Read it together with `requirements.md` and `specs/architecture/architecture.md`.

## 1. Overview

Add a Kanban view of the existing `tareas` collection with three columns (Pendiente / Iniciada / Completada), per-column "create" action, and drag-and-drop for both column changes and intra-column reordering. Replace the existing list view as the default landing page; expose a top-level navbar with **Kanban** and **Búsqueda** entries.

## 2. Field-mapping decisions (read first)

The requirements use UX-oriented labels (Título, Descripción, Persona). The current data model already covers all of them — **no new tarea fields will be added** for this purpose. The mapping is:

| Card label (requirements) | DB / model field          | Notes                                                  |
|---------------------------|---------------------------|--------------------------------------------------------|
| Título                    | `descripcion` (varchar 500, required) | The single short label of a tarea today. Used as the card heading. |
| Descripción truncada      | `notas` (text, nullable)  | Truncated to ~80 chars with ellipsis on the card. Full text on hover (title attribute) and in the edit modal. |
| Fecha límite              | `fecha_prevista` (date, required) | Visual cue rules in §6.2.                       |
| Persona                   | `responsable` (varchar 20, required, CHECK-constrained) | Already a closed enum — reused as-is. |

**No new "persona" column is added** (requirements explicitly allowed this if an equivalent already existed). This must be confirmed during review; if a *separate* persona field is ever wanted later, it is an independent feature.

## 3. Data model changes

### 3.1 New estado value

Add `iniciada` (lowercase, feminine, consistent with the `completado` casing convention) as the third allowed `estado`.

- **DB CHECK:** `estado IN ('pendiente', 'iniciada', 'completado')`
- **Pydantic Literal:** `Literal["pendiente", "iniciada", "completado"]`
- **Display labels** (Spanish, feminine — `tarea` is feminine):
  - `pendiente`  → "Pendiente"
  - `iniciada`   → "Iniciada"
  - `completado` → **"Completada"** (replaces the current label "Completado"; underlying DB value `completado` is unchanged so existing rows keep working)

### 3.2 New ordering column

Add `orden INTEGER NOT NULL DEFAULT 0` to `tareas`.

- **Semantics:** ordering is **scoped per estado** (per Kanban column). Two tareas with different `estado` may share the same `orden`; two tareas in the same column must have distinct `orden` values within a contiguous 0..N-1 sequence.
- **Default for existing rows:** during migration, every tarea is assigned an `orden` equal to its position when sorted by `(fecha_prevista ASC, id ASC)` within its current estado, starting from 0.
- **Index:** `idx_tareas_estado_orden` on `(estado, orden)` to support efficient column reads.

### 3.3 Schema file & migration

`db/schema.sql` is the source-of-truth for fresh installs and is loaded on every backend startup via `init_db()` (`backend/app/database.py:64`). Since `CREATE TABLE IF NOT EXISTS` does not alter existing tables, an upgrade path for existing DBs is also required.

Decisions:

- **`db/schema.sql`** is updated to the new shape: `iniciada` in the CHECK and `orden` column with `NOT NULL DEFAULT 0`. This handles fresh installs. The new `idx_tareas_estado_orden` index is **not** declared here because `executescript(ddl)` runs before the migration; on an upgrade, the index would otherwise be created against a `tareas` table that does not yet have an `orden` column. A comment in `db/schema.sql` points to the migration helper.
- **Programmatic migration** in `init_db()` → `_migrate_tareas_v2()` (in `backend/app/database.py`), runs after `executescript(ddl)`, idempotent:
  1. If `orden` column missing on `tareas` → `ALTER TABLE tareas ADD COLUMN orden INTEGER NOT NULL DEFAULT 0`, then backfill per §3.2 using `ROW_NUMBER() OVER (PARTITION BY estado ORDER BY fecha_prevista, id) - 1`.
  2. If the stored CHECK on `tareas.estado` does not include `'iniciada'` (detected by inspecting `sqlite_master.sql`) → perform the standard SQLite 12-step rebuild: rename old table, create new table with the updated CHECK + `orden`, copy rows over, drop old table, recreate indexes.
  3. Always `CREATE INDEX IF NOT EXISTS idx_tareas_estado_orden ON tareas(estado, orden);` — this is the sole creation site for the index, covering both fresh installs and upgrades.

Migration is logged at INFO with row-count changes per step. No external migration framework is introduced.

## 4. Backend API changes

### 4.1 Existing endpoints — diffs only

- `GET /api/tareas` — `estado` filter accepts `iniciada` in addition to existing values. Response items now include `orden`. Default sorting is unchanged. (No breaking change; new field is additive.)
- `POST /api/tareas` — request body may include `orden` (optional). When omitted, server assigns `orden = max(orden) + 1` within the destination column (atomic in a single transaction). Response includes `orden`.
- `PATCH /api/tareas/{id}` — accepts `orden` and the new `estado` value. Important: a single PATCH that changes only one card's `orden`/`estado` does **not** resequence neighbors; for that, use the bulk reorder endpoint (§4.2).
- `GET /api/tareas/{id}` and `DELETE /api/tareas/{id}` — unchanged except response includes `orden` where applicable.

### 4.2 New endpoint: bulk reorder

`POST /api/tareas/reorder`

Used by the frontend to atomically persist a drag-and-drop result. The frontend sends the **complete, post-move ordering of every card in the affected column(s)** so the server can write a clean 0..N-1 sequence without negotiating deltas.

Request body:

```json
{
  "columns": [
    { "estado": "iniciada",   "ordered_ids": [42, 17, 8, 91] },
    { "estado": "pendiente",  "ordered_ids": [3, 11] }
  ]
}
```

Semantics:
- Each entry in `columns` rewrites both `estado` and `orden` for the listed tarea IDs. Card IDs may move between columns just by appearing in a different column's `ordered_ids` than they were in before.
- Server validates: every ID exists, every ID appears at most once across all `columns`, every `estado` is in the allowed set.
- Server writes within a single SQLAlchemy transaction. On failure → rollback, return `409 Conflict` with reason; the frontend uses this to roll back its optimistic UI.
- Response: `204 No Content` on success.
- Auth: `require_user` (Clerk), same as other endpoints.
- Logged at INFO with affected ID count and column transitions.

This endpoint is only used by the Kanban; the existing list view continues to use `PATCH` for individual edits.

### 4.3 Pydantic schemas

- `EstadoEnum` extended to `Literal["pendiente", "iniciada", "completado"]`.
- `TareaBase` / `TareaRead` gain `orden: int` (read-only on Base; defaulted on Create).
- `TareaCreate.orden: int | None = None` (server fills if absent).
- `TareaUpdate.orden: int | None = None`.
- New `TareaReorderRequest` and `TareaReorderColumn` schemas for §4.2.

## 5. Frontend changes

### 5.1 Routing & navigation

- `App.tsx`: add route `/kanban` rendering `KanbanPage`. Change root redirect from `/tareas` → **`/kanban`**. Keep `/tareas` route reachable by URL but remove from navigation.
- Catch-all `*` redirects to `/kanban`.
- `Header.tsx` becomes a **navbar** with two links: **Kanban** (`/kanban`) and **Búsqueda** (`/tareas`). Active link is styled (e.g. underline + bolder weight using existing Tailwind tokens). Theme toggle and Clerk `UserButton` stay on the right.

### 5.2 New library

Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` to `frontend/package.json`. Rationale: actively maintained, React 19 compatible, no longer requires `StrictMode` opt-outs. No keyboard a11y is in scope (per requirements), but the library supports it natively if added later.

### 5.3 KanbanPage — structure

`frontend/src/routes/KanbanPage.tsx` (or under `features/tareas/`):

- Fetches **all tareas** in a single query: reuse `useTareasQuery` with `page_size=50` and a sort of `(orden ASC)` once `orden` is exposed as a `sort` value, OR (simpler MVP) fetch unsorted at `page_size=50` and sort client-side by `orden`. Decision: **client-side sort** for MVP — the dataset is tiny and avoids backend sort-field plumbing.
- Groups results by `estado`. Renders a `KanbanColumn` for each of the three estados in the order Pendiente → Iniciada → Completada.
- Loading and error states reuse the existing patterns from `SearchPage`.

### 5.4 KanbanColumn

- Header: estado label, count badge, **"+"** icon button.
- Body: vertical list of `KanbanCard` components (sortable via dnd-kit `SortableContext`).
- Drop target: the entire column body (so cards can be dropped into empty columns).
- Click on "+" opens the existing `TareaModal` in **create mode** with `estado` pre-filled to that column's estado. After save, TanStack Query invalidates `["tareas"]` (mutation already does this) and the new card appears.

### 5.5 KanbanCard

Renders, in this layout:

```
┌──────────────────────────────────────┐
│ {Título}                              │
│ {Descripción truncada – ~80 chars}    │
│                                       │
│ 📅 {Fecha límite}    👤 {Persona}    │
└──────────────────────────────────────┘
```

- **Título** ← `descripcion`. Bold, single line, truncate with ellipsis if very long.
- **Descripción truncada** ← `notas`, slice to 80 chars + "…". Full `notas` available via the `title` HTML attribute (native tooltip). If `notas` is null/empty, render nothing in that slot.
- **Fecha límite** ← formatted with `formatDate`. Visual cue:
  - Overdue (date < today, estado ≠ completado) → red badge.
  - Due within 2 calendar days (date ≤ today + 2, estado ≠ completado) → amber badge.
  - Otherwise → muted text, no badge.
  - For estado = `completado`, never highlight as overdue.
- **Persona** ← `responsable`, plain text with a `lucide-react` user icon.
- The card itself is the drag handle. Clicking the card (without dragging) opens `TareaModal` in **edit mode** for that tarea. Use dnd-kit's distance-based activation (`activationConstraint: { distance: 5 }`) to disambiguate click from drag.

### 5.6 Drag-and-drop behavior

- Library: dnd-kit. Use `DndContext` at the page level wrapping all three columns; `SortableContext` per column with `verticalListSortingStrategy`.
- On drop:
  1. Compute the new ordering of the affected column(s) locally.
  2. Optimistically update the TanStack Query cache for `["tareas", ...]` with the new `estado`/`orden` values.
  3. Call `useReorderMutation` → `POST /api/tareas/reorder` with both affected columns (or a single column for intra-column moves).
  4. On success: cache stays. On error: roll back the cache to the pre-drop snapshot and surface a toast/inline error (reuse existing error-rendering pattern from `SearchPage`).
- Card position during drag uses dnd-kit's `useSortable` transform; the dragged card renders with elevated shadow.

### 5.7 Constants & helpers

Update `frontend/src/features/tareas/constants.ts`:

```ts
export const ESTADOS: { value: Estado; label: string }[] = [
  { value: "pendiente",   label: "Pendiente" },
  { value: "iniciada",    label: "Iniciada" },
  { value: "completado",  label: "Completada" },
];
```

Update `frontend/src/lib/format.ts` `ESTADO_LABEL`:

```ts
export const ESTADO_LABEL: Record<string, string> = {
  pendiente:  "Pendiente",
  iniciada:   "Iniciada",
  completado: "Completada",
};
```

Update `frontend/src/features/tareas/types.ts` `Estado` union to include `"iniciada"` and the `Tarea` type to include `orden: number`.

### 5.8 New TanStack Query hook

`useReorderMutation` in `frontend/src/features/tareas/api.ts`:
- POST `/api/tareas/reorder` with the columns body.
- `onMutate`: snapshot `["tareas"]` cache, write optimistic update.
- `onError`: restore snapshot.
- `onSettled`: `invalidateQueries(["tareas"])`.

## 6. UX details & edge cases

### 6.1 Empty columns

A column with zero tareas still renders its header, "+" button, and a tall enough drop zone (min-height ~160px) to accept drops.

### 6.2 Overdue / near-due badge thresholds

- Computed against the local timezone date (via existing `formatDate` parsing logic).
- `near-due` window: ≤ 2 days from today, inclusive of today.
- `overdue`: strictly before today.
- Both are suppressed when `estado === "completado"`.

### 6.3 Modal pre-fill from column

Add a `defaultEstado?: Estado` prop to `TareaModal`. When `defaultEstado` is provided **and** the modal is in create mode, the `estado` form field initializes to that value but remains user-editable.

### 6.4 Race between drag and refetch

If a refetch lands while an optimistic drag is in flight, prefer the optimistic state until the mutation settles. Implementation: pause invalidations during the mutation by using `onMutate`/`onSettled` to manage a generation counter, OR (simpler) call `cancelQueries(["tareas"])` in `onMutate` and only re-invalidate in `onSettled`.

### 6.5 Concurrent reorder

Single-user app. Last write wins; no special locking.

### 6.6 Existing list view (`/tareas`)

- Stays functional.
- Its create modal should also default the new estado options.
- The list view's estado dropdown gets the new "Iniciada" option automatically via the updated `ESTADOS` constant.
- The list view's `Estado` filter accepts `iniciada` via the same change.
- The list view does **not** display the `orden` column.

## 7. Logging

- Backend: log at INFO when a reorder succeeds, including the count of affected tareas and the involved estados. Migration steps log at INFO. Errors at ERROR.
- Frontend: log to console on optimistic rollback (i.e. a reorder API failure) with the offending response.
- No new env vars required for logging.

## 8. Configuration

No new `.env` variables. Existing `LOG_LEVEL`, `LOG_FILE`, `CORS_ORIGINS`, etc. continue to apply.

## 9. Out of scope

- Keyboard accessibility for drag-and-drop.
- Multi-user concurrent edits / conflict resolution.
- Per-user / per-device personalization of column ordering.
- A separate `persona` field distinct from `responsable`.
- Tests (the project has none; adding a test harness is a separate feature).

## 10. Backwards compatibility

- Existing `/tareas` route, list page, search filters, and detail page continue to work.
- Existing `pendiente` and `completado` rows are untouched; their `orden` is backfilled deterministically.
- The label change from "Completado" to "Completada" is a UI-only change; the underlying enum value remains `completado`, so all existing data, URLs, and API contracts continue to work.

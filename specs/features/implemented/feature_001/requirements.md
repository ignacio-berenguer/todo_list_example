# Requirements Prompt for feature_001

I have a new feature request. Follow the "Architect First" protocol: create spec.md and plan.md before writing code. Notify me when the documents are ready.

Please create a './specs/features/feature_001/specs.md' and './specs/features/feature_001/plan.md' in order to do that.

## Feature Brief

I want to create a simple "to do" app. It should manage Tareas that will have descripción, fecha prevista, estado (pendiente, completado), responsable (Nacho, Gonzalo, María, Papá, Mamá). The application should have a Search page with a filter section and search results. From the search results it should be possible to access a Detail page. In the Search page there should be a "Crear Tarea" button. From the Detail page or the Search results it should be possible to Edit a Tarea.

## User Story

As a user, I want to manage a shared list of Tareas — creating, searching, viewing, editing, and deleting them — so my family (Nacho, Gonzalo, María, Papá, Mamá) can track what needs to be done, who is responsible, and by when.

## Key Requirements

### Requirement 1: Tarea data model

A Tarea has the following fields:

- **id** — primary key (integer, auto-increment).
- **descripción** — free-text description, `VARCHAR(500)`. Required.
- **fecha_prevista** — planned date (DATE). Required.
- **estado** — enum, one of `pendiente` or `completado`. Default `pendiente`.
- **responsable** — enum, one of `Nacho`, `Gonzalo`, `María`, `Papá`, `Mamá`. Required.
- **notas** — free-text, optional (TEXT).
- **fecha_creacion** — TIMESTAMP, set on insert.
- **fecha_actualizacion** — TIMESTAMP, set on insert and updated on every modification.

### Requirement 2: Search page

The Search page is the entry point of the application and must contain:

- **Filter section** with the following fields:
  - `descripción` — text search (case-insensitive substring match).
  - `estado` — selector (`pendiente` / `completado` / cualquiera).
  - `responsable` — selector (Nacho / Gonzalo / María / Papá / Mamá / cualquiera).
  - `fecha_prevista` — **date range** with two pickers: `desde` and `hasta` (either bound optional).
  - Results **do not auto-refresh**. A **"Buscar"** button applies the filters. A **"Limpiar filtros"** button resets them.

- **Search results** — a table of matching Tareas:
  - **Default columns:** `descripción`, `fecha_prevista`, `estado`, `responsable`.
  - **Column picker:** users can show/hide columns from the full set (`descripción`, `fecha_prevista`, `estado`, `responsable`, `notas`, `fecha_creacion`, `fecha_actualizacion`). Selection persists in localStorage.
  - **Default sort:** `fecha_prevista` ascending; column-header click toggles sort.
  - **Pagination:** server-side, default page size **20**, selector for **10 / 20 / 50**.
  - **Empty state copy:** "No hay tareas que coincidan con los filtros."
  - **Per-row actions:** open Detail, open Edit modal, delete (with confirmation dialog).

- A **"Crear Tarea"** button opens a **modal form** for creation.

### Requirement 3: Detail page

A read-only page (route: `/tareas/:id`) showing all fields of a single Tarea, including `notas`, `fecha_creacion`, and `fecha_actualizacion`.

- Provides an **"Editar"** button that opens the **Edit modal**.
- Provides an **"Eliminar"** button that triggers a confirmation dialog and deletes the Tarea (on success, navigates back to the Search page).
- Provides a "Volver" link back to the Search page (preserving the previous filters via URL query string).

### Requirement 4: Create / Edit Tarea

Both Create and Edit happen in a **modal form**.

- The modal exposes all editable fields: `descripción`, `fecha_prevista`, `estado`, `responsable`, `notas`. (`id`, `fecha_creacion`, `fecha_actualizacion` are not editable.)
- **No quick-toggle for `estado`** in the Search results — every change goes through the edit modal.
- **Validation:** `descripción` (required, ≤500 chars), `fecha_prevista` (required, valid date), `estado` and `responsable` (required, must be one of the allowed enum values).
- **Post-save behavior:** the modal closes and the user **stays on the page where the modal was launched** (Detail stays on Detail, Search stays on Search with the affected row refreshed in place).
- **Delete** is reachable from the Search row AND from the Detail page (both with a confirmation dialog).

### Requirement 5: Authentication

- Clerk-based authentication on backend and frontend (per architecture).
- **All Tareas are shared** across authenticated users — there is a single family list. Any authenticated user can create, edit, or delete any Tarea.

### General Requirements

- The architecture should follow the file specs/architecture/architecture.md
- Update the README.md document after all the changes are done.
- Update the architecture doc (specs/architecture/architecture.md) after all the changes are done.
- All the configuration needed should be stored in a .env file
- All the operations should be logged to a log file configured in .env file. The default debugging level will be INFO but it can be changed in the .env file
- The most important operations will be also logged to the console

## Constraints

- The existing application functionality from previous versions should be maintained as is, except for the changes in this feature.
- UI language is Spanish (per the architecture document).
- Backend stack: Python 3.12 + FastAPI + SQLAlchemy 2.0 + Pydantic v2 + uv. Frontend stack: React 19 + Vite + Tailwind 4 + TanStack Query + Axios + React Router 6 + Clerk + Shadcn/ui patterns.
- Database: SQLite at `db/todo_list.db`, schema DDL maintained in `db/schema.sql`.

## Final instructions

Analyze the current codebase and let me know when the docs are ready for review. Do not start making any modifications to the code until I review the documents and explicitly say so.

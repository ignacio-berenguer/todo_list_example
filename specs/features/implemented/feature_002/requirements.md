# Requirements Prompt for feature_002

I have a new feature request. Follow the "Architect First" protocol: create spec.md and plan.md before writing code. Notify me when the documents are ready.

Please create a './specs/features/feature_002/specs.md' and './specs/features/feature_002/plan.md' in order to do that.

## Feature Brief

Kanban board. I want to have a kanban board that will allow me to see the tareas in the different estado (add "Iniciada" estado for in progress activities). The kanban board should be accessible from a navbar menu that will allow me to access also the Search page. In the kanban I want to have the possibility to create tareas. In tha kanban board each tarea should appear as a card with the main information in it. I want to be able to change the kanban by drag and drop.

## User Story

As a user, I want to visualize and manage my tareas on a Kanban board organized by `estado`, so I can quickly see what is pending, in progress, and completed, create new tareas directly from the board, and move tareas between columns by drag and drop.

## Key Requirements

### Requirement 1: New "Iniciada" estado

Add a new `estado` value `"Iniciada"` representing tareas that are in progress (started but not yet completed). This must be supported across the database schema, backend models/validation, and frontend UI alongside the existing estados.

The full set of estados, in Kanban column order from left to right, is: **Pendiente → Iniciada → Completada**. No existing estados are renamed.

### Requirement 2: Kanban board page

A new Kanban board page where each `estado` is rendered as a column and each tarea appears as a card inside the column matching its `estado`.

Each card must display the following fields:

- **Título** — card heading.
- **Descripción truncada** — first ~80 characters with ellipsis; full text shown on hover or when the card is opened/edited.
- **Fecha límite** — with a visual cue (e.g. red/amber badge) when the tarea is overdue or near due.
- **Persona** — the person assigned to the tarea. If the current data model does not yet include a `persona` field on tareas, this feature must add it (DB column + backend model/schema + frontend form/list support); confirm during planning.

### Requirement 3: Navbar with Kanban and Search entries

Introduce a top-level navbar visible across the authenticated app, with exactly two entries: **Kanban** and **Búsqueda**. The active entry must be visually indicated.

The default landing page after login is the **Kanban** board. The previous list view is **not** exposed in the navbar (the Kanban replaces it as the default browse view). Existing list-view code/routes may remain for now if it simplifies migration, but they are not reachable from navigation.

### Requirement 4: Create tareas from the Kanban

The Kanban page must allow creating new tareas without leaving the board via a per-column **"+"** button. Clicking it opens a modal/dialog with the full set of tarea fields (título, descripción, persona, fecha límite, estado, plus any other fields the model supports). The `estado` field must be **pre-filled with the column the user clicked from**, but remain editable.

The user can fill all fields in the modal and submit to create the tarea. After creation, the new card must appear in the appropriate column without a full page reload.

### Requirement 5: Drag and drop between and within columns

The user must be able to:

1. **Change a tarea's `estado`** by dragging its card from one column and dropping it on another. The change must persist via the backend API. The UI must update optimistically and roll back on API failure.
2. **Reorder cards within a column** by dragging them up or down. The order must persist across reloads and across users (single-user app for now, but the order is server-side state, not local).

To support intra-column ordering, the data model must add a persisted ordering field on tareas (e.g. `orden` / `position`), and the backend must expose an endpoint or extend the update endpoint so the frontend can persist new positions. Ordering semantics (per-column vs. global) and the exact field/endpoint shape are to be decided in `specs.md`.

Keyboard accessibility for drag-and-drop is **not** in scope for this feature.

### General Requirements

- The architecture should follow the file specs/architecture/architecture.md
- Update the README.md document after all the changes are done.
- Update the architecture doc (specs/architecture/architecture.md) after all the changes are done.
- All the configuration needed should be stored in a .env file
- All the operations should be logged to a log file configured in .env file. The default debugging level will be INFO but it can be changed in the .env file
- The most important operations will be also logged to the console

## Constraints

- The existing application functionality from previous versions should be maintained as is, except for the changes in this feature.

## Final instructions

Analyze the current codebase and let me know when the docs are ready for review. Do not start making any modifications to the code until I review the documents and explicitly say so.

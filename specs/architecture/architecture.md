# Architecture Document

## Todo List Example

A full-stack application with two modules.

| Module | Technology |
|--------|-----------|
| `backend/` | Python 3.12 + FastAPI + SQLAlchemy |
| `frontend/` | React 19 + Vite + Tailwind CSS |

**Shared Resources:**
- `db/` — SQLite database file and schema DDL
- `logs/` — Centralized log directory
- `specs/` — Technical specifications, architecture docs, feature specs

---

## 1. Database

**Engine:** SQLite3. Database file stored at `db/todo_list.db`; schema DDL maintained in `db/schema.sql`.

### 1.1 `tareas` table

| Column                | Type          | Notes                                                              |
|-----------------------|---------------|--------------------------------------------------------------------|
| `id`                  | INTEGER PK    | Autoincrement.                                                     |
| `descripcion`         | VARCHAR(500)  | Title-style label of the tarea (used as the Kanban card heading).  |
| `fecha_prevista`      | DATE          | Due date.                                                          |
| `estado`              | VARCHAR(20)   | CHECK in `('pendiente', 'iniciada', 'completado')`.                |
| `responsable`         | VARCHAR(20)   | CHECK in (`Nacho`, `Gonzalo`, `María`, `Papá`, `Mamá`).            |
| `notas`               | TEXT          | Optional long-form notes.                                          |
| `orden`               | INTEGER       | Per-estado position in the Kanban board (0..N-1, contiguous).      |
| `fecha_creacion`      | TIMESTAMP     | Insert time.                                                       |
| `fecha_actualizacion` | TIMESTAMP     | Bumped Python-side via SQLAlchemy `onupdate`.                      |

Indexes: `fecha_prevista`, `estado`, `responsable`, and `(estado, orden)` for Kanban reads.

Schema upgrades (e.g. the addition of `iniciada` / `orden` in feature_002) are applied via an idempotent in-place migration in `backend/app/database.py:_migrate_tareas_v2` after `init_db()` runs `db/schema.sql`. No external migration framework is used.

---

## 2. Backend

### 2.1 Technology Stack

- **Language:** Python 3.12+
- **Framework:** FastAPI
- **ORM:** SQLAlchemy 2.0
- **Validation:** Pydantic v2
- **Configuration:** pydantic-settings + python-dotenv
- **Authentication:** Clerk (PyJWT + cryptography for JWT verification)
- **HTTP client:** httpx (async)
- **Package manager:** uv

### 2.2 API endpoints (under `/api/tareas`)

| Method | Path             | Purpose                                                                          |
|--------|------------------|----------------------------------------------------------------------------------|
| GET    | `/`              | List with filters / sort / pagination.                                            |
| POST   | `/`              | Create. `orden` is optional; server appends to the destination column when omitted. |
| GET    | `/{id}`          | Fetch one.                                                                        |
| PATCH  | `/{id}`          | Update any subset of fields (including `orden`). Does not resequence neighbors.   |
| DELETE | `/{id}`          | Delete.                                                                            |
| POST   | `/reorder`       | Bulk atomic rewrite of `(estado, orden)` for the listed tarea IDs. Used by the Kanban for drag-and-drop. |

All endpoints require a valid Clerk JWT.

### 2.3 Running

```bash
cd backend
uv sync
uv run python -m app.main
```

---

## 3. Frontend

### 3.1 Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | React 19+ |
| Build Tool | Vite 7+ |
| Styling | Tailwind CSS 4+ |
| UI Components | Custom (Shadcn/ui patterns) |
| Authentication | Clerk |
| Data Fetching | TanStack Query 5+ + Axios |
| Theme Management | next-themes |
| Routing | React Router DOM 6+ |
| Icons | lucide-react |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |
| Package manager | npm |

### 3.1.1 Routes

| Path           | Page          | Notes                                                |
|----------------|---------------|------------------------------------------------------|
| `/kanban`      | KanbanPage    | Default landing page. Three columns, drag-and-drop.  |
| `/tareas`      | SearchPage    | Filter / sort / paginate.                            |
| `/tareas/:id`  | DetailPage    | Read-only with Editar / Eliminar.                    |
| `/sign-in/*`   | SignInPage    | Clerk-rendered.                                      |

The top-level navbar exposes only **Kanban** and **Búsqueda**.

**UI Language:** Spanish.

### 3.2 Running

```bash
cd frontend
npm install
npm run dev
```

---

## 4. Logging

| Module | Destination |
|--------|-------------|
| Backend | `logs/task_manager_backend.log` |
| Frontend | Browser console |

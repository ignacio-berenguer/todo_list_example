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

### 2.2 Running

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
| Package manager | npm |

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

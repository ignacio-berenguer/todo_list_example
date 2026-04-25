# Technical Specification — feature_001 (Todo App MVP)

## 1. Scope

This feature is the initial application: there is no prior code. The deliverable is a working full-stack Tareas manager that satisfies `requirements.md`. The codebase will be created from scratch following `specs/architecture/architecture.md`.

## 2. Repository layout

```
todo_list_example/
├── backend/                # Python 3.12 + FastAPI + SQLAlchemy + uv
├── frontend/               # React 19 + Vite + Tailwind 4
├── db/
│   ├── schema.sql          # DDL (source of truth)
│   └── todo_list.db        # SQLite file (gitignored, created at first run)
├── logs/
│   └── task_manager_backend.log   # gitignored
├── specs/
└── README.md
```

`db/` and `logs/` are committed as empty directories with `.gitkeep`.

## 3. Database

### 3.1 Schema (`db/schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS tareas (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    descripcion         VARCHAR(500) NOT NULL,
    fecha_prevista      DATE         NOT NULL,
    estado              VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'completado')),
    responsable         VARCHAR(20)  NOT NULL
        CHECK (responsable IN ('Nacho', 'Gonzalo', 'María', 'Papá', 'Mamá')),
    notas               TEXT,
    fecha_creacion      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tareas_fecha_prevista ON tareas(fecha_prevista);
CREATE INDEX IF NOT EXISTS idx_tareas_estado        ON tareas(estado);
CREATE INDEX IF NOT EXISTS idx_tareas_responsable   ON tareas(responsable);
```

### 3.2 Schema bootstrapping

On backend startup the app executes `db/schema.sql` against the configured SQLite file (idempotent thanks to `IF NOT EXISTS`). No migration tool (Alembic) is introduced for the MVP — `schema.sql` is the source of truth and any future change is added to that file with `ALTER TABLE` statements wrapped in `IF NOT EXISTS`-style guards.

### 3.3 Case-insensitive search

SQLite's built-in `LOWER()` is ASCII-only and the `NOCASE` collation also doesn't fold accents. For the description filter we use `LOWER(descripcion) LIKE LOWER('%' || :q || '%')`, which is good enough for ASCII and acceptable for Spanish accented letters at family-scale data volumes. This limitation is acknowledged; if it becomes a problem we can move to FTS5.

## 4. Backend (`backend/`)

### 4.1 Layout

```
backend/
├── pyproject.toml
├── .env.example
├── .python-version
└── app/
    ├── __init__.py
    ├── main.py              # FastAPI app, CORS, router registration, startup hook
    ├── config.py            # pydantic-settings Settings
    ├── logging_config.py    # configure stdlib logging from settings
    ├── database.py          # engine, SessionLocal, get_db dependency, init_db()
    ├── auth/
    │   ├── __init__.py
    │   └── clerk.py         # JWKS fetch + JWT verification
    ├── api/
    │   ├── __init__.py
    │   ├── deps.py          # require_user dependency
    │   └── routers/
    │       ├── __init__.py
    │       └── tareas.py    # CRUD + search endpoints
    ├── models/
    │   ├── __init__.py
    │   └── tarea.py         # SQLAlchemy ORM model
    └── schemas/
        ├── __init__.py
        └── tarea.py         # Pydantic schemas
```

### 4.2 Configuration (`app/config.py`)

`pydantic-settings.BaseSettings` reading from `.env`:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///../db/todo_list.db` | SQLAlchemy URL |
| `SCHEMA_PATH` | `../db/schema.sql` | DDL applied on startup |
| `LOG_LEVEL` | `INFO` | Root log level |
| `LOG_FILE` | `../logs/task_manager_backend.log` | File log destination |
| `LOG_TO_CONSOLE` | `True` | Whether to also stream to console |
| `CLERK_JWKS_URL` | — (required) | Clerk JWKS endpoint |
| `CLERK_ISSUER` | — (required) | Expected `iss` claim |
| `CLERK_AUDIENCE` | — (optional) | Expected `aud` claim if Clerk app uses it |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |
| `HOST` | `0.0.0.0` | uvicorn host |
| `PORT` | `8000` | uvicorn port |

A `.env.example` is committed; `.env` is gitignored.

### 4.3 Logging (`app/logging_config.py`)

- Stdlib `logging` (no extra dependency).
- Root logger configured with: a rotating file handler (`logs/task_manager_backend.log`, 5 MB × 5 backups) and, if `LOG_TO_CONSOLE`, a `StreamHandler` to stderr.
- Format: `%(asctime)s %(levelname)-7s %(name)s — %(message)s`.
- A helper `get_logger(name)` is used across the app.
- "Important operations" that also log at INFO to console: app startup/shutdown, DB schema applied, every CRUD operation on tareas (id + action + actor email).

### 4.4 Database (`app/database.py`)

- `engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, future=True)`.
- `SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)`.
- `get_db()` FastAPI dependency yielding a session and closing it.
- `init_db()` reads `SCHEMA_PATH` and executes the script on startup.
- SQLite pragmas applied per-connection via SQLAlchemy event: `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL`.

### 4.5 ORM model (`app/models/tarea.py`)

SQLAlchemy 2.0 declarative style with `Mapped[...]` annotations. Mirrors the schema; `fecha_actualizacion` updated by Python (`onupdate=datetime.utcnow`) so the value is correct even when SQLite does not auto-update.

### 4.6 Pydantic schemas (`app/schemas/tarea.py`)

- `EstadoEnum = Literal["pendiente", "completado"]`.
- `ResponsableEnum = Literal["Nacho", "Gonzalo", "María", "Papá", "Mamá"]`.
- `TareaBase`: `descripcion: str = Field(min_length=1, max_length=500)`, `fecha_prevista: date`, `estado: EstadoEnum = "pendiente"`, `responsable: ResponsableEnum`, `notas: str | None = None`.
- `TareaCreate(TareaBase)`.
- `TareaUpdate`: all fields optional (`PATCH` semantics).
- `TareaRead(TareaBase)`: adds `id`, `fecha_creacion`, `fecha_actualizacion`. `model_config = ConfigDict(from_attributes=True)`.
- `TareaListResponse`: `items: list[TareaRead]`, `total: int`, `page: int`, `page_size: int`.

### 4.7 Authentication (`app/auth/clerk.py` + `app/api/deps.py`)

- On first JWT verification request, fetch JWKS from `CLERK_JWKS_URL` via `httpx`; cache keys in memory keyed by `kid` with a 1-hour TTL.
- `require_user` dependency:
  1. Reads `Authorization: Bearer <jwt>` header. If missing → 401.
  2. Decodes header, looks up signing key by `kid`, verifies signature with `PyJWT`.
  3. Validates `iss` (and `aud` if configured) and `exp`.
  4. Returns a small `AuthUser` dataclass (`sub`, `email`).
- All `/api/tareas*` routes depend on `require_user`. Anonymous calls return 401.

### 4.8 API (`app/api/routers/tareas.py`)

Base prefix: `/api/tareas`.

| Method | Path | Body / Query | Response | Notes |
|---|---|---|---|---|
| `GET` | `/` | query params (see below) | `TareaListResponse` | Paginated search |
| `POST` | `/` | `TareaCreate` | `TareaRead` (201) | |
| `GET` | `/{id}` | — | `TareaRead` | 404 if not found |
| `PATCH` | `/{id}` | `TareaUpdate` | `TareaRead` | 404 if not found |
| `DELETE` | `/{id}` | — | `204 No Content` | 404 if not found |

Search query parameters (all optional):

| Param | Type | Behavior |
|---|---|---|
| `descripcion` | str | Case-insensitive substring (`LOWER(...) LIKE`) |
| `estado` | `pendiente` \| `completado` | Exact match |
| `responsable` | enum value | Exact match |
| `fecha_desde` | ISO date | `fecha_prevista >= fecha_desde` |
| `fecha_hasta` | ISO date | `fecha_prevista <= fecha_hasta` |
| `sort` | `descripcion` \| `fecha_prevista` \| `estado` \| `responsable` \| `fecha_creacion` \| `fecha_actualizacion` | Default `fecha_prevista` |
| `order` | `asc` \| `desc` | Default `asc` |
| `page` | int ≥ 1 | Default `1` |
| `page_size` | int in {10, 20, 50} | Default `20` |

`total` is computed via a `SELECT COUNT(*)` over the same filter predicate (without ordering / pagination). Results are returned as a `TareaListResponse`.

### 4.9 CORS

`CORSMiddleware` allows origins from `CORS_ORIGINS` (split on `,`), credentials enabled, all methods, and the `Authorization` header.

### 4.10 Application entry (`app/main.py`)

- `FastAPI(title="Todo List API")`.
- Mounts CORS middleware, the tareas router, and a health endpoint `GET /health` (unauthenticated).
- `@app.on_event("startup")`: configure logging, run `init_db()`, log `"backend started"`.
- `python -m app.main` launches uvicorn programmatically using `HOST` / `PORT` from settings.

## 5. Frontend (`frontend/`)

### 5.1 Layout

```
frontend/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── index.html
├── .env.example
└── src/
    ├── main.tsx                      # ClerkProvider + QueryClientProvider + RouterProvider + ThemeProvider
    ├── App.tsx                       # Layout shell (header) + protected outlet
    ├── lib/
    │   ├── api.ts                    # axios instance with Clerk-token interceptor
    │   ├── queryClient.ts
    │   └── format.ts                 # date / enum formatters (es-ES)
    ├── routes/
    │   ├── SearchPage.tsx
    │   ├── DetailPage.tsx
    │   └── SignInPage.tsx
    ├── features/tareas/
    │   ├── api.ts                    # useTareasQuery, useTareaQuery, mutations
    │   ├── types.ts
    │   ├── constants.ts              # RESPONSABLES, ESTADOS, COLUMNAS
    │   ├── TareaFilters.tsx
    │   ├── TareaTable.tsx
    │   ├── TareaColumnPicker.tsx
    │   ├── TareaModal.tsx            # Create + Edit
    │   └── DeleteConfirmDialog.tsx
    ├── components/ui/                # Shadcn-style primitives (Button, Input, Select, Dialog, Table, Badge, ...)
    ├── components/layout/
    │   └── Header.tsx                # app title, UserButton, theme toggle
    └── hooks/
        └── useColumnPreferences.ts   # localStorage-backed visible columns
```

### 5.2 Configuration (`.env.example`)

| Variable | Purpose |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
| `VITE_API_BASE_URL` | Default `http://localhost:8000` |

### 5.3 Routing

`react-router-dom` 6 with the following routes, all protected by Clerk's `<SignedIn>` guard (redirecting to `/sign-in` otherwise):

| Path | Page |
|---|---|
| `/` | redirect → `/tareas` |
| `/tareas` | `SearchPage` |
| `/tareas/:id` | `DetailPage` |
| `/sign-in/*` | `SignInPage` (Clerk's `<SignIn />`) |

### 5.4 API client (`lib/api.ts`)

- `axios` instance with `baseURL = VITE_API_BASE_URL`.
- Request interceptor that calls Clerk's `getToken()` and sets `Authorization: Bearer <token>`.
- Response interceptor that maps non-2xx into typed errors with `message` (used for toast / inline errors).

### 5.5 Data fetching (`features/tareas/api.ts`)

TanStack Query 5 hooks:

- `useTareasQuery(filters, sort, page, pageSize)` — `queryKey: ["tareas", { ... }]`.
- `useTareaQuery(id)` — `queryKey: ["tareas", id]`.
- `useCreateTareaMutation()` / `useUpdateTareaMutation()` / `useDeleteTareaMutation()` — invalidate `["tareas"]` queries on success and update `["tareas", id]` cache when relevant.

Stale time defaults: 30 s for the list query; lists are also explicitly invalidated on mutations so the row refresh after edit is immediate.

### 5.6 Search page (`routes/SearchPage.tsx`)

- URL is the source of truth for filters, page, and sort: e.g. `/tareas?descripcion=baño&estado=pendiente&page=2&page_size=20&sort=fecha_prevista&order=asc`.
- A `<TareaFilters>` controlled form holds **draft** values; clicking **Buscar** writes them to the URL (which triggers the query). **Limpiar filtros** clears them.
- A `<TareaTable>` reads the URL params and renders results, sort indicators, and pagination controls (page selector, page-size selector). Empty state copy: `"No hay tareas que coincidan con los filtros."`.
- A `<TareaColumnPicker>` toggles visible columns; selection is persisted in localStorage under `tareas:visibleColumns` via `useColumnPreferences`.
- Per-row actions: open Detail (link to `/tareas/:id` carrying current search query as `?from=`), open Edit modal, delete (confirmation dialog).
- Top toolbar: **Crear Tarea** button opens `<TareaModal mode="create">`.

### 5.7 Detail page (`routes/DetailPage.tsx`)

- Read-only card showing all fields, including `notas`, `fecha_creacion`, `fecha_actualizacion`.
- **Editar** opens `<TareaModal mode="edit">` prefilled with the current Tarea.
- **Eliminar** opens `<DeleteConfirmDialog>`; on confirm calls `useDeleteTareaMutation` then `navigate(-1)` back to Search.
- **Volver** uses the `?from=` query string captured in 5.6 to return to the Search page with the previous filters.

### 5.8 Modal form (`features/tareas/TareaModal.tsx`)

- Single component handling both `mode="create"` and `mode="edit"`.
- Fields: `descripción` (textarea, max 500, counter), `fecha_prevista` (date picker), `estado` (select), `responsable` (select), `notas` (textarea, optional).
- Validation via a small Zod schema (or hand-rolled) mirroring backend Pydantic rules.
- Submit calls the appropriate mutation; on success the modal closes and the user stays on the same route. The list/detail query is invalidated, so visible data refreshes in place.
- Inline error messages in Spanish; toast on submit failure.

### 5.9 Localization

UI strings are hard-coded in Spanish (no i18n library for the MVP). A `lib/format.ts` provides `formatDate` (uses `Intl.DateTimeFormat("es-ES")`) and label maps for `estado` (`"Pendiente"` / `"Completado"`).

### 5.10 Theming

`next-themes` provides a `ThemeProvider` and a header toggle. Tailwind 4 dark variants drive styling. Default theme: `system`.

## 6. Cross-cutting concerns

### 6.1 Logging — important operations

These INFO events are emitted both to file and console:

- App startup, schema applied, app shutdown.
- `tarea.created id=X by=email`
- `tarea.updated id=X by=email fields=[...]`
- `tarea.deleted id=X by=email`
- Authentication failures (401) at WARNING level.

### 6.2 Error contracts

Backend returns problem-style JSON: `{ "detail": "..." }`. Validation errors come back as FastAPI's standard 422 body. The frontend axios interceptor maps these to a `message` string for surfacing.

### 6.3 Time zone

All timestamps are stored as UTC; the frontend renders them in the user's local zone via `Intl.DateTimeFormat`. `fecha_prevista` is a calendar date (no time) and is treated as a string `YYYY-MM-DD` end-to-end.

## 7. Out of scope (MVP)

- Bulk operations, recurring tasks, attachments, comments.
- Per-user permissions or audit history.
- Server-side i18n or English UI.
- Real-time updates (no websockets); polling is also not enabled — refresh happens on mutation invalidation.
- Tests are not included in this feature; they will be added in a follow-up.

## 8. Implementation notes (what actually shipped)

Small deviations from the original design, applied during implementation:

- **Backend startup**: §4.10 specified `@app.on_event("startup")`, which is deprecated in current FastAPI. The implementation uses the equivalent `lifespan=` async context manager — same hooks (configure logging → `init_db()` → log startup; on shutdown log shutdown).
- **Backend route registration**: each tareas endpoint is registered at both `""` and `"/"` paths (the latter `include_in_schema=False`) so requests with or without a trailing slash hit the route directly without a 307 redirect that would drop the `Authorization` header.
- **Backend Clerk env vars**: `CLERK_JWKS_URL` and `CLERK_ISSUER` were defined as required in §4.2; the shipped backend treats them as optional with empty defaults so the app can boot without credentials. When either is empty, `require_user` returns HTTP 503 `"Clerk no configurado"` and a single WARNING is logged at startup. (Approved by the project owner during development.)
- **Backend PATCH semantics**: `TareaUpdate` is applied with `exclude_unset=True`, so absent fields are not touched; `fecha_actualizacion` is bumped via SQLAlchemy `onupdate=datetime.utcnow` whenever any field is written.
- **Frontend tsconfig**: §5.1 listed a single `tsconfig.json`. The shipped frontend uses Vite 7's standard composite project layout — root `tsconfig.json` with project references to `tsconfig.app.json` (src) and `tsconfig.node.json` (vite config). `tsc -b` requires this split.
- **Frontend Tailwind config**: no `tailwind.config.ts` or `postcss.config.js` was created. Tailwind 4's `@tailwindcss/vite` plugin auto-discovers content; theme tokens, dark variant, and CSS variables live in `src/index.css` via `@import "tailwindcss"`, `@custom-variant dark`, and `@theme {...}`.
- **Frontend Clerk-key handling**: `main.tsx` checks `VITE_CLERK_PUBLISHABLE_KEY` at runtime; if empty, it renders a Spanish placeholder card instead of mounting `ClerkProvider`. This keeps `npm run build` and `npm run dev` working without a key.
- **Frontend axios + Clerk**: instead of calling Clerk hooks inside the axios interceptor, `lib/api.ts` exposes `setAuthTokenGetter(getToken)`; `App.tsx`'s protected layout registers Clerk's `getToken` once via `useEffect`. The interceptor reads the registered getter.
- **Frontend validation**: hand-rolled (no Zod), per the spec's "Zod schema (or hand-rolled)" allowance.
- **CORS_ORIGINS default**: broadened in `.env.example` to include `http://localhost:5173,5174,5175` so Vite port-fallback works without a CORS error.

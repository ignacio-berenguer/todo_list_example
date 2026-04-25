"""SQLAlchemy engine, session factory, and schema bootstrap."""

from __future__ import annotations

import os
import sqlite3
from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings
from app.logging_config import get_logger

logger = get_logger(__name__)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@event.listens_for(engine, "connect")
def _set_sqlite_pragmas(dbapi_connection, _connection_record):  # noqa: ANN001
    """Apply SQLite pragmas on every new connection."""
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.execute("PRAGMA journal_mode = WAL")
    finally:
        cursor.close()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _resolve_sqlite_path(database_url: str) -> str | None:
    """Return the on-disk path for a sqlite SQLAlchemy URL, or None if not sqlite."""
    if not database_url.startswith("sqlite"):
        return None
    # sqlite:///relative/path  → relative/path
    # sqlite:////abs/path      → /abs/path
    # sqlite:///C:/abs/path    → C:/abs/path (Windows)
    prefix, _, path = database_url.partition(":///")
    if not path:
        return None
    return path


def init_db() -> None:
    """Apply the schema SQL file to the configured SQLite database."""
    schema_path = settings.schema_path
    if not os.path.exists(schema_path):
        raise FileNotFoundError(f"Schema file not found: {schema_path}")

    sqlite_path = _resolve_sqlite_path(settings.database_url)
    if sqlite_path is None:
        # Non-SQLite backends are not supported in the MVP.
        raise RuntimeError(
            f"init_db() only supports sqlite:/// URLs; got {settings.database_url!r}"
        )

    db_dir = os.path.dirname(os.path.abspath(sqlite_path))
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    with open(schema_path, "r", encoding="utf-8") as f:
        ddl = f.read()

    conn = sqlite3.connect(sqlite_path)
    try:
        conn.executescript(ddl)
        conn.commit()
        _migrate_tareas_v2(conn)
    finally:
        conn.close()

    logger.info("schema applied path=%s db=%s", schema_path, sqlite_path)


def _migrate_tareas_v2(conn: sqlite3.Connection) -> None:
    """Idempotent in-place migration to feature_002 schema.

    Adds the `orden` column and extends the estado CHECK to include 'iniciada'
    on databases created before feature_002. Safe to run repeatedly.
    """
    cur = conn.cursor()

    # 1. Add `orden` column if missing, then backfill per estado.
    cur.execute("PRAGMA table_info(tareas)")
    columns = {row[1] for row in cur.fetchall()}
    if "orden" not in columns:
        logger.info("migration tareas.orden add_column")
        cur.execute(
            "ALTER TABLE tareas ADD COLUMN orden INTEGER NOT NULL DEFAULT 0"
        )
        cur.execute(
            """
            WITH ordered AS (
                SELECT
                    id,
                    ROW_NUMBER() OVER (
                        PARTITION BY estado
                        ORDER BY fecha_prevista, id
                    ) - 1 AS new_orden
                FROM tareas
            )
            UPDATE tareas
            SET orden = (SELECT new_orden FROM ordered WHERE ordered.id = tareas.id)
            """
        )
        conn.commit()
        logger.info("migration tareas.orden backfilled rows=%s", cur.rowcount)

    # 2. Extend the estado CHECK to include 'iniciada' if not already present.
    cur.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='tareas'"
    )
    row = cur.fetchone()
    table_sql = row[0] if row else ""
    if "iniciada" not in table_sql:
        logger.info("migration tareas.estado_check rebuild_table")
        cur.executescript(
            """
            PRAGMA foreign_keys = OFF;
            BEGIN;
            ALTER TABLE tareas RENAME TO tareas_old;
            CREATE TABLE tareas (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                descripcion         VARCHAR(500) NOT NULL,
                fecha_prevista      DATE         NOT NULL,
                estado              VARCHAR(20)  NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente', 'iniciada', 'completado')),
                responsable         VARCHAR(20)  NOT NULL
                    CHECK (responsable IN ('Nacho', 'Gonzalo', 'María', 'Papá', 'Mamá')),
                notas               TEXT,
                orden               INTEGER      NOT NULL DEFAULT 0,
                fecha_creacion      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO tareas (
                id, descripcion, fecha_prevista, estado, responsable,
                notas, orden, fecha_creacion, fecha_actualizacion
            )
            SELECT
                id, descripcion, fecha_prevista, estado, responsable,
                notas, orden, fecha_creacion, fecha_actualizacion
            FROM tareas_old;
            DROP TABLE tareas_old;
            COMMIT;
            PRAGMA foreign_keys = ON;
            """
        )
        # Recreate indexes after table rebuild.
        cur.executescript(
            """
            CREATE INDEX IF NOT EXISTS idx_tareas_fecha_prevista ON tareas(fecha_prevista);
            CREATE INDEX IF NOT EXISTS idx_tareas_estado        ON tareas(estado);
            CREATE INDEX IF NOT EXISTS idx_tareas_responsable   ON tareas(responsable);
            CREATE INDEX IF NOT EXISTS idx_tareas_estado_orden  ON tareas(estado, orden);
            """
        )
        conn.commit()
        logger.info("migration tareas.estado_check done")

    # 3. Always ensure the new index exists (covers fresh installs and old DBs
    # that already had the column but not the index).
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_tareas_estado_orden ON tareas(estado, orden)"
    )
    conn.commit()

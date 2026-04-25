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
    finally:
        conn.close()

    logger.info("schema applied path=%s db=%s", schema_path, sqlite_path)

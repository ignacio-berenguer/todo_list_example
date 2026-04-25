"""Stdlib logging configuration for the backend."""

from __future__ import annotations

import logging
import os
import sys
from logging.handlers import RotatingFileHandler

from app.config import settings

_LOG_FORMAT = "%(asctime)s %(levelname)-7s %(name)s — %(message)s"
_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
_BACKUP_COUNT = 5

_configured = False


def configure_logging() -> None:
    """Configure the root logger with rotating file + optional console handlers."""
    global _configured
    if _configured:
        return

    log_file = settings.log_file
    log_dir = os.path.dirname(os.path.abspath(log_file))
    if log_dir:
        os.makedirs(log_dir, exist_ok=True)

    formatter = logging.Formatter(_LOG_FORMAT)

    root = logging.getLogger()
    root.setLevel(settings.log_level.upper())

    # Remove any handlers configured by uvicorn / pre-existing setup so we own the root.
    for handler in list(root.handlers):
        root.removeHandler(handler)

    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=_MAX_BYTES,
        backupCount=_BACKUP_COUNT,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    if settings.log_to_console:
        stream_handler = logging.StreamHandler(stream=sys.stderr)
        stream_handler.setFormatter(formatter)
        root.addHandler(stream_handler)

    _configured = True


def get_logger(name: str) -> logging.Logger:
    """Return a named logger. Callers should call this at module scope."""
    return logging.getLogger(name)

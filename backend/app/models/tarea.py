"""SQLAlchemy 2.0 ORM model for the `tareas` table."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Tarea(Base):
    __tablename__ = "tareas"
    __table_args__ = (
        CheckConstraint(
            "estado IN ('pendiente', 'completado')",
            name="ck_tareas_estado",
        ),
        CheckConstraint(
            "responsable IN ('Nacho', 'Gonzalo', 'María', 'Papá', 'Mamá')",
            name="ck_tareas_responsable",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    descripcion: Mapped[str] = mapped_column(String(500), nullable=False)
    fecha_prevista: Mapped[date] = mapped_column(Date, nullable=False)
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pendiente"
    )
    responsable: Mapped[str] = mapped_column(String(20), nullable=False)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

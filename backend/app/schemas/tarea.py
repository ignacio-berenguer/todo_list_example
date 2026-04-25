"""Pydantic schemas for the `tareas` resource."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

EstadoEnum = Literal["pendiente", "completado"]
ResponsableEnum = Literal["Nacho", "Gonzalo", "María", "Papá", "Mamá"]


class TareaBase(BaseModel):
    descripcion: str = Field(min_length=1, max_length=500)
    fecha_prevista: date
    estado: EstadoEnum = "pendiente"
    responsable: ResponsableEnum
    notas: str | None = None


class TareaCreate(TareaBase):
    pass


class TareaUpdate(BaseModel):
    """All fields optional for PATCH semantics."""

    descripcion: str | None = Field(default=None, min_length=1, max_length=500)
    fecha_prevista: date | None = None
    estado: EstadoEnum | None = None
    responsable: ResponsableEnum | None = None
    notas: str | None = None


class TareaRead(TareaBase):
    id: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime

    model_config = ConfigDict(from_attributes=True)


class TareaListResponse(BaseModel):
    items: list[TareaRead]
    total: int
    page: int
    page_size: int

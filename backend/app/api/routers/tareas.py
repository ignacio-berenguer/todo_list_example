"""CRUD + search endpoints for the `tareas` resource."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.auth.clerk import AuthUser
from app.database import get_db
from app.logging_config import get_logger
from app.models.tarea import Tarea
from app.schemas.tarea import (
    EstadoEnum,
    ResponsableEnum,
    TareaCreate,
    TareaListResponse,
    TareaRead,
    TareaUpdate,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/api/tareas", tags=["tareas"])

SortField = Literal[
    "descripcion",
    "fecha_prevista",
    "estado",
    "responsable",
    "fecha_creacion",
    "fecha_actualizacion",
]
SortOrder = Literal["asc", "desc"]

_ALLOWED_PAGE_SIZES = {10, 20, 50}


def _validate_page_size(value: int) -> int:
    if value not in _ALLOWED_PAGE_SIZES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"page_size must be one of {sorted(_ALLOWED_PAGE_SIZES)}",
        )
    return value


def _sort_column(field: SortField):
    return {
        "descripcion": Tarea.descripcion,
        "fecha_prevista": Tarea.fecha_prevista,
        "estado": Tarea.estado,
        "responsable": Tarea.responsable,
        "fecha_creacion": Tarea.fecha_creacion,
        "fecha_actualizacion": Tarea.fecha_actualizacion,
    }[field]


@router.get("", response_model=TareaListResponse)
@router.get("/", response_model=TareaListResponse, include_in_schema=False)
def list_tareas(
    descripcion: Annotated[str | None, Query()] = None,
    estado: Annotated[EstadoEnum | None, Query()] = None,
    responsable: Annotated[ResponsableEnum | None, Query()] = None,
    fecha_desde: Annotated[date | None, Query()] = None,
    fecha_hasta: Annotated[date | None, Query()] = None,
    sort: Annotated[SortField, Query()] = "fecha_prevista",
    order: Annotated[SortOrder, Query()] = "asc",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query()] = 20,
    db: Session = Depends(get_db),
    _user: AuthUser = Depends(require_user),
) -> TareaListResponse:
    page_size = _validate_page_size(page_size)

    filters = []
    if descripcion:
        needle = f"%{descripcion.lower()}%"
        filters.append(func.lower(Tarea.descripcion).like(needle))
    if estado is not None:
        filters.append(Tarea.estado == estado)
    if responsable is not None:
        filters.append(Tarea.responsable == responsable)
    if fecha_desde is not None:
        filters.append(Tarea.fecha_prevista >= fecha_desde)
    if fecha_hasta is not None:
        filters.append(Tarea.fecha_prevista <= fecha_hasta)

    base_stmt = select(Tarea)
    count_stmt = select(func.count()).select_from(Tarea)
    for predicate in filters:
        base_stmt = base_stmt.where(predicate)
        count_stmt = count_stmt.where(predicate)

    total = db.execute(count_stmt).scalar_one()

    sort_col = _sort_column(sort)
    direction = asc if order == "asc" else desc
    base_stmt = base_stmt.order_by(direction(sort_col)).offset((page - 1) * page_size).limit(page_size)

    rows = db.execute(base_stmt).scalars().all()

    return TareaListResponse(
        items=[TareaRead.model_validate(row) for row in rows],
        total=int(total),
        page=page,
        page_size=page_size,
    )


@router.post(
    "",
    response_model=TareaRead,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/",
    response_model=TareaRead,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_tarea(
    payload: TareaCreate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_user),
) -> TareaRead:
    tarea = Tarea(**payload.model_dump())
    db.add(tarea)
    db.commit()
    db.refresh(tarea)

    logger.info("tarea.created id=%s by=%s", tarea.id, user.email or user.sub)

    return TareaRead.model_validate(tarea)


@router.get("/{tarea_id}", response_model=TareaRead)
def get_tarea(
    tarea_id: int,
    db: Session = Depends(get_db),
    _user: AuthUser = Depends(require_user),
) -> TareaRead:
    tarea = db.get(Tarea, tarea_id)
    if tarea is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    return TareaRead.model_validate(tarea)


@router.patch("/{tarea_id}", response_model=TareaRead)
def update_tarea(
    tarea_id: int,
    payload: TareaUpdate,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_user),
) -> TareaRead:
    tarea = db.get(Tarea, tarea_id)
    if tarea is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        # Nothing to do — return current state without bumping fecha_actualizacion.
        return TareaRead.model_validate(tarea)

    for field, value in updates.items():
        setattr(tarea, field, value)

    db.commit()
    db.refresh(tarea)

    logger.info(
        "tarea.updated id=%s by=%s fields=%s",
        tarea.id,
        user.email or user.sub,
        sorted(updates.keys()),
    )

    return TareaRead.model_validate(tarea)


@router.delete("/{tarea_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tarea(
    tarea_id: int,
    db: Session = Depends(get_db),
    user: AuthUser = Depends(require_user),
) -> Response:
    tarea = db.get(Tarea, tarea_id)
    if tarea is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")

    db.delete(tarea)
    db.commit()

    logger.info("tarea.deleted id=%s by=%s", tarea_id, user.email or user.sub)

    return Response(status_code=status.HTTP_204_NO_CONTENT)

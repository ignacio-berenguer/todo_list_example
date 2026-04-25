"""FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import tareas as tareas_router
from app.config import settings
from app.database import init_db
from app.logging_config import configure_logging, get_logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    logger = get_logger(__name__)

    init_db()

    if not settings.clerk_configured:
        logger.warning(
            "clerk.not_configured — CLERK_JWKS_URL or CLERK_ISSUER is empty; "
            "authenticated endpoints will return 503 until configured"
        )

    logger.info(
        "backend started host=%s port=%s log_level=%s",
        settings.host,
        settings.port,
        settings.log_level,
    )

    try:
        yield
    finally:
        logger.info("backend shutdown")


app = FastAPI(title="Todo List API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(tareas_router.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=False)

from collections.abc import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session

from app.config import get_settings

settings = get_settings()
engine = create_async_engine(settings.database_url, future=True, echo=False)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Sync engine for Celery tasks (synchronous context)
_sync_db_url = settings.database_url.replace("+asyncpg", "")
_sync_engine = create_engine(_sync_db_url)
SyncSessionLocal = Session  # direct Session class, instantiate per-task


def get_sync_session() -> Session:
    return Session(_sync_engine)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session

import os
import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost/pdfeditor_test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
os.environ.setdefault("STORAGE_ENDPOINT_URL", "http://localhost:9000")
os.environ.setdefault("STORAGE_ACCESS_KEY_ID", "test")
os.environ.setdefault("STORAGE_SECRET_ACCESS_KEY", "test")
os.environ.setdefault("STORAGE_BUCKET_NAME", "test")
os.environ.setdefault("STORAGE_PUBLIC_URL", "http://localhost:9000/test")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_test")

from app.dependencies import db_session, get_current_user  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import SubscriptionTier  # noqa: E402


class _EmptyScalars:
    def all(self) -> list[object]:
        return []


class _EmptyResult:
    def scalars(self) -> _EmptyScalars:
        return _EmptyScalars()

    def scalar_one_or_none(self) -> None:
        return None


class _FakeDb:
    async def execute(self, _statement: object) -> _EmptyResult:
        return _EmptyResult()

    async def commit(self) -> None:
        return None

    async def rollback(self) -> None:
        return None

    async def refresh(self, _obj: object) -> None:
        return None

    def add(self, _obj: object) -> None:
        return None

    async def delete(self, _obj: object) -> None:
        return None


async def _override_db_session():
    yield _FakeDb()


async def _override_current_user():
    return SimpleNamespace(
        id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        email="dev@localhost",
        tier=SubscriptionTier.free,
    )


@pytest.fixture
def client() -> TestClient:
    app.dependency_overrides[db_session] = _override_db_session
    app.dependency_overrides[get_current_user] = _override_current_user
    return TestClient(app)

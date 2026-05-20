import os

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

from app.main import app  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)

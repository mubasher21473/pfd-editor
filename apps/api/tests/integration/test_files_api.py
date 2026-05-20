import uuid
from types import SimpleNamespace

import pytest

from app.api.v1.files import list_files
from app.models.user import SubscriptionTier
from tests.conftest import _FakeDb


@pytest.mark.asyncio
async def test_files_list_returns_owned_files() -> None:
    user = SimpleNamespace(
        id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        tier=SubscriptionTier.free,
    )

    files = await list_files(db=_FakeDb(), user=user)

    assert files == []

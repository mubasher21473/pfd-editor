import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.v1.export import trigger_export
from app.models.user import SubscriptionTier
from tests.conftest import _FakeDb


@pytest.mark.asyncio
async def test_export_trigger_rejects_invalid_file_id() -> None:
    user = SimpleNamespace(
        id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        tier=SubscriptionTier.free,
    )

    with pytest.raises(HTTPException) as exc:
        await trigger_export(file_id="file-1", db=_FakeDb(), user=user)

    assert exc.value.status_code == 400

import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.v1.edits import apply_edits
from app.models.user import SubscriptionTier
from app.schemas.edit import BulkEditIn
from tests.conftest import _FakeDb


@pytest.mark.asyncio
async def test_edit_apply_rejects_invalid_file_id() -> None:
    user = SimpleNamespace(
        id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        tier=SubscriptionTier.free,
    )

    with pytest.raises(HTTPException) as exc:
        await apply_edits(file_id="file-1", body=BulkEditIn(operations=[]), db=_FakeDb(), user=user)

    assert exc.value.status_code == 400

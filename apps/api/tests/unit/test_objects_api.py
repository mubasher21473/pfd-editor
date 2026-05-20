import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.v1.objects import get_objects
from app.models.user import SubscriptionTier


class _FileResult:
    def __init__(self, user_id: uuid.UUID) -> None:
        self.user_id = user_id

    def scalar_one_or_none(self) -> SimpleNamespace:
        return SimpleNamespace(id=uuid.uuid4(), user_id=self.user_id)


class _FakeDbWithFile:
    def __init__(self, user_id: uuid.UUID) -> None:
        self.user_id = user_id

    async def execute(self, _statement: object) -> _FileResult:
        return _FileResult(self.user_id)


@pytest.mark.asyncio
async def test_objects_rejects_unsupported_object_type() -> None:
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    user = SimpleNamespace(
        id=user_id,
        tier=SubscriptionTier.free,
    )

    with pytest.raises(HTTPException) as exc:
        await get_objects(
            file_id="00000000-0000-0000-0000-000000000002",
            object_type="unknown",
            db=_FakeDbWithFile(user_id),
            user=user,
        )

    assert exc.value.status_code == 400

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class EditBody(BaseModel):
    operations: list[dict[str, object]]


@router.post("/{file_id}")
async def apply_edits(file_id: str, body: EditBody) -> dict[str, object]:
    return {"job_id": f"job-{file_id}", "operations": len(body.operations)}

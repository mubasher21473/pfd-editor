from fastapi import APIRouter

router = APIRouter()


@router.get("/{file_id}")
async def get_objects(file_id: str) -> dict[str, object]:
    return {"file_id": file_id, "objects": []}

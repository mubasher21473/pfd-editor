from fastapi import APIRouter

router = APIRouter()


@router.post("/{file_id}")
async def trigger_export(file_id: str) -> dict[str, str]:
    return {"download_url": f"https://example.com/download/{file_id}"}

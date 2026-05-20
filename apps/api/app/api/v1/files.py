from fastapi import APIRouter, UploadFile

router = APIRouter()


@router.post("/upload")
async def upload(file: UploadFile) -> dict[str, str]:
    return {"file_id": file.filename or "pending"}


@router.get("")
async def list_files() -> list[dict[str, str]]:
    return []


@router.delete("/{file_id}")
async def delete_file(file_id: str) -> dict[str, str]:
    return {"deleted": file_id}

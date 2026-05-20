import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import db_session, get_current_user
from app.models.pdf_file import PdfFile
from app.models.user import User
from app.schemas.file import FileDetail, FileDownloadResponse, FileListItem, FileUploadResponse
from app.services.storage import StorageService
from app.tasks.parse_pdf import parse_pdf_task

router = APIRouter()

MAX_FILE_SIZE_MB = 50


@router.post("/upload")
async def upload(
    file: UploadFile,
    db: AsyncSession = Depends(db_session),
    user: User = Depends(get_current_user),
) -> FileUploadResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are allowed"
        )

    content = await file.read()
    file_size = len(content)

    if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {MAX_FILE_SIZE_MB}MB limit",
        )

    if content[:5] != b"%PDF-":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a valid PDF file")

    file_id = uuid.uuid4()
    s3_key = f"users/{user.id}/files/{file_id}/source.pdf"

    pdf_file = PdfFile(
        id=file_id,
        user_id=user.id,
        original_name=file.filename,
        s3_key=s3_key,
        file_size_bytes=file_size,
        parse_status="pending",
    )
    db.add(pdf_file)
    await db.flush()

    storage = StorageService()
    try:
        storage.upload_bytes(s3_key, content)
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    parse_pdf_task.delay(str(file_id))

    return FileUploadResponse(
        file_id=str(file_id),
        original_name=file.filename,
        parse_status="pending",
        file_size_bytes=file_size,
    )


@router.get("")
async def list_files(
    db: AsyncSession = Depends(db_session),
    user: User = Depends(get_current_user),
) -> list[FileListItem]:
    result = await db.execute(
        select(PdfFile)
        .where(PdfFile.user_id == user.id)
        .order_by(PdfFile.created_at.desc())
    )
    files = result.scalars().all()
    return [
        FileListItem(
            id=str(f.id),
            original_name=f.original_name,
            parse_status=f.parse_status,
            file_size_bytes=f.file_size_bytes,
            page_count=f.page_count,
            created_at=f.created_at,
        )
        for f in files
    ]


@router.get("/{file_id}")
async def get_file(
    file_id: str,
    db: AsyncSession = Depends(db_session),
    user: User = Depends(get_current_user),
) -> FileDetail:
    try:
        fid = uuid.UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID")

    result = await db.execute(select(PdfFile).where(PdfFile.id == fid))
    pdf_file = result.scalar_one_or_none()

    if pdf_file is None or pdf_file.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return FileDetail(
        id=str(pdf_file.id),
        original_name=pdf_file.original_name,
        parse_status=pdf_file.parse_status,
        file_size_bytes=pdf_file.file_size_bytes,
        page_count=pdf_file.page_count,
        created_at=pdf_file.created_at,
    )


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    db: AsyncSession = Depends(db_session),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    try:
        fid = uuid.UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID")

    result = await db.execute(select(PdfFile).where(PdfFile.id == fid))
    pdf_file = result.scalar_one_or_none()

    if pdf_file is None or pdf_file.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    storage = StorageService()
    storage.delete(pdf_file.s3_key)

    await db.delete(pdf_file)
    await db.commit()

    return {"deleted": file_id}


@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    db: AsyncSession = Depends(db_session),
    user: User = Depends(get_current_user),
) -> FileDownloadResponse:
    try:
        fid = uuid.UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID")

    result = await db.execute(select(PdfFile).where(PdfFile.id == fid))
    pdf_file = result.scalar_one_or_none()

    if pdf_file is None or pdf_file.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    storage = StorageService()
    return FileDownloadResponse(
        file_id=file_id,
        download_url=storage.presigned_download_url(pdf_file.s3_key),
    )


@router.get("/{file_id}/content")
async def content_file(
    file_id: str,
    db: AsyncSession = Depends(db_session),
    user: User = Depends(get_current_user),
) -> StreamingResponse:
    try:
        fid = uuid.UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID")

    result = await db.execute(select(PdfFile).where(PdfFile.id == fid))
    pdf_file = result.scalar_one_or_none()

    if pdf_file is None or pdf_file.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    storage = StorageService()
    pdf_bytes = storage.download_bytes(pdf_file.s3_key)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{pdf_file.original_name}"'},
    )

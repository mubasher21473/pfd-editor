import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import db_session, get_current_user
from app.models.edit_operation import EditStatus, Export
from app.models.pdf_file import PdfFile
from app.models.user import User
from app.schemas.export import ExportCreateResponse, ExportStatusResponse
from app.tasks.export_pdf import export_pdf_task

router = APIRouter()


@router.post("/{file_id}")
async def trigger_export(
    file_id: str,
    db: AsyncSession = Depends(db_session),
    user: User = Depends(get_current_user),
) -> ExportCreateResponse:
    try:
        fid = uuid.UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID")

    result = await db.execute(select(PdfFile).where(PdfFile.id == fid))
    pdf_file = result.scalar_one_or_none()

    if pdf_file is None or pdf_file.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    export = Export(
        file_id=fid,
        status=EditStatus.pending,
    )
    db.add(export)
    await db.commit()
    await db.refresh(export)

    export_pdf_task.delay(str(export.id))

    return ExportCreateResponse(
        export_id=str(export.id),
        status=export.status.value,
    )


@router.get("/{export_id}/status")
async def export_status(
    export_id: str,
    db: AsyncSession = Depends(db_session),
    user: User = Depends(get_current_user),
) -> ExportStatusResponse:
    try:
        eid = uuid.UUID(export_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid export ID")

    result = await db.execute(
        select(Export)
        .join(PdfFile, Export.file_id == PdfFile.id)
        .where(Export.id == eid, PdfFile.user_id == user.id)
    )
    export = result.scalar_one_or_none()

    if export is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export not found")

    return ExportStatusResponse(
        export_id=str(export.id),
        status=export.status.value,
        download_url=export.download_url,
        expires_at=export.expires_at,
    )

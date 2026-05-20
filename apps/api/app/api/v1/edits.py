import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import db_session, get_current_user
from app.models.edit_operation import EditOperation
from app.models.pdf_file import PdfFile
from app.models.pdf_object import PdfObject
from app.models.user import User
from app.schemas.edit import BulkEditIn

router = APIRouter()


@router.post("/{file_id}")
async def apply_edits(
    file_id: str,
    body: BulkEditIn,
    db: AsyncSession = Depends(db_session),
    user: User = Depends(get_current_user),
) -> dict[str, object]:
    try:
        fid = uuid.UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID")

    result = await db.execute(select(PdfFile).where(PdfFile.id == fid))
    pdf_file = result.scalar_one_or_none()

    if pdf_file is None or pdf_file.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    object_ids = []
    for op in body.operations:
        object_id = op["object_id"]
        if not isinstance(object_id, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid object ID",
            )
        try:
            object_ids.append(uuid.UUID(object_id))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid object ID: {object_id}",
            )

    if object_ids:
        result = await db.execute(
            select(PdfObject.id).where(PdfObject.file_id == fid, PdfObject.id.in_(object_ids))
        )
        found_ids = set(result.scalars().all())
        missing_ids = [str(object_id) for object_id in object_ids if object_id not in found_ids]
        if missing_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Objects not found for file: {', '.join(missing_ids)}",
            )

    op_records = []
    for op in body.operations:
        record = EditOperation(
            file_id=fid,
            user_id=user.id,
            operation=op,
        )
        db.add(record)
        op_records.append(record)

    await db.commit()

    return {
        "file_id": file_id,
        "applied": len(op_records),
        "operation_ids": [str(r.id) for r in op_records],
    }

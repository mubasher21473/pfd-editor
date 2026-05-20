import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import db_session, get_current_user
from app.models.pdf_file import PdfFile
from app.models.pdf_object import ObjectType, PdfObject
from app.models.user import User
from app.schemas.object import ObjectTree, PdfObjectOut

router = APIRouter()


@router.get("/{file_id}")
async def get_objects(
    file_id: str,
    object_type: str | None = None,
    db: AsyncSession = Depends(db_session),
    user: User = Depends(get_current_user),
) -> ObjectTree:
    try:
        fid = uuid.UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID")

    result = await db.execute(select(PdfFile).where(PdfFile.id == fid))
    pdf_file = result.scalar_one_or_none()

    if pdf_file is None or pdf_file.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    query = select(PdfObject).where(PdfObject.file_id == fid)
    if object_type:
        try:
            object_type_filter = ObjectType(object_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported object type: {object_type}",
            )
        query = query.where(PdfObject.object_type == object_type_filter)

    objects_result = await db.execute(query.order_by(PdfObject.page_index, PdfObject.id))
    objects = objects_result.scalars().all()

    return ObjectTree(
        file_id=file_id,
        objects=[
            PdfObjectOut(
                id=str(obj.id),
                page_index=obj.page_index,
                object_type=obj.object_type.value,
                x=obj.x,
                y=obj.y,
                width=obj.width,
                height=obj.height,
                fill_color=obj.fill_color,
                stroke_color=obj.stroke_color,
                font_name=obj.font_name,
                font_size=obj.font_size,
                text_content=obj.text_content,
                raw_attrs=obj.raw_attrs,
            )
            for obj in objects
            if obj.object_type.value != "page"
        ],
    )

import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import db_session, get_current_user
from app.models.pdf_file import PdfFile
from app.models.pdf_object import ObjectType, PdfObject
from app.models.user import User
from app.schemas.object import ObjectTree, PdfObjectOut
from app.services.storage import StorageService

router = APIRouter()

ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/gif",
    "image/webp", "image/bmp", "image/tiff",
}


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


@router.post("/{file_id}/upload-image")
async def upload_replacement_image(
    file_id: str,
    file: UploadFile,
    object_id: str = Form(...),
    db: AsyncSession = Depends(db_session),
    user: User = Depends(get_current_user),
) -> dict[str, str]:
    try:
        fid = uuid.UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID")

    try:
        oid = uuid.UUID(object_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid object ID")

    result = await db.execute(select(PdfFile).where(PdfFile.id == fid))
    pdf_file = result.scalar_one_or_none()
    if pdf_file is None or pdf_file.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    obj_result = await db.execute(
        select(PdfObject).where(PdfObject.id == oid, PdfObject.file_id == fid)
    )
    pdf_object = obj_result.scalar_one_or_none()
    if pdf_object is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found")
    if pdf_object.object_type != ObjectType.image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Object is not an image",
        )

    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type '{content_type}'. "
                   f"Allowed: {', '.join(sorted(ALLOWED_IMAGE_TYPES))}",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Empty image file"
        )

    image_id = uuid.uuid4()
    filename = file.filename or "image.jpg"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    image_key = f"users/{user.id}/files/{fid}/images/{image_id}.{ext}"

    storage = StorageService()
    storage.upload_bytes(image_key, content)

    return {"image_s3_key": image_key}

import uuid

from sqlalchemy import delete, select

from app.db.session import get_sync_session
from app.models.pdf_file import PdfFile
from app.models.pdf_object import ObjectType, PdfObject
from app.models.user import User  # noqa: F401 - needed for FK resolution
from app.services.pdf_parser import PdfParserService
from app.services.storage import StorageService
from app.tasks.celery_app import celery_app


@celery_app.task(name="parse_pdf", bind=True, max_retries=3)
def parse_pdf_task(self, file_id: str) -> str:
    storage = StorageService()
    parser = PdfParserService()
    session = get_sync_session()

    try:
        result = session.execute(select(PdfFile).where(PdfFile.id == uuid.UUID(file_id)))
        pdf_file = result.scalar_one_or_none()
        if pdf_file is None:
            return f"File {file_id} not found"

        pdf_file.parse_status = "processing"
        pdf_file.page_count = 0
        session.execute(delete(PdfObject).where(PdfObject.file_id == pdf_file.id))
        session.commit()

        pdf_bytes = storage.download_bytes(pdf_file.s3_key)
        parsed_objects = parser.parse(pdf_bytes)

        for obj in parsed_objects:
            if obj["object_type"] == "page":
                pdf_file.page_count += 1
                continue

            pdf_obj = PdfObject(
                file_id=pdf_file.id,
                page_index=obj["page_index"],
                object_type=ObjectType(obj["object_type"]),
                stream_index=obj["stream_index"],
                x=obj["x"],
                y=obj["y"],
                width=obj["width"],
                height=obj["height"],
                font_name=obj["font_name"],
                font_size=obj["font_size"],
                text_content=obj["text_content"],
                fill_color=obj["fill_color"],
                stroke_color=obj["stroke_color"],
                raw_attrs=obj["raw_attrs"] if obj["raw_attrs"] else None,
            )
            session.add(pdf_obj)

        pdf_file.parse_status = "parsed"
        session.commit()

        return f"Parsed {len(parsed_objects)} objects for file {file_id}"

    except Exception as exc:
        session.rollback()
        result = session.execute(select(PdfFile).where(PdfFile.id == uuid.UUID(file_id)))
        pdf_file = result.scalar_one_or_none()
        if pdf_file is not None:
            pdf_file.parse_status = "failed"
            session.commit()
        raise self.retry(exc=exc)

    finally:
        session.close()

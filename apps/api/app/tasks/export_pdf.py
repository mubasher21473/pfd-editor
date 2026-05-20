import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db.session import get_sync_session
from app.models.edit_operation import EditOperation, EditStatus, Export
from app.models.pdf_file import PdfFile
from app.models.user import User  # noqa: F401 - needed for FK resolution
from app.services.pdf_editor import PdfEditorService
from app.services.storage import StorageService
from app.tasks.celery_app import celery_app


@celery_app.task(name="export_pdf", bind=True, max_retries=3)
def export_pdf_task(self, export_id: str) -> str:
    storage = StorageService()
    editor = PdfEditorService()
    session = get_sync_session()

    try:
        result = session.execute(select(Export).where(Export.id == uuid.UUID(export_id)))
        export = result.scalar_one_or_none()
        if export is None:
            return f"Export {export_id} not found"

        export.status = EditStatus.processing
        session.commit()

        result = session.execute(select(PdfFile).where(PdfFile.id == export.file_id))
        pdf_file = result.scalar_one_or_none()
        if pdf_file is None:
            export.status = EditStatus.failed
            session.commit()
            return f"File {export.file_id} not found"

        pdf_bytes = storage.download_bytes(pdf_file.s3_key)

        ops_result = session.execute(
            select(EditOperation)
            .where(EditOperation.file_id == export.file_id)
            .order_by(EditOperation.applied_at)
        )
        operations = ops_result.scalars().all()

        # Build op dicts; pre-load image bytes for replace_image ops so the editor
        # service can work purely on in-memory data without S3 access.
        op_dicts = []
        for op in operations:
            op_dict = dict(op.operation)
            if op_dict.get("op") == "replace_image" and isinstance(
                op_dict.get("image_s3_key"), str
            ):
                try:
                    op_dict["image_bytes"] = storage.download_bytes(
                        str(op_dict["image_s3_key"])
                    )
                except Exception:
                    pass  # editor will skip ops with missing image_bytes
            op_dicts.append(op_dict)

        output_bytes = editor.apply_operations(pdf_bytes, op_dicts)

        export_key = f"users/{pdf_file.user_id}/files/{pdf_file.id}/exports/{export_id}.pdf"
        storage.upload_bytes(export_key, output_bytes)

        presigned = storage.presigned_download_url(export_key, expires_in=timedelta(hours=24))

        export.s3_key = export_key
        export.download_url = presigned
        export.expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        export.status = EditStatus.done
        session.commit()

        return f"Exported {export_id} ({len(operations)} operations applied)"

    except Exception as exc:
        session.rollback()
        result = session.execute(select(Export).where(Export.id == uuid.UUID(export_id)))
        export = result.scalar_one_or_none()
        if export is not None:
            export.status = EditStatus.failed
            session.commit()
        raise self.retry(exc=exc)

    finally:
        session.close()

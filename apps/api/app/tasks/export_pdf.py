from app.tasks.celery_app import celery_app


@celery_app.task(name="export_pdf")
def export_pdf_task(file_id: str) -> str:
    return file_id

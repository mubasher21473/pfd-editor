from app.tasks.celery_app import celery_app


@celery_app.task(name="parse_pdf")
def parse_pdf_task(file_id: str) -> str:
    return file_id

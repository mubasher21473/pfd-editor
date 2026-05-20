from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "pdf_object_editor",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.parse_pdf", "app.tasks.export_pdf"],
)

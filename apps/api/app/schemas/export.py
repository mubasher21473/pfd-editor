from datetime import datetime

from pydantic import BaseModel


class ExportCreateResponse(BaseModel):
    export_id: str
    status: str


class ExportStatusResponse(BaseModel):
    export_id: str
    status: str
    download_url: str | None = None
    expires_at: datetime | None = None

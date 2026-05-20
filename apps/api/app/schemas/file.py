from datetime import datetime

from pydantic import BaseModel


class FileUploadResponse(BaseModel):
    file_id: str
    original_name: str
    parse_status: str
    file_size_bytes: int | None = None


class FileListItem(BaseModel):
    id: str
    original_name: str
    parse_status: str
    file_size_bytes: int | None = None
    page_count: int | None = None
    created_at: datetime


class FileDetail(FileListItem):
    pass


class FileDownloadResponse(BaseModel):
    file_id: str
    download_url: str

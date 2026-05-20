from pydantic import BaseModel


class FileUploadResponse(BaseModel):
    file_id: str


class FileListItem(BaseModel):
    id: str
    original_name: str
    parse_status: str

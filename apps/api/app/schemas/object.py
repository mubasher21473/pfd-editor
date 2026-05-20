from pydantic import BaseModel


class PdfObjectOut(BaseModel):
    id: str
    page_index: int
    object_type: str
    raw_attrs: dict[str, object] | None = None


class ObjectTree(BaseModel):
    file_id: str
    objects: list[PdfObjectOut]

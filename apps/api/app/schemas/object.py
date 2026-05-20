from pydantic import BaseModel


class PdfObjectOut(BaseModel):
    id: str
    page_index: int
    object_type: str
    x: float | None = None
    y: float | None = None
    width: float | None = None
    height: float | None = None
    fill_color: str | None = None
    stroke_color: str | None = None
    font_name: str | None = None
    font_size: float | None = None
    text_content: str | None = None
    raw_attrs: dict[str, object] | None = None


class ObjectTree(BaseModel):
    file_id: str
    objects: list[PdfObjectOut]

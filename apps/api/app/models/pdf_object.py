import enum
import uuid

from sqlalchemy import Enum, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ObjectType(str, enum.Enum):
    text = "text"
    path = "path"
    image = "image"
    form_xobject = "form_xobject"


class PdfObject(Base):
    __tablename__ = "pdf_objects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pdf_files.id", ondelete="CASCADE")
    )
    page_index: Mapped[int] = mapped_column(Integer, nullable=False)
    object_type: Mapped[ObjectType] = mapped_column(Enum(ObjectType), nullable=False)
    stream_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    x: Mapped[float | None] = mapped_column(Float, nullable=True)
    y: Mapped[float | None] = mapped_column(Float, nullable=True)
    width: Mapped[float | None] = mapped_column(Float, nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    fill_color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    stroke_color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    font_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    font_size: Mapped[float | None] = mapped_column(Float, nullable=True)
    text_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_attrs: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)


Index("idx_pdf_objects_file_id", PdfObject.file_id)
Index("idx_pdf_objects_fill_color", PdfObject.fill_color)
Index("idx_pdf_objects_type", PdfObject.object_type)

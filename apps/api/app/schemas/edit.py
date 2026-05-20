from pydantic import BaseModel, field_validator


class ReplaceTextOp(BaseModel):
    op: str = "replace_text"
    object_id: str
    old_text: str
    text: str


class SetFontSizeOp(BaseModel):
    op: str = "set_font_size"
    object_id: str
    font_size: float


class SetFillColorOp(BaseModel):
    op: str = "set_fill_color"
    object_id: str
    color: str


class MoveOp(BaseModel):
    op: str = "move"
    object_id: str
    x: float
    y: float


class ResizeOp(BaseModel):
    op: str = "resize"
    object_id: str
    width: float
    height: float


class HideOp(BaseModel):
    op: str = "hide"
    object_id: str


class DeleteOp(BaseModel):
    op: str = "delete"
    object_id: str


class BulkEditIn(BaseModel):
    operations: list[dict[str, object]]

    @field_validator("operations")
    @classmethod
    def validate_operations(cls, ops: list[dict[str, object]]) -> list[dict[str, object]]:
        supported = {
            "replace_text", "set_font_size", "set_fill_color",
            "move", "resize", "hide", "delete",
        }
        for op in ops:
            if "object_id" not in op:
                raise ValueError("Each operation must have an object_id")
            if "op" not in op or op["op"] not in supported:
                raise ValueError(f"Unsupported operation: {op.get('op')}. Supported: {supported}")
        return ops

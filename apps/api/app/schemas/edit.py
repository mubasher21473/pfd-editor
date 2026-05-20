from pydantic import BaseModel


class EditOperationIn(BaseModel):
    object_id: str
    op: str
    value: object


class BulkEditIn(BaseModel):
    operations: list[EditOperationIn]

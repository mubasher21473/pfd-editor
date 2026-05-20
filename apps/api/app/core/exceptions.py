from fastapi import HTTPException


class OwnershipError(HTTPException):
    def __init__(self) -> None:
        super().__init__(status_code=403, detail="Resource ownership validation failed")

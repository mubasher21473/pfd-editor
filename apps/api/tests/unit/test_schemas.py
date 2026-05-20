from app.schemas.file import FileUploadResponse


def test_schema_instantiation() -> None:
    dto = FileUploadResponse(file_id="abc")
    assert dto.file_id == "abc"

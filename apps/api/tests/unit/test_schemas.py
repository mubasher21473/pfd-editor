from app.schemas.file import FileUploadResponse


def test_schema_instantiation() -> None:
    dto = FileUploadResponse(
        file_id="abc",
        original_name="sample.pdf",
        parse_status="pending",
        file_size_bytes=100,
    )
    assert dto.file_id == "abc"

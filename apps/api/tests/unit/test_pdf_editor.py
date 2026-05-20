from app.services.pdf_editor import PdfEditorService


def test_editor_returns_bytes() -> None:
    service = PdfEditorService()
    payload = b"sample"
    assert service.apply_operations(payload, []) == payload

class PdfEditorService:
    def apply_operations(self, pdf_bytes: bytes, operations: list[dict[str, object]]) -> bytes:
        _ = operations
        return pdf_bytes

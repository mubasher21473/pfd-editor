class PdfExporterService:
    def validate_output(self, pdf_bytes: bytes) -> bool:
        return len(pdf_bytes) > 0

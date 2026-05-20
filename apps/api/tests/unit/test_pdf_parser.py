from app.services.pdf_parser import PdfParserService


def test_parser_returns_list(monkeypatch) -> None:
    monkeypatch.setattr("app.services.pdf_parser.extract_pages", lambda _pdf: [])

    parser = PdfParserService()
    assert isinstance(parser.parse(b"%PDF"), list)

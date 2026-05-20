from app.services.pdf_parser import PdfParserService


def test_parser_returns_list() -> None:
    parser = PdfParserService()
    assert isinstance(parser.parse(b"%PDF"), list)

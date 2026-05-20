import io

from pdfminer.high_level import extract_pages
from pdfminer.layout import LTChar, LTTextBox


def _bbox(obj) -> tuple[float, float, float, float]:
    return obj.bbox  # (x0, y0, x1, y1)


class PdfParserService:
    def parse(self, pdf_bytes: bytes) -> list[dict]:
        objects: list[dict] = []
        pages = extract_pages(io.BytesIO(pdf_bytes))

        for page_index, page in enumerate(pages):
            page_bbox = _bbox(page)
            objects.append({
                "page_index": page_index,
                "object_type": "page",
                "stream_index": None,
                "x": page_bbox[0],
                "y": page_bbox[1],
                "width": page_bbox[2] - page_bbox[0],
                "height": page_bbox[3] - page_bbox[1],
                "font_name": None,
                "font_size": None,
                "text_content": None,
                "fill_color": None,
                "stroke_color": None,
                "raw_attrs": {},
            })

            self._extract(element=page, page_index=page_index, objects=objects)

        return objects

    def _extract(self, element, page_index: int, objects: list[dict]) -> None:
        from pdfminer.layout import LTCurve, LTFigure

        if isinstance(element, LTTextBox):
            text = element.get_text().strip()
            if not text:
                return
            x0, y0, x1, y1 = _bbox(element)
            font_name, font_size = self._first_font(element)
            objects.append({
                "page_index": page_index,
                "object_type": "text",
                "stream_index": None,
                "x": x0,
                "y": y0,
                "width": x1 - x0,
                "height": y1 - y0,
                "font_name": font_name,
                "font_size": font_size,
                "text_content": text,
                "fill_color": None,
                "stroke_color": None,
                "raw_attrs": {},
            })

        elif isinstance(element, LTCurve):
            x0, y0, x1, y1 = _bbox(element)
            objects.append({
                "page_index": page_index,
                "object_type": "path",
                "stream_index": None,
                "x": x0,
                "y": y0,
                "width": x1 - x0,
                "height": y1 - y0,
                "font_name": None,
                "font_size": None,
                "text_content": None,
                "fill_color": None,
                "stroke_color": None,
                "raw_attrs": {},
            })

        elif isinstance(element, LTFigure):
            for child in element:
                self._extract(child, page_index, objects)
            return

        # Recurse into any container
        if hasattr(element, "__iter__"):
            for child in element:
                self._extract(child, page_index, objects)

    def _first_font(self, element) -> tuple[str | None, float | None]:
        if isinstance(element, LTChar):
            return element.fontname, element.size

        if hasattr(element, "__iter__"):
            for child in element:
                font_name, font_size = self._first_font(child)
                if font_name is not None:
                    return font_name, font_size

        return None, None

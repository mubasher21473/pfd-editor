import io

from pdfminer.high_level import extract_pages
from pdfminer.layout import LTChar, LTTextBox


def _bbox(obj) -> tuple[float, float, float, float]:
    return obj.bbox  # (x0, y0, x1, y1)


def _color_to_hex(color: object) -> str | None:
    """Convert a pdfminer color value to a CSS hex string, or None if not convertible."""
    if color is None:
        return None
    try:
        if isinstance(color, (int, float)):
            v = max(0, min(255, int(float(color) * 255)))
            return f"#{v:02x}{v:02x}{v:02x}"
        if isinstance(color, (list, tuple)):
            if len(color) == 3:
                r, g, b = (max(0, min(255, int(c * 255))) for c in color)
                return f"#{r:02x}{g:02x}{b:02x}"
            if len(color) == 4:
                # CMYK to RGB
                c, m, y, k = (float(x) for x in color)
                r = max(0, min(255, int((1 - c) * (1 - k) * 255)))
                g = max(0, min(255, int((1 - m) * (1 - k) * 255)))
                b = max(0, min(255, int((1 - y) * (1 - k) * 255)))
                return f"#{r:02x}{g:02x}{b:02x}"
    except Exception:
        pass
    return None


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
        from pdfminer.layout import LTCurve, LTFigure, LTImage

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

        elif isinstance(element, LTImage):
            x0, y0, x1, y1 = _bbox(element)
            objects.append({
                "page_index": page_index,
                "object_type": "image",
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
                "raw_attrs": {"xobject_name": element.name},
            })
            return  # images have no children

        elif isinstance(element, LTCurve):
            x0, y0, x1, y1 = _bbox(element)
            fill_color = _color_to_hex(getattr(element, "non_stroking_color", None))
            stroke_color = _color_to_hex(getattr(element, "stroking_color", None))
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
                "fill_color": fill_color,
                "stroke_color": stroke_color,
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

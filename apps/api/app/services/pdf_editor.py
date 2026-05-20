from __future__ import annotations

import io
import re
from typing import Any


class PdfEditorService:
    def apply_operations(self, pdf_bytes: bytes, operations: list[dict]) -> bytes:
        if not operations:
            return pdf_bytes

        from pikepdf import Pdf

        pdf = Pdf.open(io.BytesIO(pdf_bytes))

        for op in operations:
            op_type = op.get("op")
            handler = {
                "replace_text": self._replace_text,
                "set_fill_color": self._set_fill_color,
                "set_stroke_color": self._set_stroke_color,
                "set_font_size": self._set_font_size,
                "hide": self._hide_object,
                "delete": self._delete_object,
                "move": self._move_object,
                "replace_image": self._replace_image,
            }.get(op_type)
            if handler:
                handler(pdf, op)

        buf = io.BytesIO()
        pdf.save(buf)
        return buf.getvalue()

    def _replace_text(self, pdf: Any, op: dict) -> None:
        import pikepdf

        old_text = op.get("old_text", "")
        new_text = op.get("text", "")
        if not old_text:
            return

        for page in pdf.pages:
            if page.Contents is None:
                continue
            try:
                raw = page.Contents.read_bytes()
                decoded = raw.decode("latin-1")
                if old_text in decoded:
                    decoded = decoded.replace(old_text, new_text)
                    page.Contents = pikepdf.Stream(pdf, decoded.encode("latin-1"))
            except Exception:
                pass

    def _set_fill_color(self, pdf: Any, op: dict) -> None:
        import pikepdf

        color = op.get("color", "")
        if not color:
            return

        for page in pdf.pages:
            if page.Contents is None:
                continue
            try:
                raw = page.Contents.read_bytes()
                decoded = raw.decode("latin-1")
                decoded = self._inject_color(decoded, color)
                page.Contents = pikepdf.Stream(pdf, decoded.encode("latin-1"))
            except Exception:
                pass

    def _set_font_size(self, pdf: Any, op: dict) -> None:
        import pikepdf

        font_size = op.get("font_size")
        if font_size is None:
            return

        for page in pdf.pages:
            if page.Contents is None:
                continue
            try:
                raw = page.Contents.read_bytes()
                decoded = raw.decode("latin-1")
                decoded = re.sub(
                    r"(/[A-Za-z0-9_+\-\.]+)\s+[\d\.]+\s+Tf",
                    rf"\1 {font_size} Tf",
                    decoded,
                )
                page.Contents = pikepdf.Stream(pdf, decoded.encode("latin-1"))
            except Exception:
                pass

    def _hide_object(self, pdf: Any, op: dict) -> None:
        import pikepdf

        for page in pdf.pages:
            if page.Contents is None:
                continue
            try:
                raw = page.Contents.read_bytes()
                decoded = raw.decode("latin-1")

                page_box = self._get_media_box(page)
                if page_box:
                    w = page_box[2] - page_box[0]
                    h = page_box[3] - page_box[1]
                    cover = f"\n1 1 1 rg {w * 0.05} {h * 0.05} {w * 0.9} {h * 0.9} re f\n"
                    decoded = cover + decoded

                page.Contents = pikepdf.Stream(pdf, decoded.encode("latin-1"))
            except Exception:
                pass

    def _delete_object(self, pdf: Any, op: dict) -> None:
        import pikepdf

        old_text = op.get("old_text", "")
        if not old_text:
            return

        for page in pdf.pages:
            if page.Contents is None:
                continue
            try:
                raw = page.Contents.read_bytes()
                decoded = raw.decode("latin-1")
                decoded = decoded.replace(f"({old_text}) Tj", "")
                decoded = decoded.replace(f"({old_text})\"", "")
                decoded = decoded.replace(f"({old_text})'", "")
                decoded = re.sub(
                    re.escape(f"({old_text})") + r"\s*TJ",
                    "TJ",
                    decoded,
                )
                page.Contents = pikepdf.Stream(pdf, decoded.encode("latin-1"))
            except Exception:
                pass

    def _set_stroke_color(self, pdf: Any, op: dict) -> None:
        import pikepdf

        color = op.get("color", "")
        if not color:
            return

        for page in pdf.pages:
            if page.Contents is None:
                continue
            try:
                raw = page.Contents.read_bytes()
                decoded = raw.decode("latin-1")
                decoded = self._inject_stroke_color(decoded, color)
                page.Contents = pikepdf.Stream(pdf, decoded.encode("latin-1"))
            except Exception:
                pass

    def _replace_image(self, pdf: Any, op: dict) -> None:
        xobject_name = op.get("xobject_name")
        image_bytes = op.get("image_bytes")  # pre-loaded by export task
        if not xobject_name or not image_bytes:
            return

        try:
            import io

            import pikepdf
            from PIL import Image

            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            jpeg_buf = io.BytesIO()
            img.save(jpeg_buf, format="JPEG", quality=90)
            jpeg_data = jpeg_buf.getvalue()
            w, h = img.size

            for page in pdf.pages:
                try:
                    if "/Resources" not in page:
                        continue
                    resources = page["/Resources"]
                    if "/XObject" not in resources:
                        continue
                    xobjects = resources["/XObject"]
                    key = f"/{xobject_name}"
                    if key not in xobjects:
                        continue
                    new_img = pikepdf.Stream(pdf, jpeg_data)
                    new_img.stream_dict = pikepdf.Dictionary(
                        Type=pikepdf.Name("/XObject"),
                        Subtype=pikepdf.Name("/Image"),
                        Width=w,
                        Height=h,
                        ColorSpace=pikepdf.Name("/DeviceRGB"),
                        BitsPerComponent=8,
                        Filter=pikepdf.Name("/DCTDecode"),
                    )
                    xobjects[key] = new_img
                except Exception:
                    pass
        except Exception:
            pass

    def _move_object(self, pdf: Any, op: dict) -> None:
        pass

    def _inject_color(self, content: str, color: str) -> str:
        hex_color = color.lstrip("#")
        if len(hex_color) != 6:
            return content
        r = int(hex_color[0:2], 16) / 255.0
        g = int(hex_color[2:4], 16) / 255.0
        b = int(hex_color[4:6], 16) / 255.0

        parts = re.split(r"(\(.*?\)\s*Tj)", content)
        result = []
        for part in parts:
            if re.match(r"\(.*?\)\s*Tj", part) and result:
                result.insert(len(result) - 1, f"\n{r:.3f} {g:.3f} {b:.3f} rg\n")
                result.append(part)
            else:
                result.append(part)
        return "".join(result)

    def _inject_stroke_color(self, content: str, color: str) -> str:
        hex_color = color.lstrip("#")
        if len(hex_color) != 6:
            return content
        r = int(hex_color[0:2], 16) / 255.0
        g = int(hex_color[2:4], 16) / 255.0
        b = int(hex_color[4:6], 16) / 255.0

        # Use uppercase RG operator for stroking color
        parts = re.split(r"(\(.*?\)\s*Tj)", content)
        result = []
        for part in parts:
            if re.match(r"\(.*?\)\s*Tj", part) and result:
                result.insert(len(result) - 1, f"\n{r:.3f} {g:.3f} {b:.3f} RG\n")
                result.append(part)
            else:
                result.append(part)
        return "".join(result)

    def _get_media_box(self, page: Any) -> list[float] | None:
        try:
            box = page.MediaBox
            return [float(box[0]), float(box[1]), float(box[2]), float(box[3])]
        except Exception:
            return None

export type ObjectType = "text" | "path" | "image" | "form_xobject";

export interface PdfObject {
  id: string;
  page_index: number;
  object_type: ObjectType;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill_color?: string;
  stroke_color?: string;
  font_name?: string;
  font_size?: number;
  text_content?: string;
  raw_attrs?: Record<string, unknown>;
}

export interface PdfPage {
  index: number;
  objects: PdfObject[];
}

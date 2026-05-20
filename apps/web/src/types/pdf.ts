export type ObjectType = "text" | "path" | "image" | "form_xobject";

export interface PdfObject {
  id: string;
  pageIndex: number;
  objectType: ObjectType;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  textContent?: string;
  rawAttrs?: Record<string, unknown>;
}

export interface PdfPage {
  index: number;
  objects: PdfObject[];
}

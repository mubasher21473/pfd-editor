import type { PdfObject } from "@/types/pdf";

export interface EditOperation {
  object_id: string;
  op: string;
  [key: string]: unknown;
}

export interface EditorState {
  fileId: string | null;
  selectedObjectIds: string[];
  objects: PdfObject[];
  parseStatus: string;
  loading: boolean;
  error: string | null;
  exportId: string | null;
  exportStatus: string | null;
  exportUrl: string | null;
}

import type { PdfObject } from "@/types/pdf";

export interface FileListItem {
  id: string;
  original_name: string;
  parse_status: string;
}

export interface ObjectTree {
  file_id: string;
  objects: PdfObject[];
}

import type { PdfObject } from "@/types/pdf";

export interface FileListItem {
  id: string;
  original_name: string;
  parse_status: string;
  file_size_bytes: number | null;
  page_count: number | null;
  created_at: string;
}

export type FileDetail = FileListItem;

export interface FileUploadResponse {
  file_id: string;
  original_name: string;
  parse_status: string;
  file_size_bytes: number | null;
}

export interface FileDownloadResponse {
  file_id: string;
  download_url: string;
}

export interface ObjectTree {
  file_id: string;
  objects: PdfObject[];
}

export interface ExportCreateResponse {
  export_id: string;
  status: string;
}

export interface ExportStatusResponse {
  export_id: string;
  status: string;
  download_url: string | null;
  expires_at: string | null;
}

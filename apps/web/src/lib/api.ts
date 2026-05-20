import type { EditOperation } from "@/types/editor";
import type {
  ExportCreateResponse,
  ExportStatusResponse,
  FileDetail,
  FileDownloadResponse,
  FileListItem,
  FileUploadResponse,
  ObjectTree,
} from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function apiUrl(path: string): string {
  return `${API_BASE}/api/v1${path}`;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...rest } = options;
  const isFormData = rest.body instanceof FormData;

  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...rest,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  files: {
    upload: (formData: FormData, token?: string) =>
      apiFetch<FileUploadResponse>("/files/upload", {
        method: "POST",
        body: formData,
        token,
      }),
    list: (token?: string) => apiFetch<FileListItem[]>("/files", { token }),
    get: (fileId: string, token?: string) => apiFetch<FileDetail>(`/files/${fileId}`, { token }),
    delete: (fileId: string, token?: string) =>
      apiFetch<{ deleted: string }>(`/files/${fileId}`, {
        method: "DELETE",
        token,
      }),
    download: (fileId: string, token?: string) =>
      apiFetch<FileDownloadResponse>(`/files/${fileId}/download`, { token }),
    contentUrl: (fileId: string) => apiUrl(`/files/${fileId}/content`),
  },
  objects: {
    get: (fileId: string, token?: string, objectType?: string) =>
      apiFetch<ObjectTree>(
        `/objects/${fileId}${objectType ? `?object_type=${encodeURIComponent(objectType)}` : ""}`,
        { token }
      ),
  },
  edits: {
    apply: (fileId: string, ops: EditOperation[], token?: string) =>
      apiFetch<{ file_id: string; applied: number; operation_ids: string[] }>(
        `/edits/${fileId}`,
        {
          method: "POST",
          body: JSON.stringify({ operations: ops }),
          token,
        }
      ),
  },
  export: {
    trigger: (fileId: string, token?: string) =>
      apiFetch<ExportCreateResponse>(`/export/${fileId}`, {
        method: "POST",
        token,
      }),
    status: (exportId: string, token?: string) =>
      apiFetch<ExportStatusResponse>(`/export/${exportId}/status`, { token }),
  },
};

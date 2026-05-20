import type { EditOperation } from "@/types/editor";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
      ...rest.headers
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  files: {
    upload: (formData: FormData, token: string) =>
      apiFetch<{ file_id: string }>("/files/upload", {
        method: "POST",
        body: formData,
        token
      }),
    list: (token: string) => apiFetch("/files", { token }),
    delete: (fileId: string, token: string) =>
      apiFetch(`/files/${fileId}`, { method: "DELETE", token })
  },
  objects: {
    get: (fileId: string, token: string) => apiFetch(`/objects/${fileId}`, { token })
  },
  edits: {
    apply: (fileId: string, ops: EditOperation[], token: string) =>
      apiFetch<{ job_id: string }>(`/edits/${fileId}`, {
        method: "POST",
        body: JSON.stringify({ operations: ops }),
        token
      })
  },
  export: {
    trigger: (fileId: string, token: string) =>
      apiFetch<{ download_url: string }>(`/export/${fileId}`, {
        method: "POST",
        token
      })
  }
};

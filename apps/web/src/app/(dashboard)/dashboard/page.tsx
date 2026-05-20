"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import DropZone from "@/components/upload/DropZone";
import type { FileListItem } from "@/types/api";

export default function DashboardPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setError(null);
      const data = await api.files.list();
      setFiles(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    const hasPendingFiles = files.some((file) =>
      ["pending", "processing"].includes(file.parse_status)
    );
    if (!hasPendingFiles) {
      return;
    }

    const timer = setInterval(fetchFiles, 2500);
    return () => clearInterval(timer);
  }, [fetchFiles, files]);

  const handleUploaded = useCallback(
    (fileId: string) => {
      router.push(`/editor/${fileId}`);
    },
    [router]
  );

  const handleDelete = useCallback(
    async (fileId: string) => {
      try {
        await api.files.delete(fileId);
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    },
    []
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Upload PDF</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload a PDF and it will open in the editor immediately.
        </p>
      </div>
      <DropZone onUploaded={handleUploaded} />

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? null : files.length > 0 ? (
        <div className="rounded border bg-white p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-700">Recent files</h3>
          <div className="space-y-2">
            {files.slice(0, 5).map((file) => (
              <div key={file.id} className="flex items-center justify-between gap-3 text-sm">
                <button
                  onClick={() => router.push(`/editor/${file.id}`)}
                  className="min-w-0 truncate text-left font-medium text-slate-900 hover:underline"
                >
                  {file.original_name}
                </button>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-slate-500">{file.parse_status}</span>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

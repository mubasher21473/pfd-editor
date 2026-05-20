"use client";

import Link from "next/link";
import type { FileListItem } from "@/types/api";

interface Props {
  file: FileListItem;
  onDelete: (id: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Queued",
  processing: "Parsing...",
  parsed: "Ready",
  failed: "Failed",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-600 bg-yellow-50",
  processing: "text-blue-600 bg-blue-50",
  parsed: "text-green-600 bg-green-50",
  failed: "text-red-600 bg-red-50",
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileCard({ file, onDelete }: Props) {
  const statusClass = STATUS_COLORS[file.parse_status] ?? "text-slate-600 bg-slate-50";

  return (
    <div className="flex items-center justify-between rounded border bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{file.original_name}</p>
        <div className="mt-1 flex gap-3 text-sm text-slate-500">
          <span>{formatBytes(file.file_size_bytes)}</span>
          {file.page_count != null && <span>{file.page_count} pages</span>}
          <span className={statusClass}>
            {STATUS_LABELS[file.parse_status] ?? file.parse_status}
          </span>
        </div>
      </div>
      <div className="ml-4 flex items-center gap-2">
        {file.parse_status === "parsed" && (
          <Link
            href={`/editor/${file.id}`}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
          >
            Edit
          </Link>
        )}
        <button
          onClick={() => onDelete(file.id)}
          className="rounded border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

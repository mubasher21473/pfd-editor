"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Brush,
  ChevronDown,
  Eraser,
  FileText,
  Highlighter,
  ImagePlus,
  Link,
  MousePointer2,
  PenLine,
  PenTool,
  Printer,
  Redo2,
  Search,
  Settings,
  Stamp,
  StickyNote,
  Type,
  Undo2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";

const tools = [
  { label: "Undo", icon: Undo2, muted: false, action: "undo" as const },
  { label: "Redo", icon: Redo2, muted: false, action: "redo" as const },
  { label: "Add text", icon: Type, active: true, action: null },
  { label: "Edit text", icon: PenLine, action: null },
  { label: "Sign", icon: PenTool, action: null },
  { label: "Line", icon: MousePointer2, menu: true, action: null },
  { label: "Draw", icon: Brush, action: null },
  { label: "Eraser", icon: Eraser, action: null },
  { label: "Highlight", icon: Highlighter, action: null },
  { label: "Text highlight", icon: Type, action: null },
  { label: "Image", icon: ImagePlus, action: null },
  { label: "Stamp", icon: Stamp, action: null },
  { label: "Link", icon: Link, action: null },
  { label: "Note", icon: StickyNote, action: null },
];

export default function Toolbar() {
  const fileId = useEditorStore((s) => s.fileId);
  const pendingEdits = useEditorStore((s) => s.pendingEdits);
  const clearPendingEdits = useEditorStore((s) => s.clearPendingEdits);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const setSaveStatus = useEditorStore((s) => s.setSaveStatus);
  const exportId = useEditorStore((s) => s.exportId);
  const exportStatus = useEditorStore((s) => s.exportStatus);
  const exportUrl = useEditorStore((s) => s.exportUrl);
  const setExportId = useEditorStore((s) => s.setExportId);
  const setExportStatus = useEditorStore((s) => s.setExportStatus);
  const setExportUrl = useEditorStore((s) => s.setExportUrl);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const historyIndex = useEditorStore((s) => s.historyIndex);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSave = useCallback(async () => {
    if (!fileId || pendingEdits.length === 0) return;
    try {
      setSaveStatus("saving");
      await api.edits.apply(fileId, pendingEdits);
      clearPendingEdits();
    } catch (e) {
      setSaveStatus("failed");
      alert(e instanceof Error ? e.message : "Save failed");
    }
  }, [fileId, pendingEdits, clearPendingEdits, setSaveStatus]);

  const handleExport = useCallback(async () => {
    if (!fileId) return;
    try {
      const res = await api.export.trigger(fileId);
      setExportId(res.export_id);
      setExportStatus(res.status);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    }
  }, [fileId, setExportId, setExportStatus]);

  useEffect(() => {
    if (!exportId || exportStatus === "done" || exportStatus === "failed") return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await api.export.status(exportId);
        setExportStatus(res.status);
        if (res.download_url) setExportUrl(res.download_url);
        if (res.status === "done" || res.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [exportId, exportStatus, setExportStatus, setExportUrl]);

  return (
    <header className="flex h-[102px] shrink-0 items-stretch justify-between border-b border-slate-200 bg-white">
      <div className="flex min-w-0 items-stretch overflow-x-auto">
        <button
          className="flex w-[138px] shrink-0 flex-col items-center justify-center gap-2 bg-orange-50 text-slate-900"
          title="Thumbnails"
        >
          <FileText className="h-6 w-6" strokeWidth={1.6} />
          <span className="text-[15px]">Thumbnails</span>
        </button>

        <div className="flex items-stretch gap-1 px-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isDisabled = tool.action === "undo"
              ? historyIndex < 0
              : tool.action === "redo"
                ? false
                : false;
            return (
              <button
                key={tool.label}
                type="button"
                onClick={tool.action === "undo" ? undo : tool.action === "redo" ? redo : undefined}
                disabled={isDisabled}
                className={[
                  "flex w-[68px] shrink-0 flex-col items-center justify-center gap-2 text-sm",
                  tool.muted
                    ? "text-slate-400"
                    : tool.active
                      ? "text-slate-950"
                      : "text-slate-800 hover:bg-slate-50",
                  isDisabled ? "opacity-35 cursor-default" : "",
                ].join(" ")}
                title={tool.label}
              >
                <span className="relative">
                  <Icon className="h-7 w-7" strokeWidth={1.45} />
                  {tool.menu ? (
                    <ChevronDown className="absolute -bottom-1 -right-4 h-4 w-4" />
                  ) : null}
                </span>
                <span className="whitespace-nowrap leading-none">{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex shrink-0 items-stretch gap-1 px-4">
        <button
          type="button"
          className="flex w-[96px] flex-col items-center justify-center gap-2 text-sm text-slate-800 hover:bg-slate-50"
          title="Manage pages"
        >
          <Settings className="h-7 w-7" strokeWidth={1.45} />
          <span className="whitespace-nowrap leading-none">Manage pages</span>
        </button>
        <button
          type="button"
          className="flex w-[58px] flex-col items-center justify-center gap-2 text-sm text-slate-400"
          title="Print"
        >
          <Printer className="h-7 w-7" strokeWidth={1.45} />
          <span className="leading-none">Print</span>
        </button>
        <button
          type="button"
          className="flex w-[66px] flex-col items-center justify-center gap-2 text-sm text-slate-800 hover:bg-slate-50"
          title="Search"
        >
          <Search className="h-7 w-7" strokeWidth={1.45} />
          <span className="leading-none">Search</span>
        </button>

        <div className="ml-3 flex items-center gap-2 border-l border-slate-200 pl-4">
        {saveStatus === "saved" ? <span className="text-xs text-green-700">Saved</span> : null}
        {saveStatus === "failed" ? <span className="text-xs text-red-700">Save failed</span> : null}
        {exportStatus && exportStatus !== "done" && exportStatus !== "failed" && (
          <span className="text-sm text-blue-600">Exporting... ({exportStatus})</span>
        )}
        {exportUrl && (
          <a
            href={exportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
          >
            Download
          </a>
        )}
        <button
          onClick={handleExport}
          disabled={!fileId}
          className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          Export
        </button>
        <button
          onClick={handleSave}
          disabled={pendingEdits.length === 0 || saveStatus === "saving"}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saveStatus === "saving" ? "Saving..." : `Save (${pendingEdits.length})`}
        </button>
        </div>
      </div>
    </header>
  );
}

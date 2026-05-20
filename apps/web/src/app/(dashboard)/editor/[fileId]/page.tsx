"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";
import Toolbar from "@/components/editor/Toolbar";
import EditorCanvas from "@/components/editor/EditorCanvas";
import PageThumbnails from "@/components/editor/PageThumbnails";
import PropertyPanel from "@/components/editor/PropertyPanel";

export default function EditorPage() {
  const params = useParams();
  const fileId = params.fileId as string;

  const setFileId = useEditorStore((s) => s.setFileId);
  const setFileName = useEditorStore((s) => s.setFileName);
  const setObjects = useEditorStore((s) => s.setObjects);
  const setParseStatus = useEditorStore((s) => s.setParseStatus);
  const setFileUrl = useEditorStore((s) => s.setFileUrl);
  const setPageCount = useEditorStore((s) => s.setPageCount);
  const setLoading = useEditorStore((s) => s.setLoading);
  const setError = useEditorStore((s) => s.setError);
  const loading = useEditorStore((s) => s.loading);
  const error = useEditorStore((s) => s.error);
  const parseStatus = useEditorStore((s) => s.parseStatus);
  const fileUrl = useEditorStore((s) => s.fileUrl);

  useEffect(() => {
    if (!fileId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    setFileId(fileId);
    setFileUrl(api.files.contentUrl(fileId));
    setLoading(true);

    async function loadEditorState() {
      try {
        const fileData = await api.files.get(fileId);

        if (cancelled) return;

        setFileName(fileData.original_name);
        if (fileData.page_count) {
          setPageCount(fileData.page_count);
        }
        setParseStatus(fileData.parse_status);

        if (fileData.parse_status === "parsed") {
          const objectData = await api.objects.get(fileId, undefined, "text");
          if (!cancelled) {
            setObjects(objectData.objects, fileData.parse_status);
            if (timer) {
              clearInterval(timer);
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load PDF");
        }
      }
    }

    loadEditorState();
    timer = setInterval(loadEditorState, 2500);

    return () => {
      cancelled = true;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [
    fileId,
    setError,
    setFileId,
    setFileName,
    setFileUrl,
    setLoading,
    setObjects,
    setParseStatus,
    setPageCount,
  ]);

  if (loading && !fileUrl) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-500">Opening PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 rounded border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-[680px] flex-col overflow-hidden bg-slate-100">
      <Toolbar />
      {parseStatus !== "parsed" ? (
        <div className="border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
          Parsing text boxes{parseStatus ? ` (${parseStatus})` : ""}. The PDF is ready to view.
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_320px]">
        <PageThumbnails />
        <EditorCanvas />
        <div className="overflow-y-auto border-l border-slate-200 bg-white p-4">
          <PropertyPanel />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Move,
  PanelRight,
  Plus,
  Type,
  Underline,
} from "lucide-react";

import { useEditorStore } from "@/store/editorStore";
import type { PdfObject } from "@/types/pdf";

interface ViewportState {
  width: number;
  height: number;
  scale: number;
}

interface DragState {
  objectId: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origWidth: number;
  origHeight: number;
  type: "move" | "resize";
}

function fontFamilyFromName(name?: string): string {
  if (name === "Helvetica") return "Arial, sans-serif";
  if (name === "Times-Roman") return "Times New Roman, serif";
  if (name === "Courier") return "Courier New, monospace";
  return "sans-serif";
}

const RESIZE_HANDLE_SIZE = 10;

function OverlayEditor({ object, scale, pageHeight }: {
  object: PdfObject;
  scale: number;
  pageHeight: number;
}) {
  const addEdit = useEditorStore((s) => s.addEdit);
  const setInlineEditingObjectId = useEditorStore((s) => s.setInlineEditingObjectId);
  const [value, setValue] = useState(object.text_content ?? "");

  useEffect(() => {
    setValue(object.text_content ?? "");
  }, [object.id, object.text_content]);

  if (
    object.x == null ||
    object.y == null ||
    object.width == null ||
    object.height == null
  ) {
    return null;
  }

  const left = object.x * scale;
  const top = pageHeight - (object.y + object.height) * scale;
  const width = Math.max(object.width * scale, 120);
  const height = Math.max(object.height * scale * 2.2, 48);

  return (
    <div
      className="absolute z-20 rounded border border-blue-500 bg-white p-2 shadow-lg"
      style={{ left, top, width, minHeight: height }}
    >
      <textarea
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-24 w-full resize-none rounded border px-2 py-1 text-sm outline-none focus:border-blue-500"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          onClick={() => setInlineEditingObjectId(null)}
          className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (value.trim() && value !== object.text_content) {
              addEdit({
                object_id: object.id,
                op: "replace_text",
                old_text: object.text_content ?? "",
                text: value,
              });
            }
            setInlineEditingObjectId(null);
          }}
          className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTokenRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileUrl = useEditorStore((s) => s.fileUrl);
  const objects = useEditorStore((s) => s.objects);
  const parseStatus = useEditorStore((s) => s.parseStatus);
  const activePageIndex = useEditorStore((s) => s.activePageIndex);
  const pageCount = useEditorStore((s) => s.pageCount);
  const zoom = useEditorStore((s) => s.zoom);
  const selectedObjectIds = useEditorStore((s) => s.selectedObjectIds);
  const inlineEditingObjectId = useEditorStore((s) => s.inlineEditingObjectId);
  const setSelectedObjectIds = useEditorStore((s) => s.setSelectedObjectIds);
  const setInlineEditingObjectId = useEditorStore((s) => s.setInlineEditingObjectId);
  const setPageCount = useEditorStore((s) => s.setPageCount);
  const setActivePageIndex = useEditorStore((s) => s.setActivePageIndex);
  const setZoom = useEditorStore((s) => s.setZoom);
  const addEdit = useEditorStore((s) => s.addEdit);
  const [viewport, setViewport] = useState<ViewportState | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const pageTextObjects = useMemo(
    () => objects.filter((object) => object.page_index === activePageIndex),
    [activePageIndex, objects]
  );
  const inlineObject = pageTextObjects.find((object) => object.id === inlineEditingObjectId);

  useEffect(() => {
    if (!fileUrl || !canvasRef.current) {
      return;
    }

    const token = renderTokenRef.current + 1;
    renderTokenRef.current = token;

    async function renderPdfPage() {
      if (!fileUrl) {
        return;
      }

      try {
        setRenderError(null);

        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const pdf = await pdfjs.getDocument(fileUrl).promise;
        setPageCount(pdf.numPages);

        const safePage = Math.min(activePageIndex + 1, pdf.numPages);
        const page = await pdf.getPage(safePage);
        const rawViewport = page.getViewport({ scale: 1 });
        const maxWidth = 930;
        const baseScale = Math.min(1.45, maxWidth / rawViewport.width);
        const pdfViewport = page.getViewport({ scale: baseScale * zoom });
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (!canvas || !context) {
          throw new Error("Canvas unavailable");
        }

        canvas.width = Math.floor(pdfViewport.width);
        canvas.height = Math.floor(pdfViewport.height);
        canvas.style.width = `${Math.floor(pdfViewport.width)}px`;
        canvas.style.height = `${Math.floor(pdfViewport.height)}px`;

        await page.render({ canvasContext: context, viewport: pdfViewport }).promise;

        if (renderTokenRef.current === token) {
          setViewport({
            width: pdfViewport.width,
            height: pdfViewport.height,
            scale: pdfViewport.scale,
          });
        }
      } catch (error) {
        if (renderTokenRef.current === token) {
          setRenderError(error instanceof Error ? error.message : "PDF render failed");
          setViewport(null);
        }
      }
    }

    renderPdfPage();
  }, [activePageIndex, fileUrl, setPageCount, zoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent, object: PdfObject, type: "move" | "resize") => {
    e.preventDefault();
    e.stopPropagation();
    if (object.x == null || object.y == null) return;
    setDragState({
      objectId: object.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: object.x,
      origY: object.y,
      origWidth: object.width ?? 0,
      origHeight: object.height ?? 0,
      type,
    });
    setDragOffset({ dx: 0, dy: 0 });
  }, []);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      setDragOffset({ dx, dy });
      setSelectedObjectIds([dragState.objectId]);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!viewport) return;
      const dx = (e.clientX - dragState.startX) / viewport.scale;
      const dy = -(e.clientY - dragState.startY) / viewport.scale;

      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        if (dragState.type === "move") {
          addEdit({
            object_id: dragState.objectId,
            op: "move",
            x: dragState.origX + dx,
            y: dragState.origY + dy,
          });
        } else {
          addEdit({
            object_id: dragState.objectId,
            op: "resize",
            width: Math.max(10 / viewport.scale, dragState.origWidth + dx),
            height: Math.max(10 / viewport.scale, dragState.origHeight - dy),
          });
        }
      }
      setDragOffset({ dx: 0, dy: 0 });
      setDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, viewport, addEdit, setSelectedObjectIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (selectedObjectIds.length === 0) return;
      for (const id of selectedObjectIds) {
        const obj = objects.find((o) => o.id === id);
        const extra = obj?.object_type === "text" ? { old_text: obj.text_content ?? "" } : {};
        addEdit({ object_id: id, op: "delete", ...extra });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedObjectIds, objects, addEdit]);

  if (!fileUrl) {
    return (
      <section className="flex min-h-0 items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Loading PDF...</p>
      </section>
    );
  }

  if (renderError) {
    return (
      <section className="min-h-0 overflow-hidden bg-white">
        <div className="border-b bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          Showing browser PDF preview because canvas rendering failed.
        </div>
        <iframe
          title="PDF preview"
          src={fileUrl}
          className="h-full min-h-[720px] w-full border-0 bg-white"
        />
      </section>
    );
  }

  const selectedObject = pageTextObjects.find((object) => selectedObjectIds.includes(object.id));

  return (
    <section ref={containerRef} className="relative min-h-0 overflow-auto bg-slate-100 px-8 py-6">
      {parseStatus === "parsed" && objects.length === 0 ? (
        <div className="mx-auto mb-3 max-w-4xl rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No selectable text was found in this PDF. The page is still viewable, but text editing
          is unavailable for scanned, outlined, or image-based content.
        </div>
      ) : null}

      <div
        className="relative mx-auto bg-white shadow-lg"
        style={{
          width: viewport?.width ?? 920,
          minHeight: viewport?.height ?? 720,
        }}
      >
        <canvas ref={canvasRef} className="block" />

        {viewport
          ? pageTextObjects.map((object) => {
              if (
                object.x == null ||
                object.y == null ||
                object.width == null ||
                object.height == null
              ) {
                return null;
              }

              const selected = selectedObjectIds.includes(object.id);
              const left = object.x * viewport.scale;
              const top = viewport.height - (object.y + object.height) * viewport.scale;
              const width = Math.max(object.width * viewport.scale, 10);
              const height = Math.max(object.height * viewport.scale, 10);
              const isDragging = dragState?.objectId === object.id;
              const isResizing = isDragging && dragState?.type === "resize";
              const isMoving = isDragging && dragState?.type === "move";

              const fontSizePx = Math.max((object.font_size ?? 12) * viewport.scale * 0.75, 8);

              return (
                <div
                  key={object.id}
                  className="absolute overflow-hidden rounded-sm"
                  style={{
                    left,
                    top,
                    width: isResizing ? Math.max(10, width + dragOffset.dx) : width,
                    height: isResizing ? Math.max(10, height - dragOffset.dy) : height,
                    transform: isMoving
                      ? `translate(${dragOffset.dx}px, ${dragOffset.dy}px)`
                      : undefined,
                    backgroundColor: object.fill_color ?? "white",
                    cursor: selected ? "move" : "default",
                    zIndex: isDragging ? 15 : undefined,
                  }}
                  onMouseDown={(e) => {
                    if (selected) {
                      handleMouseDown(e, object, "move");
                    }
                  }}
                >
                  <span
                    className="pointer-events-none block leading-none text-slate-800"
                    style={{
                      fontFamily: fontFamilyFromName(object.font_name),
                      fontSize: fontSizePx,
                      lineHeight: 1,
                    }}
                  >
                    {object.text_content}
                  </span>
                  <button
                    title={object.text_content ?? "Text object"}
                    onClick={() => {
                      setSelectedObjectIds([object.id]);
                      setInlineEditingObjectId(null);
                    }}
                    onDoubleClick={() => {
                      setSelectedObjectIds([object.id]);
                      setInlineEditingObjectId(object.id);
                    }}
                    className={[
                      "absolute inset-0 rounded-sm border transition",
                      selected
                        ? "border-red-500 bg-red-500/10"
                        : "border-transparent bg-transparent hover:border-red-500 hover:bg-red-400/10",
                    ].join(" ")}
                    style={{ width: "100%", height: "100%" }}
                  />

                  {selected && (
                    <>
                      <div
                        className="absolute bottom-0 right-0 z-10 cursor-nwse-resize border-2 border-white bg-blue-600 shadow-sm"
                        style={{ width: RESIZE_HANDLE_SIZE, height: RESIZE_HANDLE_SIZE }}
                        onMouseDown={(e) => handleMouseDown(e, object, "resize")}
                      />
                      <div
                        className="absolute top-0 left-0 z-10 cursor-nwse-resize border-2 border-white bg-blue-600 shadow-sm"
                        style={{ width: RESIZE_HANDLE_SIZE, height: RESIZE_HANDLE_SIZE }}
                      />
                    </>
                  )}
                </div>
              );
            })
          : null}

        {viewport &&
        selectedObject?.x != null &&
        selectedObject.y != null &&
        selectedObject.width != null &&
        selectedObject.height != null ? (
          <div
            className="absolute z-30 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded bg-slate-950 px-2 py-1.5 text-white shadow-xl"
            style={{
              left: selectedObject.x * viewport.scale + (selectedObject.width * viewport.scale) / 2,
              top: Math.max(
                12,
                viewport.height -
                  (selectedObject.y + selectedObject.height) * viewport.scale -
                  8
              ),
            }}
          >
            <button className="rounded p-1 hover:bg-white/10" title="Text">
              <Type className="h-5 w-5" />
            </button>
            <button className="rounded p-1 hover:bg-white/10" title="Decrease size">
              <Minus className="h-5 w-5" />
            </button>
            <button className="rounded p-1 hover:bg-white/10" title="Underline">
              <Underline className="h-5 w-5" />
            </button>
            <button className="rounded p-1 hover:bg-white/10" title="Move">
              <Move className="h-5 w-5" />
            </button>
            <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-slate-950" />
          </div>
        ) : null}

        {viewport && inlineObject ? (
          <OverlayEditor
            object={inlineObject}
            scale={viewport.scale}
            pageHeight={viewport.height}
          />
        ) : null}
      </div>

      <div className="sticky bottom-5 z-40 mx-auto mt-5 flex w-fit items-center overflow-hidden rounded-xl bg-slate-900/80 text-white shadow-xl backdrop-blur">
        <span className="px-4 text-sm">Page:</span>
        <button
          onClick={() => setActivePageIndex(Math.max(0, activePageIndex - 1))}
          disabled={activePageIndex === 0}
          className="px-2 py-3 hover:bg-white/10 disabled:opacity-35"
          title="Previous page"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <span className="min-w-16 text-center text-sm">
          {activePageIndex + 1} / {pageCount}
        </span>
        <button
          onClick={() => setActivePageIndex(Math.min(pageCount - 1, activePageIndex + 1))}
          disabled={activePageIndex >= pageCount - 1}
          className="px-2 py-3 hover:bg-white/10 disabled:opacity-35"
          title="Next page"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
        <span className="mx-2 h-7 w-px bg-white/20" />
        <button
          onClick={() => setZoom(zoom + 0.1)}
          className="px-3 py-3 hover:bg-white/10"
          title="Zoom in"
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          onClick={() => setZoom(zoom - 0.1)}
          className="px-3 py-3 hover:bg-white/10"
          title="Zoom out"
        >
          <Minus className="h-5 w-5" />
        </button>
        <button className="px-3 py-3 hover:bg-white/10" title="Pan">
          <Move className="h-5 w-5" />
        </button>
        <span className="mx-2 h-7 w-px bg-white/20" />
        <button className="px-3 py-3 hover:bg-white/10" title="Panels">
          <PanelRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}

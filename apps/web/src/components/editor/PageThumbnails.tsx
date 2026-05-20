"use client";

import { useEffect, useRef, useState } from "react";

import { useEditorStore } from "@/store/editorStore";

function ThumbnailCanvas({ pageIndex, active }: { pageIndex: number; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileUrl = useEditorStore((s) => s.fileUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!fileUrl || !canvasRef.current) return;

    let cancelled = false;
    const documentUrl = fileUrl;

    async function renderThumbnail() {
      try {
        setFailed(false);
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const pdf = await pdfjs.getDocument(documentUrl).promise;
        const page = await pdf.getPage(Math.min(pageIndex + 1, pdf.numPages));
        const rawViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 214 / rawViewport.width });
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (!canvas || !context || cancelled) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        await page.render({ canvasContext: context, viewport }).promise;
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    renderThumbnail();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, pageIndex]);

  if (failed || !fileUrl) {
    return (
      <div
        className={[
          "flex h-[304px] w-[214px] items-center justify-center bg-white text-3xl font-semibold",
          active ? "text-red-500" : "text-slate-300",
        ].join(" ")}
      >
        {pageIndex + 1}
      </div>
    );
  }

  return <canvas ref={canvasRef} className="block bg-white" />;
}

export default function PageThumbnails() {
  const objects = useEditorStore((s) => s.objects);
  const activePageIndex = useEditorStore((s) => s.activePageIndex);
  const pageCount = useEditorStore((s) => s.pageCount);
  const setActivePageIndex = useEditorStore((s) => s.setActivePageIndex);
  const pages = new Set(objects.map((o) => o.page_index));
  const pageList =
    pageCount > 1
      ? Array.from({ length: pageCount }, (_, index) => index)
      : pages.size > 0
        ? Array.from(pages).sort()
        : [activePageIndex];

  return (
    <aside className="min-h-0 overflow-y-auto border-r border-slate-300 bg-slate-200 px-[66px] py-16">
      {pageList.map((page) => (
        <button
          key={page}
          onClick={() => setActivePageIndex(page)}
          className={[
            "mb-10 block w-[226px] shrink-0 text-left",
            activePageIndex === page
              ? "text-white"
              : "text-slate-500 hover:text-slate-700",
          ].join(" ")}
          title={`Page ${page + 1}`}
        >
          <span
            className={[
              "block border bg-white p-[10px] shadow-sm transition",
              activePageIndex === page
                ? "border-red-500 ring-1 ring-red-500"
                : "border-slate-300 hover:border-slate-400",
            ].join(" ")}
          >
            <ThumbnailCanvas pageIndex={page} active={activePageIndex === page} />
          </span>
          <span
            className={[
              "mx-auto mt-2 flex h-7 w-12 items-center justify-center rounded-full px-4 py-1 text-base font-medium",
              activePageIndex === page
                ? "bg-red-500 text-white"
                : "bg-white text-slate-500",
            ].join(" ")}
          >
            {page + 1}
          </span>
        </button>
      ))}
    </aside>
  );
}

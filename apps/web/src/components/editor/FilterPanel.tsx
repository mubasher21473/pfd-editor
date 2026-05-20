"use client";

import { useState } from "react";
import { useEditorStore } from "@/store/editorStore";

export default function FilterPanel() {
  const objects = useEditorStore((s) => s.objects);
  const parseStatus = useEditorStore((s) => s.parseStatus);
  const selectedObjectIds = useEditorStore((s) => s.selectedObjectIds);
  const setSelectedObjectIds = useEditorStore((s) => s.setSelectedObjectIds);
  const setActivePageIndex = useEditorStore((s) => s.setActivePageIndex);
  const [search, setSearch] = useState("");

  const filtered = objects.filter((o) => {
    if (search && !o.text_content?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <aside className="min-h-0 rounded border bg-white p-3">
      <h3 className="mb-3 text-sm font-semibold">Text</h3>
      <input
        className="mb-3 w-full rounded border px-2 py-1.5 text-sm outline-none focus:border-blue-500"
        placeholder="Find text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <p className="mt-3 text-xs text-slate-400">
        {filtered.length} / {objects.length} text boxes
      </p>
      <div className="mt-4 max-h-[calc(100vh-300px)] space-y-2 overflow-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400">
            {parseStatus === "parsed"
              ? "No selectable text found. This PDF may be scanned, outlined, or image-based."
              : "Text boxes will appear here after parsing."}
          </p>
        ) : (
          filtered.map((object) => {
            const selected = selectedObjectIds.includes(object.id);
            return (
              <button
                key={object.id}
                onClick={() => {
                  setActivePageIndex(object.page_index);
                  setSelectedObjectIds([object.id]);
                }}
                className={[
                  "w-full rounded border px-2 py-2 text-left text-xs",
                  selected
                    ? "border-blue-500 bg-blue-50 text-blue-900"
                    : "border-slate-200 bg-white hover:border-slate-300",
                ].join(" ")}
              >
                <span>{object.text_content || "Text object"}</span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

"use client";

import { useEditorStore } from "@/store/editorStore";
import type { EditOperation } from "@/types/editor";

export default function BulkActionBar() {
  const selectedObjectIds = useEditorStore((s) => s.selectedObjectIds);
  const addEdit = useEditorStore((s) => s.addEdit);

  if (selectedObjectIds.length === 0) return null;

  const hideAll = () => {
    for (const id of selectedObjectIds) {
      addEdit({ object_id: id, op: "hide" } as EditOperation);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded border bg-white px-4 py-2">
      <span className="text-sm text-slate-500">
        {selectedObjectIds.length} selected
      </span>
      <button
        onClick={hideAll}
        className="rounded border px-3 py-1 text-sm hover:bg-slate-50"
      >
        Hide
      </button>
    </div>
  );
}

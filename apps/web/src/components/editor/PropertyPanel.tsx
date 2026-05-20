"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/store/editorStore";
import { api } from "@/lib/api";

export default function PropertyPanel() {
  const objects = useEditorStore((s) => s.objects);
  const fileId = useEditorStore((s) => s.fileId);
  const selectedObjectIds = useEditorStore((s) => s.selectedObjectIds);
  const setSelectedObjectIds = useEditorStore((s) => s.setSelectedObjectIds);
  const addEdit = useEditorStore((s) => s.addEdit);

  const [editText, setEditText] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editStrokeColor, setEditStrokeColor] = useState("");
  const [editFontSize, setEditFontSize] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const selected = objects.filter((o) => selectedObjectIds.includes(o.id));
  const obj = selected[0] ?? null;

  useEffect(() => {
    if (!obj) return;
    setEditText(obj.text_content ?? "");
    setEditColor(obj.fill_color ?? "");
    setEditStrokeColor(obj.stroke_color ?? "");
    setEditFontSize(String(obj.font_size ?? ""));
    setImageError(null);
  }, [obj]);

  const handleSaveText = useCallback(() => {
    if (!editText.trim() || !obj?.text_content || editText === obj.text_content) return;
    addEdit({
      object_id: obj.id,
      op: "replace_text",
      old_text: obj.text_content,
      text: editText,
    });
  }, [editText, obj, addEdit]);

  const handleSaveColor = useCallback(() => {
    if (!obj || !editColor.trim() || editColor === obj.fill_color) return;
    addEdit({
      object_id: obj.id,
      op: "set_fill_color",
      color: editColor,
    });
  }, [editColor, obj, addEdit]);

  const handleSaveStrokeColor = useCallback(() => {
    if (!obj || !editStrokeColor.trim() || editStrokeColor === obj.stroke_color) return;
    addEdit({
      object_id: obj.id,
      op: "set_stroke_color",
      color: editStrokeColor,
    });
  }, [editStrokeColor, obj, addEdit]);

  const handleSaveFontSize = useCallback(() => {
    if (!obj) return;
    const size = parseFloat(editFontSize);
    if (isNaN(size) || size <= 0 || size === obj.font_size) return;
    addEdit({
      object_id: obj.id,
      op: "set_font_size",
      font_size: size,
    });
  }, [editFontSize, obj, addEdit]);

  const handleDelete = useCallback(() => {
    if (!obj) return;
    addEdit({ object_id: obj.id, op: "delete", old_text: obj.text_content ?? "" });
    setSelectedObjectIds([]);
  }, [obj, addEdit, setSelectedObjectIds]);

  const handleReplaceImage = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const imageFile = e.target.files?.[0];
      if (!imageFile || !obj || !fileId) return;
      setImageUploading(true);
      setImageError(null);
      try {
        const result = await api.objects.uploadImage(fileId, obj.id, imageFile);
        const xobjectName =
          typeof obj.raw_attrs?.xobject_name === "string" ? obj.raw_attrs.xobject_name : "";
        addEdit({
          object_id: obj.id,
          op: "replace_image",
          xobject_name: xobjectName,
          image_s3_key: result.image_s3_key,
        });
      } catch (err) {
        setImageError(err instanceof Error ? err.message : "Image upload failed");
      } finally {
        setImageUploading(false);
        if (imageInputRef.current) imageInputRef.current.value = "";
      }
    },
    [obj, fileId, addEdit]
  );

  if (!obj) {
    return (
      <aside className="rounded border bg-white p-4 text-sm text-slate-500">
        Click text on the PDF page to edit it.
      </aside>
    );
  }

  return (
    <aside className="space-y-4 rounded border bg-white p-4 text-sm">
      <h3 className="text-sm font-semibold">
        {obj.object_type === "text" ? "Text" : "Object"} properties
      </h3>

      <div className="space-y-2">
        <div>
          <span className="text-slate-500">Type:</span> {obj.object_type}
        </div>
        <div>
          <span className="text-slate-500">Page:</span> {obj.page_index + 1}
        </div>
        {obj.font_name && (
          <div>
            <span className="text-slate-500">Font:</span> {obj.font_name}
          </div>
        )}
        {obj.x != null && (
          <div>
            <span className="text-slate-500">Position:</span> ({obj.x.toFixed(1)},{" "}
            {obj.y?.toFixed(1)}) — {obj.width?.toFixed(1)}×{obj.height?.toFixed(1)}
          </div>
        )}
      </div>

      {obj.object_type === "text" && (
        <>
          <div className="space-y-2">
            <label className="font-medium">Text content</label>
            <textarea
              className="w-full rounded border p-2 text-sm"
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
            <button
              onClick={handleSaveText}
              disabled={!editText.trim() || editText === obj.text_content}
              className="w-full rounded border px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
            >
              Apply text edit
            </button>
          </div>

          <div className="space-y-2">
            <label className="font-medium">Font size (pt)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={999}
                className="w-full rounded border px-2 py-1.5"
                value={editFontSize}
                onChange={(e) => setEditFontSize(e.target.value)}
              />
              <button
                onClick={handleSaveFontSize}
                disabled={!editFontSize.trim()}
                className="shrink-0 rounded border px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
              >
                Set
              </button>
            </div>
          </div>
        </>
      )}

      <div className="space-y-2">
        <label className="font-medium">
          {obj.object_type === "text" ? "Text color" : "Fill color"}
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            className="h-9 w-12 cursor-pointer rounded border"
            value={editColor || "#000000"}
            onChange={(e) => setEditColor(e.target.value)}
          />
          <input
            type="text"
            className="flex-1 rounded border px-2 py-1.5 font-mono text-xs"
            value={editColor}
            onChange={(e) => setEditColor(e.target.value)}
            placeholder="#000000"
          />
          <button
            onClick={handleSaveColor}
            disabled={!editColor.trim()}
            className="shrink-0 rounded border px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
          >
            Set
          </button>
        </div>
      </div>

      {obj.object_type !== "text" && (
        <div className="space-y-2">
          <label className="font-medium">Stroke color</label>
          <div className="flex gap-2">
            <input
              type="color"
              className="h-9 w-12 cursor-pointer rounded border"
              value={editStrokeColor || "#000000"}
              onChange={(e) => setEditStrokeColor(e.target.value)}
            />
            <input
              type="text"
              className="flex-1 rounded border px-2 py-1.5 font-mono text-xs"
              value={editStrokeColor}
              onChange={(e) => setEditStrokeColor(e.target.value)}
              placeholder="#000000"
            />
            <button
              onClick={handleSaveStrokeColor}
              disabled={!editStrokeColor.trim()}
              className="shrink-0 rounded border px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
            >
              Set
            </button>
          </div>
        </div>
      )}

      {obj.object_type === "image" && (
        <div className="space-y-2">
          <label className="font-medium">Replace image</label>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
            className="w-full text-xs"
            onChange={handleReplaceImage}
            disabled={imageUploading}
          />
          {imageUploading && (
            <p className="text-xs text-blue-600">Uploading replacement image…</p>
          )}
          {imageError && <p className="text-xs text-red-600">{imageError}</p>}
        </div>
      )}

      {selected.length > 1 && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs text-slate-400">
            {selected.length} objects selected
          </p>
          {selected.every((o) => o.fill_color != null) && (
            <div className="flex gap-2">
              <input
                type="color"
                className="h-9 w-12 cursor-pointer rounded border"
                value={editColor || "#000000"}
                onChange={(e) => setEditColor(e.target.value)}
              />
              <button
                onClick={() => {
                  for (const o of selected) {
                    addEdit({ object_id: o.id, op: "set_fill_color", color: editColor });
                  }
                }}
                className="rounded border px-3 py-1.5 hover:bg-slate-50"
              >
                Apply fill to all
              </button>
            </div>
          )}
        </div>
      )}

      <div className="border-t pt-3">
        <button
          onClick={handleDelete}
          className="w-full rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
        >
          Delete object
        </button>
      </div>
    </aside>
  );
}

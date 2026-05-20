import { create } from "zustand";
import type { PdfObject } from "@/types/pdf";

interface PendingEdit {
  object_id: string;
  op: string;
  [key: string]: unknown;
}

interface Snapshot {
  objects: PdfObject[];
  pendingEdits: PendingEdit[];
}

interface EditorStore {
  fileId: string | null;
  fileName: string | null;
  objects: PdfObject[];
  selectedObjectIds: string[];
  inlineEditingObjectId: string | null;
  parseStatus: string;
  fileUrl: string | null;
  activePageIndex: number;
  pageCount: number;
  zoom: number;
  loading: boolean;
  error: string | null;
  saveStatus: "idle" | "saving" | "saved" | "failed";
  exportId: string | null;
  exportStatus: string | null;
  exportUrl: string | null;
  pendingEdits: PendingEdit[];
  history: Snapshot[];
  historyIndex: number;

  setFileId: (id: string) => void;
  setFileName: (name: string | null) => void;
  setObjects: (objects: PdfObject[], parseStatus: string) => void;
  setParseStatus: (parseStatus: string) => void;
  setFileUrl: (url: string | null) => void;
  setActivePageIndex: (pageIndex: number) => void;
  setPageCount: (pageCount: number) => void;
  setZoom: (zoom: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedObjectIds: (ids: string[]) => void;
  setInlineEditingObjectId: (id: string | null) => void;
  addEdit: (edit: PendingEdit) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearPendingEdits: () => void;
  setSaveStatus: (status: "idle" | "saving" | "saved" | "failed") => void;
  setExportId: (id: string | null) => void;
  setExportStatus: (status: string | null) => void;
  setExportUrl: (url: string | null) => void;
  toggleObjectSelection: (id: string) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  fileId: null,
  fileName: null,
  objects: [],
  selectedObjectIds: [],
  inlineEditingObjectId: null,
  parseStatus: "",
  fileUrl: null,
  activePageIndex: 0,
  pageCount: 1,
  zoom: 1,
  loading: false,
  error: null,
  saveStatus: "idle",
  exportId: null,
  exportStatus: null,
  exportUrl: null,
  pendingEdits: [],
  history: [],
  historyIndex: -1,

  setFileId: (id) => set({ fileId: id }),
  setFileName: (name) => set({ fileName: name }),
  setObjects: (objects, parseStatus) => set({ objects, parseStatus, loading: false, history: [], historyIndex: -1, pendingEdits: [] }),
  setParseStatus: (parseStatus) => set({ parseStatus, loading: false }),
  setFileUrl: (url) => set({ fileUrl: url }),
  setActivePageIndex: (pageIndex) => set({ activePageIndex: pageIndex }),
  setPageCount: (pageCount) => set({ pageCount: Math.max(1, pageCount) }),
  setZoom: (zoom) => set({ zoom: Math.min(2, Math.max(0.6, zoom)) }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false }),
  setSelectedObjectIds: (ids) =>
    set({ selectedObjectIds: ids, inlineEditingObjectId: ids[0] ?? null }),
  setInlineEditingObjectId: (id) => set({ inlineEditingObjectId: id }),
  addEdit: (edit) =>
    set((s) => {
      const snapshot: Snapshot = {
        objects: s.objects.map((o) => ({ ...o })),
        pendingEdits: s.pendingEdits.map((e) => ({ ...e })),
      };
      const newHistory = s.history.slice(0, s.historyIndex + 1);
      newHistory.push(snapshot);
      if (newHistory.length > 50) newHistory.shift();
      return {
        saveStatus: "idle",
        history: newHistory,
        historyIndex: newHistory.length - 1,
        pendingEdits: [...s.pendingEdits, edit],
        objects: s.objects.map((object) => {
          if (object.id !== edit.object_id) return object;
          if (edit.op === "replace_text" && typeof edit.text === "string") {
            return { ...object, text_content: edit.text };
          }
          if (edit.op === "set_fill_color" && typeof edit.color === "string") {
            return { ...object, fill_color: edit.color };
          }
          if (edit.op === "set_font_size" && typeof edit.font_size === "number") {
            return { ...object, font_size: edit.font_size };
          }
          if (edit.op === "move") {
            return {
              ...object,
              x: typeof edit.x === "number" ? edit.x : object.x,
              y: typeof edit.y === "number" ? edit.y : object.y,
            };
          }
          if (edit.op === "resize") {
            return {
              ...object,
              width: typeof edit.width === "number" ? edit.width : object.width,
              height: typeof edit.height === "number" ? edit.height : object.height,
            };
          }
          return object;
        }),
      };
    }),
  undo: () =>
    set((s) => {
      if (s.historyIndex < 0) return s;
      const snap = s.history[s.historyIndex];
      return {
        objects: snap.objects,
        pendingEdits: snap.pendingEdits,
        historyIndex: s.historyIndex - 1,
        saveStatus: "idle",
      };
    }),
  redo: () =>
    set((s) => {
      if (s.historyIndex + 1 >= s.history.length) return s;
      const nextSnap = s.history[s.historyIndex + 2];
      if (!nextSnap) {
        const lastEdit = s.pendingEdits[s.pendingEdits.length - 1];
        if (!lastEdit) return s;
        return {
          pendingEdits: s.pendingEdits,
          historyIndex: s.historyIndex + 1,
        };
      }
      return {
        objects: nextSnap.objects,
        pendingEdits: nextSnap.pendingEdits,
        historyIndex: s.historyIndex + 1,
        saveStatus: "idle",
      };
    }),
  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex + 1 < get().history.length - 1,
  clearPendingEdits: () => set({ pendingEdits: [], saveStatus: "saved", history: [], historyIndex: -1 }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setExportId: (id) => set({ exportId: id }),
  setExportStatus: (status) => set({ exportStatus: status }),
  setExportUrl: (url) => set({ exportUrl: url }),
  toggleObjectSelection: (id) =>
    set((s) => {
      const selected = s.selectedObjectIds.includes(id)
        ? s.selectedObjectIds.filter((i) => i !== id)
        : [...s.selectedObjectIds, id];
      return {
        selectedObjectIds: selected,
        inlineEditingObjectId: selected.includes(id) ? id : selected[0] ?? null,
      };
    }),
}));

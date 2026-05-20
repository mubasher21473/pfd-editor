import { create } from "zustand";

interface EditorStore {
  selectedObjectIds: string[];
  setSelectedObjectIds: (ids: string[]) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  selectedObjectIds: [],
  setSelectedObjectIds: (ids) => set({ selectedObjectIds: ids })
}));

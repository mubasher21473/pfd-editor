import { useState } from "react";

export function useEditorHistory() {
  const [index, setIndex] = useState(0);
  return {
    index,
    undo: () => setIndex((v) => Math.max(0, v - 1)),
    redo: () => setIndex((v) => v + 1)
  };
}

import { useState } from "react";

export function useEditorHistory() {
  const [index, setIndex] = useState(0);
  const [maxIndex, setMaxIndex] = useState(0);
  return {
    index,
    maxIndex,
    setMaxIndex,
    undo: () => setIndex((v) => Math.max(0, v - 1)),
    redo: () => setIndex((v) => Math.min(maxIndex, v + 1))
  };
}

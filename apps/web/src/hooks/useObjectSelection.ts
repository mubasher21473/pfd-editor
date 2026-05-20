import { useState } from "react";

export function useObjectSelection() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  return {
    selectedIds,
    setSelectedIds
  };
}

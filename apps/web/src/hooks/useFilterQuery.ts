import { useState } from "react";

export function useFilterQuery() {
  const [query, setQuery] = useState("");
  return { query, setQuery };
}

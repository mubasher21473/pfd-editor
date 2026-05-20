import { useState } from "react";

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  return { uploading, setUploading };
}

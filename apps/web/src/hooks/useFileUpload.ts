import { useState } from "react";
import { api } from "@/lib/api";

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File): Promise<string | null> => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.files.upload(formData);
      return res.file_id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, error, upload };
}

"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useFileUpload } from "@/hooks/useFileUpload";

interface Props {
  onUploaded: (fileId: string) => void;
}

export default function DropZone({ onUploaded }: Props) {
  const { uploading, error, upload } = useFileUpload();

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      const fileId = await upload(file);
      if (fileId) onUploaded(fileId);
    },
    [upload, onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded border-2 border-dashed p-10 text-center transition ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 bg-white hover:border-slate-400"
        } ${uploading ? "pointer-events-none opacity-50" : ""}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <p className="text-slate-500">Uploading...</p>
        ) : isDragActive ? (
          <p className="text-blue-600">Drop the PDF here</p>
        ) : (
          <p className="text-slate-500">
            Drag & drop a PDF here, or click to select
          </p>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

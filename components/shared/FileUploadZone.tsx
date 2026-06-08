"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  accept?: Record<string, string[]>;
  maxSizeMb?: number;
  currentFile?: { name: string } | null;
  onClear?: () => void;
}

export function FileUploadZone({
  onFileSelect,
  accept = { "application/pdf": [".pdf"], "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] },
  maxSizeMb = 10,
  currentFile,
  onClear,
}: FileUploadZoneProps) {
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    setError(null);
    if (rejected.length > 0) {
      const e = rejected[0].errors[0];
      setError(e.message.includes("size") ? `File too large (max ${maxSizeMb} MB)` : "Invalid file type");
      return;
    }
    if (accepted.length > 0) onFileSelect(accepted[0]);
  }, [onFileSelect, maxSizeMb]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize: maxSizeMb * 1024 * 1024,
    multiple: false,
  });

  if (currentFile) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50">
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
        <span className="text-sm text-green-700 flex-1 truncate">{currentFile.name}</span>
        {onClear && (
          <button onClick={onClear} className="text-green-600 hover:text-green-800">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-accent" : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">
          {isDragActive ? "Drop the file here" : "Drag & drop or click to upload"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG, WEBP · Max {maxSizeMb} MB</p>
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

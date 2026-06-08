"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";

interface InvoiceViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filePath?: string;
  fileName?: string;
  fileType?: string;
}

export function InvoiceViewer({ open, onOpenChange, filePath, fileName, fileType }: InvoiceViewerProps) {
  const fileUrl = filePath ? `/api/uploads/${filePath.replace(/^.*\/uploads\//, "")}` : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-4">{fileName || "Invoice"}</DialogTitle>
            {fileUrl && (
              <Button size="sm" variant="outline" asChild>
                <a href={fileUrl} download={fileName} target="_blank" rel="noreferrer">
                  <Download className="w-4 h-4 mr-2" />Download
                </a>
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden rounded-lg border border-border">
          {!fileUrl ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No file available</div>
          ) : fileType === "pdf" ? (
            <iframe src={fileUrl} className="w-full h-full" title={fileName} />
          ) : (
            <div className="h-full flex items-center justify-center overflow-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileUrl} alt={fileName} className="max-w-full max-h-full object-contain" />
            </div>
          )}
        </div>
        {fileUrl && (
          <Button variant="ghost" size="sm" className="self-end text-xs text-muted-foreground" asChild>
            <a href={fileUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" />Open in new tab
            </a>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { FileUploadZone } from "@/components/shared/FileUploadZone";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface InvoiceUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId: string;
  currency?: string;
  onSuccess: () => void;
}

export function InvoiceUploader({ open, onOpenChange, subscriptionId, currency = "INR", onSuccess }: InvoiceUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [invoiceNum, setInvoiceNum] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!amount || !invoiceDate) { toast.error("Amount and date are required"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("amount", amount);
      fd.append("invoiceDate", new Date(invoiceDate).toISOString());
      fd.append("currency", currency);
      if (invoiceNum) fd.append("invoiceNumber", invoiceNum);
      if (file) fd.append("file", file);
      await api.uploadSubscriptionInvoice(subscriptionId, fd);
      toast.success("Invoice uploaded");
      onSuccess();
      onOpenChange(false);
      setFile(null); setInvoiceNum(""); setAmount("");
      setInvoiceDate(new Date().toISOString().split("T")[0]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Upload Invoice</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Invoice # (optional)</Label>
              <Input value={invoiceNum} onChange={(e) => setInvoiceNum(e.target.value)} placeholder="INV-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Invoice Date *</Label>
            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <FileUploadZone
            onFileSelect={setFile}
            currentFile={file ? { name: file.name } : null}
            onClear={() => setFile(null)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

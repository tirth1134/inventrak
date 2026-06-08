"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { UploadCloud, FileSpreadsheet, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api, type Asset } from "@/lib/api";

interface AiImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AiImportModal({ open, onOpenChange, onSuccess }: AiImportModalProps) {
  const [step, setStep] = useState<"upload" | "analyzing" | "preview" | "importing">("upload");
  const [parsedAssets, setParsedAssets] = useState<Partial<Asset>[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setStep("analyzing");
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("schemaType", "HARDWARE");

      // Send to backend which handles parsing the Excel and calling the AI
      const res = await api.processAiImportFormData(formData);

      setParsedAssets(res.data);
      setStep("preview");
    } catch (e: any) {
      toast.error(e.message || "Failed to process the spreadsheet");
      setStep("upload");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"]
    },
    maxFiles: 1,
    disabled: step !== "upload"
  });

  const handleImport = async () => {
    try {
      setStep("importing");
      await api.bulkCreateAssets(parsedAssets);
      toast.success(`Successfully imported ${parsedAssets.length} assets!`);
      onSuccess();
      onOpenChange(false);
      
      // Reset for next time
      setTimeout(() => {
        setStep("upload");
        setParsedAssets([]);
      }, 500);
    } catch (e: any) {
      toast.error(e.message || "Failed to import assets");
      setStep("preview");
    }
  };

  const resetState = () => {
    if (step === "analyzing" || step === "importing") return;
    setStep("upload");
    setParsedAssets([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && resetState()}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden bg-card border-border shadow-xl rounded-xl">
        <DialogHeader className="px-6 py-5 border-b border-border/40 bg-muted/20">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Excel Import
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          {step === "upload" && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1 text-foreground">Upload Spreadsheet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-[280px]">
                Drag & drop your .xlsx or .csv file here. Our AI will automatically map the messy columns to inventory assets.
              </p>
              <Button variant="secondary" size="sm" className="pointer-events-none">
                <UploadCloud className="w-4 h-4 mr-2" /> Browse Files
              </Button>
            </div>
          )}

          {(step === "analyzing" || step === "importing") && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <Loader2 className="w-12 h-12 animate-spin text-primary relative z-10" />
              </div>
              <h3 className="mt-6 text-lg font-semibold">
                {step === "analyzing" ? "AI is analyzing your sheet..." : "Importing assets..."}
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-[300px] text-center">
                {step === "analyzing"
                  ? "Extracting data, normalizing dates, and categorizing hardware types. Please hold on."
                  : "Creating records in your database..."}
              </p>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    AI Mapping Complete
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Please review the {parsedAssets.length} extracted assets before importing.
                  </p>
                </div>
              </div>

              <div className="border border-border rounded-lg overflow-hidden bg-background">
                <div className="max-h-[350px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                      <TableRow>
                        <TableHead className="w-[100px] text-xs font-semibold">Type</TableHead>
                        <TableHead className="text-xs font-semibold">Brand/Model</TableHead>
                        <TableHead className="text-xs font-semibold">Serial</TableHead>
                        <TableHead className="text-xs font-semibold">RAM</TableHead>
                        <TableHead className="text-xs font-semibold">Price</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedAssets.map((asset, i) => (
                        <TableRow key={i} className="group">
                          <TableCell className="font-medium text-[13px]">{asset.type || "N/A"}</TableCell>
                          <TableCell className="text-[13px]">
                            <div className="font-medium">{asset.brand || "Unknown Brand"}</div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                              {asset.model || "Unknown Model"}
                            </div>
                          </TableCell>
                          <TableCell className="text-[13px] font-mono text-muted-foreground">
                            {asset.serialNumber || "N/A"}
                          </TableCell>
                          <TableCell className="text-[13px]">
                            {asset.ramGb ? `${asset.ramGb} GB` : "N/A"}
                          </TableCell>
                          <TableCell className="text-[13px]">
                            {asset.purchasePrice ? `₹${asset.purchasePrice}` : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {asset.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>

        {step === "preview" && (
          <DialogFooter className="px-6 py-4 border-t border-border/40 bg-muted/20">
            <Button variant="outline" onClick={() => setStep("upload")}>
              Upload Different File
            </Button>
            <Button onClick={handleImport}>
              Confirm Import ({parsedAssets.length})
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

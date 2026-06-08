"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type Asset } from "@/lib/api";
import { useDepartments } from "@/lib/hooks/useEmployees";
import { useVendors, useProcessors, useStockLocations } from "@/lib/hooks/useVendors";
import { useState } from "react";
import { FileUploadZone } from "@/components/shared/FileUploadZone";

const schema = z.object({
  type: z.enum(["DESKTOP", "LAPTOP", "MONITOR", "SERVER", "PERIPHERAL", "OTHER"]),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  osType: z.string().optional(),
  processorId: z.string().optional(),
  ramGb: z.number().int().positive().optional().or(z.literal(0)),
  storageGb: z.number().int().positive().optional().or(z.literal(0)),
  storageType: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().min(0).optional(),
  currency: z.string().default("INR"),
  vendorId: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  departmentId: z.string().optional(),
  locationId: z.string().optional(),
  remarks: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  asset?: Asset;
}

export function AssetForm({ asset }: Props) {
  const router = useRouter();
  const { departments } = useDepartments();
  const { vendors } = useVendors("limit=200");
  const { processors } = useProcessors();
  const { locations } = useStockLocations();
  const [loading, setLoading] = useState(false);
  const [processorSearch, setProcessorSearch] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: asset
      ? {
          type: asset.type,
          brand: asset.brand ?? "",
          model: asset.model ?? "",
          serialNumber: asset.serialNumber ?? "",
          osType: asset.osType ?? "",
          processorId: asset.processorId ?? "",
          ramGb: asset.ramGb ?? undefined,
          storageGb: asset.storageGb ?? undefined,
          storageType: asset.storageType ?? "",
          purchaseDate: asset.purchaseDate ? asset.purchaseDate.split("T")[0] : "",
          purchasePrice: asset.purchasePrice ?? undefined,
          currency: asset.currency ?? "INR",
          vendorId: asset.vendorId ?? "",
          warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.split("T")[0] : "",
          departmentId: asset.departmentId ?? "",
          locationId: asset.locationId ?? "",
          remarks: asset.remarks ?? "",
        }
      : {
          type: "LAPTOP",
          currency: "INR",
        },
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        processorId: data.processorId || undefined,
        vendorId: data.vendorId || undefined,
        departmentId: data.departmentId || undefined,
        locationId: data.locationId || undefined,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate).toISOString() : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry).toISOString() : undefined,
        ramGb: data.ramGb || undefined,
        storageGb: data.storageGb || undefined,
      };
      let createdAssetId = "";
      if (asset) {
        await api.updateAsset(asset.id, payload);
        toast.success("Asset updated");
      } else {
        const res = await api.createAsset(payload);
        createdAssetId = res.data.id;
        toast.success("Asset created");
      }

      // If creating a new asset and an invoice was attached, upload it
      if (!asset && createdAssetId && uploadFile) {
        try {
          const fd = new FormData();
          fd.append("assetId", createdAssetId);
          fd.append("amount", String(data.purchasePrice || 0));
          fd.append("invoiceDate", data.purchaseDate ? new Date(data.purchaseDate).toISOString() : new Date().toISOString());
          fd.append("currency", data.currency || "INR");
          if (invoiceNumber) {
            fd.append("invoiceNumber", invoiceNumber);
          }
          fd.append("file", uploadFile);

          await api.createHardwareInvoice(fd);
          toast.success("Invoice attached to asset");
        } catch (uploadErr) {
          console.error("Failed to upload invoice:", uploadErr);
          toast.error("Asset created, but failed to attach invoice: " + (uploadErr as Error).message);
        }
      }

      router.push("/hardware");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProcessors = processors.filter((p) =>
    processorSearch
      ? `${p.name} ${p.brand ?? ""}`.toLowerCase().includes(processorSearch.toLowerCase())
      : true
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Asset Info */}
        <Card className="shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="border-b border-border/40 pb-4 mb-4 bg-muted/10">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <span className="w-1.5 h-4 bg-primary rounded-full" />
              Asset Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type *</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-lg border-border/85">
                      {(["DESKTOP", "LAPTOP", "MONITOR", "SERVER", "PERIPHERAL", "OTHER"] as const).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.charAt(0) + t.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Brand</Label>
                <Input {...register("brand")} placeholder="e.g. Dell" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Model</Label>
                <Input {...register("model")} placeholder="e.g. Latitude 5420" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Serial Number</Label>
              <Input {...register("serialNumber")} placeholder="e.g. SN-ABC123" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">OS Type</Label>
              <Controller
                name="osType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select OS" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-lg border-border/85">
                      <SelectItem value="none-os">— None —</SelectItem>
                      {["Windows", "Ubuntu", "macOS", "Linux", "Other"].map((os) => (
                        <SelectItem key={os} value={os}>
                          {os}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Specs */}
        <Card className="shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="border-b border-border/40 pb-4 mb-4 bg-muted/10">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-indigo-500 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-500 rounded-full" />
              Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Processor</Label>
              <Controller
                name="processorId"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Input
                      placeholder="Search processor..."
                      value={processorSearch}
                      onChange={(e) => setProcessorSearch(e.target.value)}
                      className="h-9 mb-1"
                    />
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select processor" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-lg border-border/85 max-h-60">
                        <SelectItem value="none-proc">— None —</SelectItem>
                        {filteredProcessors.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {p.brand ? `(${p.brand})` : ""} — {p.grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">RAM (GB)</Label>
                <Input
                  type="number"
                  min={0}
                  {...register("ramGb", { valueAsNumber: true })}
                  placeholder="e.g. 16"
                />
                {errors.ramGb && <p className="text-xs text-destructive">{errors.ramGb.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Storage (GB)</Label>
                <Input
                  type="number"
                  min={0}
                  {...register("storageGb", { valueAsNumber: true })}
                  placeholder="e.g. 512"
                />
                {errors.storageGb && (
                  <p className="text-xs text-destructive">{errors.storageGb.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Storage Type</Label>
              <Controller
                name="storageType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select storage type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-lg border-border/85">
                      <SelectItem value="none-storage">— None —</SelectItem>
                      {["SSD", "HDD", "NVMe"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Purchase Info */}
        <Card className="shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="border-b border-border/40 pb-4 mb-4 bg-muted/10">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
              Purchase Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Purchase Date</Label>
                <Input type="date" {...register("purchaseDate")} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Warranty Expiry</Label>
                <Input type="date" {...register("warrantyExpiry")} className="h-10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Purchase Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  {...register("purchasePrice", { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {errors.purchasePrice && (
                  <p className="text-xs text-destructive">{errors.purchasePrice.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Currency</Label>
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-lg border-border/85">
                        {["INR", "USD", "EUR", "GBP"].map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vendor</Label>
              <Controller
                name="vendorId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-lg border-border/85 max-h-60">
                      <SelectItem value="none-vendor">— None —</SelectItem>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {!asset && (
              <div className="pt-4 border-t border-border/60 space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Invoice Attachment
                </p>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Invoice Number</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-2026-001"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Invoice File (PDF or Photo)</Label>
                  <FileUploadZone
                    onFileSelect={setUploadFile}
                    currentFile={uploadFile ? { name: uploadFile.name } : null}
                    onClear={() => setUploadFile(null)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="border-b border-border/40 pb-4 mb-4 bg-muted/10">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-amber-500 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
              Location & Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Department</Label>
              <Controller
                name="departmentId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-lg border-border/85">
                      <SelectItem value="none-dept">— None —</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Stock Location</Label>
              <Controller
                name="locationId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-lg border-border/85">
                      <SelectItem value="none-loc">— None —</SelectItem>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Remarks</Label>
              <Textarea 
                {...register("remarks")} 
                placeholder="Additional remarks..." 
                rows={3} 
                className="rounded-lg border-border/80 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-primary hover:border-primary/40 transition-all duration-200" 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
        <Button type="button" variant="outline" onClick={() => router.push("/hardware")} className="px-5">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="px-6 shadow-md hover:shadow-lg transition-all duration-200">
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {asset ? "Update Asset" : "Create Asset"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useVendor } from "@/lib/hooks/useVendors";
import { api, type HardwareInvoice } from "@/lib/api";
import { PageLoader } from "@/components/shared/PageLoader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { InvoiceViewer } from "@/components/shared/InvoiceViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Eye, FileText, ExternalLink } from "lucide-react";
import { formatDate, formatCurrency, getStatusBadgeClass, formatAssetType, cn } from "@/lib/utils";
import { VendorForm } from "@/components/vendors/VendorForm";

const TYPE_BADGE: Record<string, string> = {
  HARDWARE: "text-blue-600 border-blue-200 bg-blue-50",
  SOFTWARE: "text-purple-600 border-purple-200 bg-purple-50",
  BOTH: "text-green-600 border-green-200 bg-green-50",
};

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { vendor, isLoading, mutate } = useVendor(id);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<HardwareInvoice | null>(null);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);

  if (isLoading) return <PageLoader />;
  if (!vendor) return <div className="text-muted-foreground p-8">Vendor not found.</div>;

  const assets = vendor.assets ?? [];
  const invoices = vendor.hardwareInvoices ?? [];

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteVendor(id);
      toast.success("Vendor deleted");
      router.push("/vendors");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!deleteInvoiceId) return;
    try {
      await api.deleteHardwareInvoice(deleteInvoiceId);
      toast.success("Invoice deleted");
      mutate();
      setDeleteInvoiceId(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">{vendor.name}</h1>
            <Badge variant="outline" className={cn("text-sm", TYPE_BADGE[vendor.type] ?? "")}>
              {vendor.type.charAt(0) + vendor.type.slice(1).toLowerCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {vendor.contactPerson && <span>{vendor.contactPerson}</span>}
            {vendor.email && <span>· {vendor.email}</span>}
            {vendor.phone && <span>· {vendor.phone}</span>}
            {vendor.website && (
              <a
                href={vendor.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-primary"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Website
              </a>
            )}
          </div>
          {vendor.notes && (
            <p className="text-sm text-muted-foreground mt-1">{vendor.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="assets">
        <TabsList className="mb-6">
          <TabsTrigger value="assets">Assets ({assets.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
        </TabsList>

        {/* Assets tab */}
        <TabsContent value="assets">
          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assets from this vendor.</p>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Asset ID", "Type", "Brand / Model", "Serial", "Status", "Purchase Date"].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => (
                      <tr
                        key={asset.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                        onClick={() => router.push(`/hardware/${asset.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs">{asset.assetId}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">
                            {formatAssetType(asset.type)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">{asset.brand ?? "—"}</span>{" "}
                          <span className="text-muted-foreground">{asset.model ?? ""}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {asset.serialNumber ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("text-xs", getStatusBadgeClass(asset.status))}>
                            {asset.status.replace(/_/g, " ").charAt(0) +
                              asset.status.replace(/_/g, " ").slice(1).toLowerCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(asset.purchaseDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Invoices tab */}
        <TabsContent value="invoices">
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices from this vendor.</p>
          ) : (
            <Card>
              <div className="divide-y divide-border">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 p-4">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{inv.invoiceNumber ?? "Invoice"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(inv.invoiceDate)} · {formatCurrency(inv.amount, inv.currency)}
                      </p>
                    </div>
                    {inv.filePath && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setViewInvoice(inv)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-destructive"
                      onClick={() => setDeleteInvoiceId(inv.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Vendor Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
          </DialogHeader>
          <VendorForm
            vendor={vendor}
            onSuccess={() => {
              mutate();
              setEditOpen(false);
            }}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Vendor Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Vendor"
        description="Delete this vendor? Assets linked to this vendor will lose the vendor reference."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* Delete Invoice Confirm */}
      <ConfirmDialog
        open={!!deleteInvoiceId}
        onOpenChange={(o) => !o && setDeleteInvoiceId(null)}
        title="Delete Invoice"
        description="Delete this invoice and its file permanently?"
        confirmLabel="Delete"
        onConfirm={handleDeleteInvoice}
      />

      {/* Invoice Viewer */}
      {viewInvoice && (
        <InvoiceViewer
          open={!!viewInvoice}
          onOpenChange={(o) => !o && setViewInvoice(null)}
          filePath={viewInvoice.filePath}
          fileName={viewInvoice.fileName}
          fileType={viewInvoice.fileType}
        />
      )}
    </div>
  );
}

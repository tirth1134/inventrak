"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useAsset } from "@/lib/hooks/useHardware";
import { api, type Accessory, type HardwareInvoiceItem, type AssetAssignment, type MaintenanceLog } from "@/lib/api";
import { PageLoader } from "@/components/shared/PageLoader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FileUploadZone } from "@/components/shared/FileUploadZone";
import { InvoiceViewer } from "@/components/shared/InvoiceViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import useSWR from "swr";
import {
  Pencil,
  Trash2,
  Eye,
  Printer,
  Plus,
  Loader2,
  FileText,
  UserCheck,
  UserX,
  AlertTriangle,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  getStatusBadgeClass,
  getProcessorGradeBadge,
  getAssetAge,
  formatAssetType,
  getDaysUntil,
  cn,
  generateInitials,
} from "@/lib/utils";

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { asset, isLoading, mutate } = useAsset(id);

  // SWR calls for sub-resources
  const { data: accessoriesData, mutate: mutateAccessories } = useSWR(
    `/hardware/${id}/accessories`,
    () => api.getAccessories(id)
  );
  const { data: invoicesData, mutate: mutateInvoices } = useSWR(
    `/hardware/${id}/invoices`,
    () => api.getAssetInvoices(id)
  );
  const { data: historyData, mutate: mutateHistory } = useSWR(
    `/hardware/${id}/assign/history`,
    () => api.getAssignmentHistory(id)
  );
  const { data: maintenanceData, mutate: mutateMaintenance } = useSWR(
    `/hardware/${id}/maintenance`,
    async () => {
      const res = await fetch(`/api/hardware/${id}/maintenance`);
      if (!res.ok) return { data: [] as MaintenanceLog[] };
      return res.json() as Promise<{ data: MaintenanceLog[] }>;
    }
  );
  const { data: employeesData } = useSWR(
    "/employees?limit=200&status=ACTIVE",
    () => api.getEmployees("limit=200&status=ACTIVE")
  );

  const accessories: Accessory[] = accessoriesData?.data ?? [];
  const invoiceItems: HardwareInvoiceItem[] = invoicesData?.data ?? [];
  const assignHistory: AssetAssignment[] = historyData?.data ?? [];
  const maintenanceLogs: MaintenanceLog[] = maintenanceData?.data ?? asset?.maintenanceLogs ?? [];
  const allEmployees = employeesData?.data ?? [];

  // Scrap state
  const [scrapOpen, setScrapOpen] = useState(false);
  const [scrapReason, setScrapReason] = useState("");
  const [scrapDisposal, setScrapDisposal] = useState("");
  const [scrapping, setScrapping] = useState(false);

  // Reassign state
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignEmpId, setReassignEmpId] = useState("");
  const [reassignNotes, setReassignNotes] = useState("");
  const [reassigning, setReassigning] = useState(false);

  // Unassign state
  const [unassignOpen, setUnassignOpen] = useState(false);
  const [unassigning, setUnassigning] = useState(false);

  // Accessory state
  const [accOpen, setAccOpen] = useState(false);
  const [editAcc, setEditAcc] = useState<Accessory | null>(null);
  const [deleteAccId, setDeleteAccId] = useState<string | null>(null);
  const [accLoading, setAccLoading] = useState(false);
  const [accForm, setAccForm] = useState({
    name: "",
    brand: "",
    serialNumber: "",
    warrantyExpiry: "",
    purchaseDate: "",
    status: "IN_USE" as Accessory["status"],
  });

  // Invoice state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [invNum, setInvNum] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invDate, setInvDate] = useState(new Date().toISOString().split("T")[0]);
  const [uploading, setUploading] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<HardwareInvoiceItem | null>(null);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);

  // Maintenance state
  const [maintOpen, setMaintOpen] = useState(false);
  const [maintLoading, setMaintLoading] = useState(false);
  const [maintForm, setMaintForm] = useState({
    serviceDate: new Date().toISOString().split("T")[0],
    description: "",
    cost: "",
    vendor: "",
  });

  if (isLoading) return <PageLoader />;
  if (!asset) return <div className="text-muted-foreground p-8">Asset not found.</div>;

  const currentAssignment = asset.assignments?.find((a) => a.isCurrent);

  const handleScrap = async () => {
    setScrapping(true);
    try {
      await api.createScrap({
        assetId: asset.id,
        reason: scrapReason || undefined,
        disposalMethod: scrapDisposal || undefined,
      });
      toast.success("Asset scrapped");
      mutate();
      setScrapOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setScrapping(false);
    }
  };

  const handleReassign = async () => {
    if (!reassignEmpId) return;
    setReassigning(true);
    try {
      await api.assignAsset(id, {
        employeeId: reassignEmpId,
        notes: reassignNotes || undefined,
      });
      toast.success("Asset assigned");
      mutate();
      mutateHistory();
      setReassignOpen(false);
      setReassignEmpId("");
      setReassignNotes("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReassigning(false);
    }
  };

  const handleUnassign = async () => {
    setUnassigning(true);
    try {
      await api.unassignAsset(id);
      toast.success("Asset unassigned");
      mutate();
      mutateHistory();
      setUnassignOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUnassigning(false);
    }
  };

  const openAddAccessory = () => {
    setEditAcc(null);
    setAccForm({ name: "", brand: "", serialNumber: "", warrantyExpiry: "", purchaseDate: "", status: "IN_USE" });
    setAccOpen(true);
  };

  const openEditAccessory = (acc: Accessory) => {
    setEditAcc(acc);
    setAccForm({
      name: acc.name,
      brand: acc.brand ?? "",
      serialNumber: acc.serialNumber ?? "",
      warrantyExpiry: acc.warrantyExpiry ? acc.warrantyExpiry.split("T")[0] : "",
      purchaseDate: acc.purchaseDate ? acc.purchaseDate.split("T")[0] : "",
      status: acc.status,
    });
    setAccOpen(true);
  };

  const handleSaveAccessory = async () => {
    if (!accForm.name) { toast.error("Name is required"); return; }
    setAccLoading(true);
    try {
      const payload = {
        ...accForm,
        warrantyExpiry: accForm.warrantyExpiry ? new Date(accForm.warrantyExpiry).toISOString() : undefined,
        purchaseDate: accForm.purchaseDate ? new Date(accForm.purchaseDate).toISOString() : undefined,
        brand: accForm.brand || undefined,
        serialNumber: accForm.serialNumber || undefined,
      };
      if (editAcc) {
        await api.updateAccessory(id, editAcc.id, payload);
        toast.success("Accessory updated");
      } else {
        await api.addAccessory(id, payload);
        toast.success("Accessory added");
      }
      mutateAccessories();
      setAccOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAccLoading(false);
    }
  };

  const handleDeleteAccessory = async () => {
    if (!deleteAccId) return;
    try {
      await api.deleteAccessory(id, deleteAccId);
      toast.success("Accessory deleted");
      mutateAccessories();
      setDeleteAccId(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleUploadInvoice = async () => {
    if (!invAmount || !invDate) { toast.error("Amount and date are required"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("assetId", asset.id);
      fd.append("amount", invAmount);
      fd.append("invoiceDate", new Date(invDate).toISOString());
      fd.append("currency", asset.currency);
      if (invNum) fd.append("invoiceNumber", invNum);
      if (uploadFile) fd.append("file", uploadFile);
      await api.createHardwareInvoice(fd);
      toast.success("Invoice attached");
      mutateInvoices();
      setUploadOpen(false);
      setUploadFile(null); setInvNum(""); setInvAmount(""); setInvDate(new Date().toISOString().split("T")[0]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!deleteInvoiceId) return;
    try {
      await api.deleteHardwareInvoice(deleteInvoiceId);
      toast.success("Invoice deleted");
      mutateInvoices();
      setDeleteInvoiceId(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleAddMaintenance = async () => {
    if (!maintForm.description || !maintForm.serviceDate) {
      toast.error("Service date and description are required");
      return;
    }
    setMaintLoading(true);
    try {
      const res = await fetch(`/api/hardware/${id}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceDate: new Date(maintForm.serviceDate).toISOString(),
          description: maintForm.description,
          cost: maintForm.cost ? parseFloat(maintForm.cost) : undefined,
          vendor: maintForm.vendor || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(err.error || "Failed to add maintenance log");
      }
      toast.success("Maintenance log added");
      mutateMaintenance();
      setMaintOpen(false);
      setMaintForm({ serviceDate: new Date().toISOString().split("T")[0], description: "", cost: "", vendor: "" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setMaintLoading(false);
    }
  };

  const warrantyDays = asset.warrantyExpiry ? getDaysUntil(asset.warrantyExpiry) : null;
  const gradeBadge = asset.processor ? getProcessorGradeBadge(asset.processor.grade) : null;

  const printLabel = () => window.print();

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-bold font-mono text-foreground">{asset.assetId}</span>
            <Badge variant="secondary" className="text-sm">
              {formatAssetType(asset.type)}
            </Badge>
            <Badge variant="outline" className={cn("text-sm", getStatusBadgeClass(asset.status))}>
              {asset.status.replace(/_/g, " ").charAt(0) +
                asset.status.replace(/_/g, " ").slice(1).toLowerCase()}
            </Badge>
          </div>
          {asset.brand && (
            <p className="text-sm text-muted-foreground">
              {asset.brand} {asset.model}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/hardware/${id}/edit`)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
          {asset.status !== "SCRAPPED" && (
            <Button variant="destructive" size="sm" onClick={() => setScrapOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Scrap Asset
            </Button>
          )}
        </div>
      </div>

      {/* Asset Label Card (print-only) */}
      <div className="hidden print:block border-2 border-gray-800 rounded p-4 w-72 mb-6 font-mono text-sm">
        <p className="font-bold text-base mb-2">InvenTrack Asset Label</p>
        <p>ID: {asset.assetId}</p>
        <p>S/N: {asset.serialNumber ?? "—"}</p>
        <p>
          Type: {formatAssetType(asset.type)}
          {asset.osType ? ` (${asset.osType})` : ""}
        </p>
        {asset.processor && <p>Processor: {asset.processor.name}</p>}
        {asset.ramGb && <p>RAM: {asset.ramGb} GB</p>}
        {currentAssignment && <p>Assigned: {currentAssignment.employee.name}</p>}
        {asset.department && <p>Dept: {asset.department.name}</p>}
      </div>

      {/* Print Label button — screen only */}
      <div className="print:hidden mb-4">
        <Card className="max-w-xs">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">ASSET LABEL</p>
            <div className="font-mono text-xs space-y-1 mb-3">
              <p>ID: {asset.assetId}</p>
              <p>S/N: {asset.serialNumber ?? "—"}</p>
              <p>
                Type: {formatAssetType(asset.type)}
                {asset.osType ? ` (${asset.osType})` : ""}
              </p>
              {asset.processor && <p>Processor: {asset.processor.name}</p>}
              {asset.ramGb && <p>RAM: {asset.ramGb} GB</p>}
              {currentAssignment && <p>Assigned: {currentAssignment.employee.name}</p>}
              {asset.department && <p>Dept: {asset.department.name}</p>}
            </div>
            <Button size="sm" variant="outline" onClick={printLabel}>
              <Printer className="w-3.5 h-3.5 mr-2" />
              Print Label
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="print:hidden">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignment">Assignment</TabsTrigger>
          <TabsTrigger value="accessories">
            Accessories ({accessories.length})
          </TabsTrigger>
          <TabsTrigger value="invoices-maint">Invoices & Maintenance</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Asset Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Brand", asset.brand ?? "—"],
                  ["Model", asset.model ?? "—"],
                  ["Serial Number", asset.serialNumber ?? "—"],
                  ["OS Type", asset.osType ?? "—"],
                  ["Storage", asset.storageGb ? `${asset.storageGb} GB ${asset.storageType ?? ""}`.trim() : "—"],
                  ["RAM", asset.ramGb ? `${asset.ramGb} GB` : "—"],
                  ["Department", asset.department?.name ?? "—"],
                  ["Location", asset.location?.name ?? "—"],
                  ["Vendor", asset.vendor?.name ?? "—"],
                  ["Purchase Date", formatDate(asset.purchaseDate)],
                  ["Purchase Price", asset.purchasePrice ? formatCurrency(asset.purchasePrice, asset.currency) : "—"],
                  ["Age", getAssetAge(asset.purchaseDate)],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium">{String(value)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              {/* Processor */}
              {asset.processor && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground mb-1">Processor</p>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{asset.processor.name}</span>
                      {gradeBadge && (
                        <Badge variant="outline" className={cn("text-xs", gradeBadge.class)}>
                          {gradeBadge.label}
                        </Badge>
                      )}
                    </div>
                    {asset.processor.brand && (
                      <p className="text-xs text-muted-foreground mt-0.5">{asset.processor.brand}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Warranty */}
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Warranty</p>
                  {asset.warrantyExpiry ? (
                    <div>
                      <p
                        className={cn(
                          "font-medium",
                          warrantyDays !== null && warrantyDays < 0
                            ? "text-red-600"
                            : warrantyDays !== null && warrantyDays < 60
                            ? "text-amber-600"
                            : "text-foreground"
                        )}
                      >
                        {formatDate(asset.warrantyExpiry)}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs mt-1",
                          warrantyDays !== null && warrantyDays < 0
                            ? "text-red-600 border-red-200 bg-red-50"
                            : warrantyDays !== null && warrantyDays < 60
                            ? "text-amber-600 border-amber-200 bg-amber-50"
                            : "text-green-600 border-green-200 bg-green-50"
                        )}
                      >
                        {warrantyDays !== null && warrantyDays < 0
                          ? `Expired ${Math.abs(warrantyDays)} days ago`
                          : warrantyDays !== null
                          ? `${warrantyDays} days remaining`
                          : "Active"}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </CardContent>
              </Card>

              {/* Remarks */}
              {asset.remarks && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground mb-1">Remarks</p>
                    <p className="text-sm whitespace-pre-wrap">{asset.remarks}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Assignment */}
        <TabsContent value="assignment">
          <div className="space-y-6">
            {/* Current Assignment */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm">Current Assignment</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setReassignOpen(true)}>
                    <UserCheck className="w-4 h-4 mr-2" />
                    {currentAssignment ? "Reassign" : "Assign"}
                  </Button>
                  {currentAssignment && (
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => setUnassignOpen(true)}>
                      <UserX className="w-4 h-4 mr-2" />
                      Unassign
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {currentAssignment ? (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {generateInitials(currentAssignment.employee.name)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 flex-1 text-sm">
                      {[
                        ["Name", currentAssignment.employee.name],
                        ["Email", currentAssignment.employee.email],
                        ["Department", currentAssignment.employee.department?.name ?? "—"],
                        ["Designation", currentAssignment.employee.designation?.title ?? "—"],
                        ["Assigned On", formatDate(currentAssignment.assignedAt)],
                        ["Notes", currentAssignment.notes ?? "—"],
                      ].map(([label, value]) => (
                        <div key={String(label)}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-medium">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not currently assigned to anyone.</p>
                )}
              </CardContent>
            </Card>

            {/* Assignment History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Assignment History</CardTitle>
              </CardHeader>
              <CardContent>
                {assignHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assignment history.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {assignHistory.map((h) => (
                      <div key={h.id} className="flex items-center gap-3 py-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {generateInitials(h.employee.name)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{h.employee.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(h.assignedAt)} →{" "}
                            {h.returnedAt ? formatDate(h.returnedAt) : "Present"}
                          </p>
                        </div>
                        {h.isCurrent && (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                            Current
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Accessories */}
        <TabsContent value="accessories">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={openAddAccessory}>
              <Plus className="w-4 h-4 mr-2" />
              Add Accessory
            </Button>
          </div>
          {accessories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accessories attached.</p>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Name", "Brand", "Serial", "Warranty", "Status", ""].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {accessories.map((acc) => (
                      <tr key={acc.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium">{acc.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{acc.brand ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{acc.serialNumber ?? "—"}</td>
                        <td className="px-4 py-3">{formatDate(acc.warrantyExpiry)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn("text-xs", getStatusBadgeClass(acc.status))}>
                            {acc.status.replace(/_/g, " ").charAt(0) +
                              acc.status.replace(/_/g, " ").slice(1).toLowerCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEditAccessory(acc)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => setDeleteAccId(acc.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Invoices & Maintenance */}
        <TabsContent value="invoices-maint">
          <Tabs defaultValue="invoices">
            <TabsList className="mb-4">
              <TabsTrigger value="invoices">Invoices ({invoiceItems.length})</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance Log ({maintenanceLogs.length})</TabsTrigger>
            </TabsList>

            {/* Invoices sub-tab */}
            <TabsContent value="invoices">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => setUploadOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Attach Invoice
                </Button>
              </div>
              {invoiceItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices attached.</p>
              ) : (
                <Card>
                  <div className="divide-y divide-border">
                    {invoiceItems.map((item) => {
                      const inv = item.invoice;
                      return (
                        <div key={item.id} className="flex items-center gap-3 p-4">
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
                              onClick={() => setViewInvoice(item)}
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
                      );
                    })}
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Maintenance sub-tab */}
            <TabsContent value="maintenance">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => setMaintOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
              </div>
              {maintenanceLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No maintenance logs.</p>
              ) : (
                <Card>
                  <div className="divide-y divide-border">
                    {maintenanceLogs.map((log) => (
                      <div key={log.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium">{log.description}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(log.serviceDate)}
                              {log.vendor ? ` · ${log.vendor}` : ""}
                              {log.cost ? ` · ${formatCurrency(log.cost, asset.currency)}` : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Scrap Confirm Dialog */}
      <Dialog
        open={scrapOpen}
        onOpenChange={(o) => { if (!o) { setScrapOpen(false); setScrapReason(""); setScrapDisposal(""); } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Scrap Asset
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This will permanently mark asset <span className="font-mono font-medium text-foreground">{asset.assetId}</span> as scrapped.
            </p>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={scrapReason} onChange={(e) => setScrapReason(e.target.value)} placeholder="e.g. End of life" />
            </div>
            <div className="space-y-1.5">
              <Label>Disposal Method</Label>
              <Input value={scrapDisposal} onChange={(e) => setScrapDisposal(e.target.value)} placeholder="e.g. Recycled" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setScrapOpen(false)} disabled={scrapping}>Cancel</Button>
            <Button variant="destructive" onClick={handleScrap} disabled={scrapping}>
              {scrapping && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Scrap Asset
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={reassignOpen} onOpenChange={(o) => { if (!o) { setReassignOpen(false); setReassignEmpId(""); setReassignNotes(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{currentAssignment ? "Reassign Asset" : "Assign Asset"}</DialogTitle>
          </DialogHeader>
          {currentAssignment && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Currently assigned to <strong>{currentAssignment.employee.name}</strong>. Reassigning will unassign them first.
            </div>
          )}
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <select
                value={reassignEmpId}
                onChange={(e) => setReassignEmpId(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"
              >
                <option value="">Select employee...</option>
                {allEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.department?.name ?? "—"})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input value={reassignNotes} onChange={(e) => setReassignNotes(e.target.value)} placeholder="Assignment notes..." />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReassignOpen(false)} disabled={reassigning}>Cancel</Button>
            <Button onClick={handleReassign} disabled={!reassignEmpId || reassigning}>
              {reassigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {currentAssignment ? "Reassign" : "Assign"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unassign Confirm */}
      <ConfirmDialog
        open={unassignOpen}
        onOpenChange={setUnassignOpen}
        title="Unassign Asset"
        description={`Remove assignment from ${currentAssignment?.employee.name ?? "this employee"}?`}
        confirmLabel="Unassign"
        onConfirm={handleUnassign}
        loading={unassigning}
      />

      {/* Accessory Dialog */}
      <Dialog open={accOpen} onOpenChange={(o) => !o && setAccOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editAcc ? "Edit Accessory" : "Add Accessory"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={accForm.name} onChange={(e) => setAccForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. USB-C Charger" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Brand</Label>
                <Input value={accForm.brand} onChange={(e) => setAccForm((f) => ({ ...f, brand: e.target.value }))} placeholder="e.g. Dell" />
              </div>
              <div className="space-y-1.5">
                <Label>Serial Number</Label>
                <Input value={accForm.serialNumber} onChange={(e) => setAccForm((f) => ({ ...f, serialNumber: e.target.value }))} className="font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Warranty Expiry</Label>
                <Input type="date" value={accForm.warrantyExpiry} onChange={(e) => setAccForm((f) => ({ ...f, warrantyExpiry: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Purchase Date</Label>
                <Input type="date" value={accForm.purchaseDate} onChange={(e) => setAccForm((f) => ({ ...f, purchaseDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={accForm.status} onValueChange={(v) => setAccForm((f) => ({ ...f, status: v as Accessory["status"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_USE">In Use</SelectItem>
                  <SelectItem value="IN_STOCK">In Stock</SelectItem>
                  <SelectItem value="IN_REPAIR">In Repair</SelectItem>
                  <SelectItem value="SCRAPPED">Scrapped</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAccOpen(false)} disabled={accLoading}>Cancel</Button>
            <Button onClick={handleSaveAccessory} disabled={accLoading}>
              {accLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editAcc ? "Update" : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Accessory Confirm */}
      <ConfirmDialog
        open={!!deleteAccId}
        onOpenChange={(o) => !o && setDeleteAccId(null)}
        title="Delete Accessory"
        description="Delete this accessory? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteAccessory}
      />

      {/* Upload Invoice Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(o) => !o && setUploadOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Attach Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Invoice # (optional)</Label>
                <Input value={invNum} onChange={(e) => setInvNum(e.target.value)} placeholder="INV-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Amount *</Label>
                <Input type="number" step="0.01" value={invAmount} onChange={(e) => setInvAmount(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Date *</Label>
              <Input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} />
            </div>
            <FileUploadZone onFileSelect={setUploadFile} currentFile={uploadFile ? { name: uploadFile.name } : null} onClear={() => setUploadFile(null)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancel</Button>
            <Button onClick={handleUploadInvoice} disabled={uploading}>
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Attach
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
          filePath={viewInvoice.invoice.filePath}
          fileName={viewInvoice.invoice.fileName}
          fileType={viewInvoice.invoice.fileType}
        />
      )}

      {/* Maintenance Dialog */}
      <Dialog open={maintOpen} onOpenChange={(o) => !o && setMaintOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Maintenance Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Service Date *</Label>
              <Input type="date" value={maintForm.serviceDate} onChange={(e) => setMaintForm((f) => ({ ...f, serviceDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea value={maintForm.description} onChange={(e) => setMaintForm((f) => ({ ...f, description: e.target.value }))} placeholder="What was done?" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cost (optional)</Label>
                <Input type="number" step="0.01" value={maintForm.cost} onChange={(e) => setMaintForm((f) => ({ ...f, cost: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Vendor (optional)</Label>
                <Input value={maintForm.vendor} onChange={(e) => setMaintForm((f) => ({ ...f, vendor: e.target.value }))} placeholder="Vendor name" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMaintOpen(false)} disabled={maintLoading}>Cancel</Button>
            <Button onClick={handleAddMaintenance} disabled={maintLoading}>
              {maintLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

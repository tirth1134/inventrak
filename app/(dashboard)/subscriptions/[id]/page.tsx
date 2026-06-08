"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/lib/hooks/useSubscriptions";
import { api, type SubscriptionUser, type SoftwareInvoice } from "@/lib/api";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import useSWR from "swr";
import {
  Pencil, Trash2, Eye, EyeOff, Copy, Check, FileText, Plus, Loader2,
  ExternalLink, Users, Receipt, X,
} from "lucide-react";
import { formatCurrency, formatDate, getStatusBadgeClass, cn } from "@/lib/utils";

function CredentialsCard({ subId }: { subId: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<"u" | "p" | null>(null);
  const [hideTimer, setHideTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, mutate } = useSWR(
    revealed ? `/subscriptions/${subId}/credentials` : null,
    () => api.getSubscriptionCredentials(subId)
  );

  const creds = data?.data;

  const reveal = () => {
    setRevealed(true);
    if (hideTimer) clearTimeout(hideTimer);
    const t = setTimeout(() => setRevealed(false), 30000);
    setHideTimer(t);
  };

  const copyText = (text: string, field: "u" | "p") => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">🔒 Credentials</CardTitle>
      </CardHeader>
      <CardContent>
        {!revealed ? (
          <Button variant="outline" size="sm" onClick={reveal}>
            <Eye className="w-4 h-4 mr-2" />Reveal Credentials
          </Button>
        ) : isLoading ? (
          <div className="space-y-2"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Auto-hides in 30 seconds</p>
            {["username", "password"].map((field) => {
              const val = field === "username" ? creds?.username : creds?.password;
              const isField = field === "username" ? "u" : "p" as "u" | "p";
              return (
                <div key={field} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16 capitalize">{field}</span>
                  <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded font-mono truncate">{val || "—"}</code>
                  {val && (
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => copyText(val, isField)}>
                      {copied === isField ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                </div>
              );
            })}
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setRevealed(false)}>
              <EyeOff className="w-3.5 h-3.5 mr-1" />Hide
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { subscription, isLoading, mutate } = useSubscription(id);

  const { data: usersData, mutate: mutateUsers } = useSWR(
    `/subscriptions/${id}/users`, () => api.getSubscriptionUsers(id)
  );
  const { data: invoicesData, mutate: mutateInvoices } = useSWR(
    `/subscriptions/${id}/invoices`, () => api.getSubscriptionInvoices(id)
  );

  const users: SubscriptionUser[] = usersData?.data ?? [];
  const invoices: SoftwareInvoice[] = invoicesData?.data ?? [];

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignEmpId, setAssignEmpId] = useState("");
  const [assignUsername, setAssignUsername] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [invoiceNum, setInvoiceNum] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [uploading, setUploading] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<SoftwareInvoice | null>(null);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);

  const { data: employeesData } = useSWR("/employees?limit=200&status=ACTIVE", () => api.getEmployees("limit=200&status=ACTIVE"));
  const allEmployees = employeesData?.data ?? [];
  const assignedIds = new Set(users.map((u) => u.employeeId));
  const availableEmployees = allEmployees.filter((e) => !assignedIds.has(e.id));

  if (isLoading) return <PageLoader />;
  if (!subscription) return <div className="text-muted-foreground">Subscription not found.</div>;

  const price = subscription.price;
  const annualCost = subscription.billingCycle === "MONTHLY" ? price * 12 : subscription.billingCycle === "YEARLY" ? price : price;
  const costPerUser = subscription.licenceCount > 0 ? price / subscription.licenceCount : price;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteSubscription(id);
      toast.success("Subscription deleted");
      router.push("/subscriptions");
    } catch (e) { toast.error((e as Error).message); }
    finally { setDeleting(false); }
  };

  const handleAssign = async () => {
    if (!assignEmpId) return;
    setAssignLoading(true);
    try {
      await api.assignSubscriptionUser(id, { employeeId: assignEmpId, username: assignUsername || undefined });
      toast.success("Employee assigned");
      mutateUsers();
      setAssignOpen(false);
      setAssignEmpId(""); setAssignUsername("");
    } catch (e) { toast.error((e as Error).message); }
    finally { setAssignLoading(false); }
  };

  const handleRemoveUser = async () => {
    if (!removeUserId) return;
    try {
      await api.removeSubscriptionUser(id, removeUserId);
      toast.success("Employee removed");
      mutateUsers();
      setRemoveUserId(null);
    } catch (e) { toast.error((e as Error).message); }
  };

  const handleUploadInvoice = async () => {
    if (!invoiceAmount || !invoiceDate) { toast.error("Amount and date are required"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("amount", invoiceAmount);
      fd.append("invoiceDate", new Date(invoiceDate).toISOString());
      fd.append("currency", subscription.currency);
      if (invoiceNum) fd.append("invoiceNumber", invoiceNum);
      if (uploadFile) fd.append("file", uploadFile);
      await api.uploadSubscriptionInvoice(id, fd);
      toast.success("Invoice uploaded");
      mutateInvoices();
      setUploadOpen(false);
      setUploadFile(null); setInvoiceNum(""); setInvoiceAmount(""); setInvoiceDate(new Date().toISOString().split("T")[0]);
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(false); }
  };

  const handleDeleteInvoice = async () => {
    if (!deleteInvoiceId) return;
    try {
      await api.deleteSubscriptionInvoice(id, deleteInvoiceId);
      toast.success("Invoice deleted");
      mutateInvoices();
      setDeleteInvoiceId(null);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{subscription.name}</h1>
              {subscription.url && (
                <a href={subscription.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              {subscription.category && <Badge variant="secondary" className="text-xs">{subscription.category}</Badge>}
              <Badge variant="outline" className={cn("text-xs", getStatusBadgeClass(subscription.status))}>
                {subscription.status.charAt(0) + subscription.status.slice(1).toLowerCase()}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/subscriptions/${id}/edit`)}>
            <Pencil className="w-4 h-4 mr-2" />Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" />Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-3.5 h-3.5 mr-1.5" />Users ({users.length})</TabsTrigger>
          <TabsTrigger value="invoices"><Receipt className="w-3.5 h-3.5 mr-1.5" />Invoices ({invoices.length})</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="pt-5 grid grid-cols-2 gap-4 text-sm">
                  {[
                    ["Plan", subscription.planName || "—"],
                    ["Billing Cycle", subscription.billingCycle],
                    ["Buy Date", formatDate(subscription.buyDate)],
                    ["Renewal Date", formatDate(subscription.renewalDate)],
                    ["Next Payment", formatDate(subscription.nextPaymentDate)],
                    ["Payment Method", subscription.paymentMethod || "—"],
                    ["Department", subscription.department?.name || "—"],
                    ["Team Lead", subscription.teamLeadName || "—"],
                    ["Licences", subscription.licenceCount],
                    ["Tags", subscription.tags.join(", ") || "—"],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium text-foreground">{String(value)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              {subscription.notes && (
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{subscription.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              {/* Cost summary */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Cost Summary</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price / cycle</span>
                    <span className="font-semibold">{formatCurrency(price, subscription.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost per user</span>
                    <span className="font-semibold">{formatCurrency(costPerUser, subscription.currency)}</span>
                  </div>
                  {subscription.billingCycle === "MONTHLY" && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Annual cost</span>
                      <span className="font-semibold">{formatCurrency(annualCost, subscription.currency)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              <CredentialsCard subId={id} />
            </div>
          </div>
        </TabsContent>

        {/* Users tab */}
        <TabsContent value="users">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setAssignOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Assign Employee
            </Button>
          </div>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employees assigned yet.</p>
          ) : (
            <Card>
              <div className="divide-y divide-border">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {u.employee.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{u.employee.name}</p>
                      <p className="text-xs text-muted-foreground">{u.employee.email} {u.employee.department ? `· ${u.employee.department.name}` : ""}</p>
                    </div>
                    {u.username && <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{u.username}</code>}
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => setRemoveUserId(u.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Invoices tab */}
        <TabsContent value="invoices">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Upload Invoice
            </Button>
          </div>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <Card>
              <div className="divide-y divide-border">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 p-4">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{inv.invoiceNumber || "Invoice"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(inv.invoiceDate)} · {formatCurrency(inv.amount, inv.currency)}</p>
                    </div>
                    {inv.filePath && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setViewInvoice(inv)}>
                        <Eye className="w-3.5 h-3.5 mr-1" />View
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => setDeleteInvoiceId(inv.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Subscription" description="This action cannot be undone. The subscription and all its invoices will be permanently deleted." confirmLabel="Delete" onConfirm={handleDelete} loading={deleting} />
      <ConfirmDialog open={!!removeUserId} onOpenChange={(o) => !o && setRemoveUserId(null)} title="Remove Employee" description="Remove this employee from the subscription?" confirmLabel="Remove" onConfirm={handleRemoveUser} />
      <ConfirmDialog open={!!deleteInvoiceId} onOpenChange={(o) => !o && setDeleteInvoiceId(null)} title="Delete Invoice" description="Delete this invoice and its file?" confirmLabel="Delete" onConfirm={handleDeleteInvoice} />

      {/* Assign modal */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign Employee</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <select value={assignEmpId} onChange={(e) => setAssignEmpId(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card">
                <option value="">Select employee...</option>
                {availableEmployees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.department?.name})</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Username on tool (optional)</Label>
              <Input value={assignUsername} onChange={(e) => setAssignUsername(e.target.value)} placeholder="username@tool.com" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!assignEmpId || assignLoading}>
              {assignLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload invoice modal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
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
                <Input type="number" step="0.01" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Date *</Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <FileUploadZone onFileSelect={setUploadFile} currentFile={uploadFile ? { name: uploadFile.name } : null} onClear={() => setUploadFile(null)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUploadInvoice} disabled={uploading}>
              {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {viewInvoice && (
        <InvoiceViewer open={!!viewInvoice} onOpenChange={(o) => !o && setViewInvoice(null)} filePath={viewInvoice.filePath} fileName={viewInvoice.fileName} fileType={viewInvoice.fileType} />
      )}
    </div>
  );
}

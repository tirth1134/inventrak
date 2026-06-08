"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useEmployee } from "@/lib/hooks/useEmployees";
import { PageLoader } from "@/components/shared/PageLoader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2 } from "lucide-react";
import { formatDate, getStatusBadgeClass, generateInitials, formatAssetType, cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { employee, isLoading } = useEmployee(id);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Employee permanently deleted");
        router.push("/employees");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete employee.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred.");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (isLoading) return <PageLoader />;
  if (!employee) return <div className="text-muted-foreground p-8">Employee not found.</div>;

  const currentAssignments = employee.assetAssignments?.filter((a) => a.isCurrent) ?? [];
  const subUsers = employee.subscriptionUsers ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
            {generateInitials(employee.name)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{employee.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {employee.designation && (
                <span className="text-sm text-muted-foreground">{employee.designation.title}</span>
              )}
              {employee.department && (
                <Badge variant="secondary" className="text-xs">
                  {employee.department.name}
                </Badge>
              )}
              <Badge variant="outline" className={cn("text-xs", getStatusBadgeClass(employee.status))}>
                {employee.status.charAt(0) + employee.status.slice(1).toLowerCase()}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>{employee.email}</span>
              {employee.phone && <span>· {employee.phone}</span>}
              {employee.isTeamLead && (
                <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 bg-blue-50">
                  Team Lead
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/employees/${id}/edit`)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hardware">
        <TabsList className="mb-6">
          <TabsTrigger value="hardware">
            Hardware ({currentAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            Subscriptions ({subUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* Hardware tab */}
        <TabsContent value="hardware">
          {currentAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hardware assets currently assigned.</p>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Asset ID", "Type", "Brand / Model", "Serial Number", "Assigned On"].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentAssignments.map((a) => {
                      const asset = a as typeof a & {
                        asset?: { id: string; assetId: string; type: string; brand?: string; model?: string; serialNumber?: string };
                      };
                      return (
                        <tr
                          key={a.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                          onClick={() => {
                            const assetData = (a as typeof asset).asset;
                            if (assetData) router.push(`/hardware/${assetData.id}`);
                          }}
                        >
                          <td className="px-4 py-3 font-mono text-xs">
                            {(a as typeof asset).asset?.assetId ?? a.assetId}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="text-xs">
                              {formatAssetType((a as typeof asset).asset?.type ?? "")}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {(a as typeof asset).asset?.brand ?? "—"}{" "}
                            <span className="text-muted-foreground">
                              {(a as typeof asset).asset?.model ?? ""}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {(a as typeof asset).asset?.serialNumber ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(a.assignedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Subscriptions tab */}
        <TabsContent value="subscriptions">
          {subUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscriptions assigned.</p>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Subscription", "Username on Tool", "Assigned On"].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subUsers.map((su) => {
                      const sub = su as typeof su & {
                        subscription?: { id: string; name: string; planName?: string; billingCycle: string };
                      };
                      return (
                        <tr
                          key={su.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                          onClick={() => {
                            const subData = (su as typeof sub).subscription;
                            if (subData) router.push(`/subscriptions/${subData.id}`);
                          }}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium">
                              {(su as typeof sub).subscription?.name ?? su.subscriptionId}
                            </p>
                            {(su as typeof sub).subscription?.planName && (
                              <p className="text-xs text-muted-foreground">
                                {(su as typeof sub).subscription?.planName}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {su.username ? (
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                {su.username}
                              </code>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(su.assignedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Employee"
        description="Are you sure you want to permanently delete this employee? This will unassign all their assets and subscriptions, and delete this employee record permanently. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}

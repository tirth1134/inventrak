"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  RefreshCw,
  Trash2,
  RotateCcw,
  CreditCard,
  Shield,
  DollarSign,
  Package,
} from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { type PaginationState } from "@tanstack/react-table";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAlerts } from "@/lib/hooks/useAlerts";
import { PageHero } from "@/components/shared/PageHero";
import { api, type Alert } from "@/lib/api";
import { formatDate, getDaysUntil, getUrgencyColor, cn } from "@/lib/utils";

const ALERT_TYPES = [
  { value: "", label: "All" },
  { value: "SUBSCRIPTION_RENEWAL", label: "Subscription Renewal" },
  { value: "WARRANTY_EXPIRY", label: "Warranty Expiry" },
  { value: "PAYMENT_DUE", label: "Payment Due" },
  { value: "LOW_STOCK", label: "Low Stock" },
];

// ... (keep helper functions)

function alertIcon(type: string) {
  const map: Record<string, React.ElementType> = {
    SUBSCRIPTION_RENEWAL: CreditCard,
    WARRANTY_EXPIRY: Shield,
    PAYMENT_DUE: DollarSign,
    LOW_STOCK: Package,
  };
  const Icon = map[type] ?? Bell;
  return <Icon className="w-3.5 h-3.5" />;
}

function alertBadgeClass(type: string) {
  const map: Record<string, string> = {
    SUBSCRIPTION_RENEWAL: "text-blue-600 border-blue-200 bg-blue-50",
    WARRANTY_EXPIRY: "text-amber-600 border-amber-200 bg-amber-50",
    PAYMENT_DUE: "text-purple-600 border-purple-200 bg-purple-50",
    LOW_STOCK: "text-orange-600 border-orange-200 bg-orange-50",
  };
  return map[type] ?? "text-gray-600 border-gray-200 bg-gray-50";
}

function alertTypeLabel(type: string) {
  const map: Record<string, string> = {
    SUBSCRIPTION_RENEWAL: "Renewal",
    WARRANTY_EXPIRY: "Warranty",
    PAYMENT_DUE: "Payment",
    LOW_STOCK: "Low Stock",
  };
  return map[type] ?? type;
}

export default function AlertsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") ?? "");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: Number(searchParams.get("page") ?? 1) - 1,
    pageSize: 20,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [bulkDismissOpen, setBulkDismissOpen] = useState(false);
  const [bulkDismissing, setBulkDismissing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const syncUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (typeFilter) p.set("type", typeFilter);
    if (pagination.pageIndex > 0) p.set("page", String(pagination.pageIndex + 1));
    const qs = p.toString();
    const newUrl = `${pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }, [typeFilter, pagination.pageIndex, pathname]);

  useEffect(() => { syncUrl(); }, [syncUrl]);

  const params = new URLSearchParams({
    page: String(pagination.pageIndex + 1),
    limit: String(pagination.pageSize),
    ...(typeFilter && { type: typeFilter }),
  }).toString();

  const { alerts, total, totalPages, isLoading, mutate } = useAlerts(params);

  const handleDismiss = async (id: string) => {
    setDismissingId(id);
    try {
      await api.dismissAlert(id);
      toast.success("Alert dismissed");
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      mutate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDismissingId(null);
    }
  };

  const handleBulkDismiss = async () => {
    setBulkDismissing(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.dismissAlert(id)));
      toast.success(`${selectedIds.size} alert${selectedIds.size > 1 ? "s" : ""} dismissed`);
      setSelectedIds(new Set());
      mutate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBulkDismissing(false);
      setBulkDismissOpen(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.generateAlerts();
      const { alertsCreated, emailsSent } = (res as { data: { alertsCreated: number; emailsSent: number } }).data;
      toast.success(`Generated ${alertsCreated} alert${alertsCreated !== 1 ? "s" : ""}. ${emailsSent} email${emailsSent !== 1 ? "s" : ""} sent.`);
      mutate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = alerts.length > 0 && alerts.every((a) => selectedIds.has(a.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        alerts.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        alerts.forEach((a) => next.add(a.id));
        return next;
      });
    }
  };

  const columns: ColumnDef<Alert>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={allSelected}
          onCheckedChange={toggleAll}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => toggleSelect(row.original.id)}
          aria-label="Select row"
        />
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return (
          <Badge
            variant="outline"
            className={cn("text-xs gap-1 flex items-center w-fit", alertBadgeClass(v))}
          >
            {alertIcon(v)}
            {alertTypeLabel(v)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ getValue }) => (
        <span className="text-sm font-medium text-foreground">{getValue() as string}</span>
      ),
    },
    {
      id: "entity",
      header: "Entity",
      cell: ({ row }) => {
        const { subscription, asset } = row.original;
        if (subscription) {
          return (
            <Link
              href={`/subscriptions/${subscription.id}`}
              className="text-sm text-primary hover:underline"
            >
              {subscription.name}
            </Link>
          );
        }
        if (asset) {
          return (
            <Link
              href={`/hardware/${asset.id}`}
              className="text-sm font-mono text-primary hover:underline"
            >
              {asset.assetId}
            </Link>
          );
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        if (!v) return <span className="text-muted-foreground">—</span>;
        const days = getDaysUntil(v);
        return (
          <span className={cn("text-sm", getUrgencyColor(days))}>
            {formatDate(v)}
          </span>
        );
      },
    },
    {
      id: "daysUntil",
      header: "Days Until",
      cell: ({ row }) => {
        const v = row.original.dueDate;
        if (!v) return <span className="text-muted-foreground">—</span>;
        const days = getDaysUntil(v);
        return (
          <span className={cn("text-sm font-medium", getUrgencyColor(days))}>
            {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d`}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const { isDismissed } = row.original;
        return (
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              isDismissed
                ? "text-gray-500 border-gray-200 bg-gray-50"
                : "text-green-600 border-green-200 bg-green-50"
            )}
          >
            {isDismissed ? "Dismissed" : "Active"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive"
          disabled={dismissingId === row.original.id || row.original.isDismissed}
          onClick={() => handleDismiss(row.original.id)}
        >
          {dismissingId === row.original.id ? (
            <RotateCcw className="w-3 h-3 animate-spin" />
          ) : (
            <Trash2 className="w-3 h-3" />
          )}
          Dismiss
        </Button>
      ),
    },
  ];

  return (
    <div className="page-shell space-y-5">
      <PageHero
        eyebrow="System Health"
        title="Alerts"
        description="Monitor renewal, warranty, and stock alerts."
        icon={Bell}
      >
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              className="shadow-sm hover:shadow transition-all"
              onClick={() => setBulkDismissOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Dismiss Selected ({selectedIds.size})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={generating}
            className="shadow-sm hover:shadow transition-all"
          >
            {generating ? (
              <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Generate Alerts
          </Button>
        </div>
      </PageHero>

      <Tabs
        value={typeFilter}
        onValueChange={(v) => {
          setTypeFilter(v);
          setPagination((p) => ({ ...p, pageIndex: 0 }));
          setSelectedIds(new Set());
        }}
        className="w-full md:w-auto"
      >
        <TabsList className="w-full md:w-auto justify-start overflow-x-auto">
          {ALERT_TYPES.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No alerts"
          description="No active alerts found. Use 'Generate Alerts' to check for upcoming renewals and expirations."
          action={{ label: "Generate Alerts", onClick: handleGenerate }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={alerts}
          total={total}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageCount={totalPages}
        />
      )}

      <ConfirmDialog
        open={bulkDismissOpen}
        onOpenChange={(o) => !o && setBulkDismissOpen(false)}
        title="Dismiss Selected Alerts"
        description={`This will dismiss ${selectedIds.size} selected alert${selectedIds.size > 1 ? "s" : ""}. This action cannot be undone.`}
        confirmLabel="Dismiss All"
        variant="destructive"
        onConfirm={handleBulkDismiss}
        loading={bulkDismissing}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, ExternalLink, MoreHorizontal, Eye, Pencil, Trash2, CreditCard } from "lucide-react";
import { type ColumnDef, type RowSelectionState } from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchInput } from "@/components/shared/SearchInput";
import { PageHero } from "@/components/shared/PageHero";
import { useSubscriptions } from "@/lib/hooks/useSubscriptions";
import { useDepartments } from "@/lib/hooks/useEmployees";
import { api, type Subscription } from "@/lib/api";
import { formatCurrency, formatDate, getStatusBadgeClass, getDaysUntil, cn } from "@/lib/utils";
import type { PaginationState } from "@tanstack/react-table";

export default function SubscriptionsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialise from URL params
  const [tab, setTab] = useState(searchParams.get("status") ?? "ALL");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [departmentId, setDepartmentId] = useState(searchParams.get("departmentId") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: Number(searchParams.get("page") ?? 1) - 1,
    pageSize: 20,
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { departments } = useDepartments();

  // Sync state → URL
  const syncUrl = useCallback((overrides: Record<string, string | undefined> = {}) => {
    const p = new URLSearchParams();
    const values: Record<string, string | undefined> = {
      status: tab !== "ALL" ? tab : undefined,
      search: search || undefined,
      departmentId: departmentId || undefined,
      category: category || undefined,
      page: pagination.pageIndex > 0 ? String(pagination.pageIndex + 1) : undefined,
      ...overrides,
    };
    Object.entries(values).forEach(([k, v]) => { if (v) p.set(k, v); });
    const qs = p.toString();
    const newUrl = `${pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }, [tab, search, departmentId, category, pagination.pageIndex, pathname]);

  useEffect(() => { syncUrl(); }, [syncUrl]);

  const apiParams = new URLSearchParams({
    page: String(pagination.pageIndex + 1),
    limit: String(pagination.pageSize),
    ...(tab !== "ALL" && { status: tab }),
    ...(search && { search }),
    ...(departmentId && { departmentId }),
    ...(category && { category }),
  }).toString();

  const { subscriptions, total, totalPages, isLoading, mutate } = useSubscriptions(apiParams);

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteSubscription(deleteId);
      toast.success("Subscription deleted");
      mutate();
      setDeleteId(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    let failed = 0;
    for (const id of selectedIds) {
      try {
        await api.deleteSubscription(id);
      } catch {
        failed++;
      }
    }
    setBulkDeleting(false);
    setBulkDeleteOpen(false);
    setRowSelection({});
    if (failed === 0) toast.success(`${selectedIds.length} subscription(s) deleted`);
    else toast.error(`${failed} deletion(s) failed`);
    mutate();
  };

  const columns: ColumnDef<Subscription>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      size: 40,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{row.original.name}</span>
          {row.original.url && (
            <a href={row.original.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
              <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary" />
            </a>
          )}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ getValue }) => getValue()
        ? <Badge variant="secondary" className="text-xs">{getValue() as string}</Badge>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "planName",
      header: "Plan",
      cell: ({ getValue }) => <span className="text-sm">{(getValue() as string) || "—"}</span>,
    },
    {
      accessorKey: "billingCycle",
      header: "Billing",
      cell: ({ getValue }) => {
        const v = getValue() as string;
        const map: Record<string, string> = { MONTHLY: "Monthly", YEARLY: "Yearly", ONE_TIME: "One-time" };
        return <Badge variant="outline" className="text-xs">{map[v] ?? v}</Badge>;
      },
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.price, row.original.currency)}</span>,
    },
    {
      accessorKey: "renewalDate",
      header: "Renewal Date",
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        if (!v) return <span className="text-muted-foreground">—</span>;
        const days = getDaysUntil(v);
        return (
          <span className={cn("text-sm", days < 30 ? (days < 7 ? "text-red-600 font-medium" : "text-amber-600") : "text-foreground")}>
            {formatDate(v)}
          </span>
        );
      },
    },
    {
      accessorKey: "licenceCount",
      header: "Licences",
      cell: ({ getValue }) => <span className="text-sm">{getValue() as number}</span>,
    },
    {
      id: "department",
      header: "Department",
      cell: ({ row }) => row.original.department?.name ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return <Badge variant="outline" className={cn("text-xs", getStatusBadgeClass(v))}>{v.charAt(0) + v.slice(1).toLowerCase()}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="w-7 h-7"><MoreHorizontal className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/subscriptions/${row.original.id}`)}>
              <Eye className="w-4 h-4 mr-2" />View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/subscriptions/${row.original.id}/edit`)}>
              <Pencil className="w-4 h-4 mr-2" />Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(row.original.id); }}>
              <Trash2 className="w-4 h-4 mr-2" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="page-shell space-y-5">
      <PageHero
        eyebrow="Software Control"
        title="Subscriptions"
        description="Track renewals, licences, spend, categories, departments, and billing status from one focused workspace."
        icon={CreditCard}
      >
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" />Delete {selectedIds.length} selected
            </Button>
          )}
          <Button onClick={() => router.push("/subscriptions/new")}>
            <Plus className="w-4 h-4 mr-2" />Add Subscription
          </Button>
        </div>
      </PageHero>

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPagination((p) => ({ ...p, pageIndex: 0 })); setRowSelection({}); }}>
        <TabsList>
          {["ALL", "ACTIVE", "CANCELLED", "EXPIRED"].map((t) => (
            <TabsTrigger key={t} value={t} className="text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="filter-panel flex flex-wrap items-center gap-4">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPagination((p) => ({ ...p, pageIndex: 0 })); }}
          placeholder="Search subscriptions..."
          className="w-64"
        />
        <Select value={departmentId || "all"} onValueChange={(v) => { setDepartmentId(v === "all" ? "" : v); setPagination((p) => ({ ...p, pageIndex: 0 })); }}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="All departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={category || "all"} onValueChange={(v) => { setCategory(v === "all" ? "" : v); setPagination((p) => ({ ...p, pageIndex: 0 })); }}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {["Dev Tool", "Design", "CRM", "Cloud", "Communication", "HR", "Finance", "Other"].map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isLoading && subscriptions.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No subscriptions yet"
          description="Add your first subscription to start tracking software costs."
          action={{ label: "Add Subscription", onClick: () => router.push("/subscriptions/new") }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={subscriptions}
          isLoading={isLoading}
          total={total}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageCount={totalPages}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          getRowId={(row) => row.id}
          onRowClick={(row) => router.push(`/subscriptions/${row.id}`)}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Subscription"
        description="This action cannot be undone. The subscription and all its invoices will be permanently deleted."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedIds.length} Subscriptions`}
        description={`Are you sure you want to permanently delete ${selectedIds.length} subscription(s)? This cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.length}`}
        variant="destructive"
        onConfirm={handleBulkDelete}
        loading={bulkDeleting}
      />
    </div>
  );
}

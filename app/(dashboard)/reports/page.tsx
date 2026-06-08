"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import useSWR from "swr";
import { Download, CreditCard, Monitor, BarChart3 } from "lucide-react";
import { PageHero } from "@/components/shared/PageHero";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/DataTable";
import { api, type Subscription, type Asset } from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  getStatusBadgeClass,
  formatAssetType,
  formatBillingCycle,
  cn,
} from "@/lib/utils";

// ── Colors ────────────────────────────────────────────────────────────────────

const PIE_COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#ef4444",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  color = "blue",
}: {
  label: string;
  value: string | number;
  color?: "blue" | "green" | "red" | "purple" | "amber";
}) {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    red: "text-red-600 bg-red-50",
    purple: "text-purple-600 bg-purple-50",
    amber: "text-amber-600 bg-amber-50",
  };
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", colorMap[color].split(" ")[0])}>{value}</p>
    </Card>
  );
}

// ── Subscription report types ─────────────────────────────────────────────────

interface SubReportData {
  summary: {
    totalActive: number;
    totalCancelled: number;
    totalMonthlySpend: number;
    totalYearlySpend: number;
    byCategory: { category: string; count: number; totalSpend: number }[];
    byDepartment: { department: string; count: number; totalSpend: number }[];
  };
  subscriptions: Subscription[];
}

interface HwReportData {
  summary: {
    total: number;
    byStatus: { IN_USE: number; IN_STOCK: number; IN_REPAIR: number; SCRAPPED: number };
    groups: { label: string; count: number; totalValue: number }[];
    totalPurchaseValue: number;
  };
  assets: (Asset & { currentAssignee?: string | null })[];
}

// ── Subscriptions Tab ─────────────────────────────────────────────────────────

function SubscriptionsTab() {
  const { data, isLoading } = useSWR("/reports/subscriptions", () =>
    api.getSubscriptionReport()
  );
  const report = (data as { data: SubReportData } | undefined)?.data;

  const subCols: ColumnDef<Subscription>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ getValue }) =>
        getValue() ? (
          <Badge variant="secondary" className="text-xs">{getValue() as string}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "billingCycle",
      header: "Billing",
      cell: ({ getValue }) => (
        <Badge variant="outline" className="text-xs">
          {formatBillingCycle(getValue() as string)}
        </Badge>
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => (
        <span className="font-medium">
          {formatCurrency(row.original.price, row.original.currency)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return (
          <Badge variant="outline" className={cn("text-xs", getStatusBadgeClass(v))}>
            {v.charAt(0) + v.slice(1).toLowerCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: "renewalDate",
      header: "Renewal",
      cell: ({ getValue }) => (
        <span className="text-sm">{formatDate(getValue() as string)}</span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const summary = report?.summary;
  const subs = report?.subscriptions ?? [];

  // Monthly spend by billing cycle (use category as X axis)
  const barData = summary?.byCategory?.map((c) => ({
    name: c.category,
    spend: c.totalSpend,
  })) ?? [];

  const pieData = summary?.byCategory?.map((c, i) => ({
    name: c.category,
    value: c.count,
    color: PIE_COLORS[i % PIE_COLORS.length],
  })) ?? [];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Active" value={summary?.totalActive ?? 0} color="green" />
        <SummaryCard
          label="Monthly Spend"
          value={formatCurrency(summary?.totalMonthlySpend ?? 0)}
          color="blue"
        />
        <SummaryCard
          label="Yearly Spend"
          value={formatCurrency(summary?.totalYearlySpend ?? 0)}
          color="purple"
        />
        <SummaryCard label="Cancelled" value={summary?.totalCancelled ?? 0} color="red" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart: spend by category */}
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-4">Spend by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip formatter={(v) => formatCurrency(v as number)} />
              <Bar dataKey="spend" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie chart: by category count */}
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-4">Subscriptions by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name} (${value})`}
                labelLine={false}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">All Subscriptions</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/api/reports/subscriptions/export")}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />Export CSV
          </Button>
        </div>
        <DataTable columns={subCols} data={subs} />
      </Card>
    </div>
  );
}

// ── Hardware Tab ──────────────────────────────────────────────────────────────

function HardwareTab() {
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const params = new URLSearchParams({
    ...(statusFilter && statusFilter !== "all" && { status: statusFilter }),
    ...(typeFilter && typeFilter !== "all" && { groupBy: "type" }),
  }).toString();

  const { data, isLoading } = useSWR(`/reports/hardware?${params}`, () =>
    api.getHardwareReport(params)
  );
  const report = (data as { data: HwReportData } | undefined)?.data;

  const hwCols: ColumnDef<Asset & { currentAssignee?: string | null }>[] = [
    {
      accessorKey: "assetId",
      header: "Asset ID",
      cell: ({ getValue }) => (
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ getValue }) => (
        <Badge variant="secondary" className="text-xs">
          {formatAssetType(getValue() as string)}
        </Badge>
      ),
    },
    {
      id: "brand_model",
      header: "Brand / Model",
      cell: ({ row }) => (
        <span className="text-sm">
          {[row.original.brand, row.original.model].filter(Boolean).join(" ") || "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return (
          <Badge variant="outline" className={cn("text-xs", getStatusBadgeClass(v))}>
            {v.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      id: "assignee",
      header: "Assignee",
      cell: ({ row }) =>
        row.original.currentAssignee ? (
          <span className="text-sm">{row.original.currentAssignee}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "purchaseDate",
      header: "Purchase Date",
      cell: ({ getValue }) => (
        <span className="text-sm">{formatDate(getValue() as string)}</span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const summary = report?.summary;
  const assets = report?.assets ?? [];

  // Filter assets client-side
  const filtered = assets.filter((a) => {
    if (statusFilter && statusFilter !== "all" && a.status !== statusFilter) return false;
    if (typeFilter && typeFilter !== "all" && a.type !== typeFilter) return false;
    return true;
  });

  // Bar: assets by type
  const typeGroups: Record<string, number> = {};
  assets.forEach((a) => {
    typeGroups[a.type] = (typeGroups[a.type] ?? 0) + 1;
  });
  const barData = Object.entries(typeGroups).map(([type, count]) => ({
    name: formatAssetType(type),
    count,
  }));

  // Donut: by status
  const statusColors: Record<string, string> = {
    IN_USE: "#3b82f6",
    IN_STOCK: "#22c55e",
    IN_REPAIR: "#f59e0b",
    SCRAPPED: "#9ca3af",
  };
  const donutData = Object.entries(summary?.byStatus ?? {}).map(([status, count]) => ({
    name: status.replace("_", " "),
    value: count as number,
    color: statusColors[status],
  }));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["IN_USE", "IN_STOCK", "IN_REPAIR", "SCRAPPED"].map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {["DESKTOP", "LAPTOP", "MONITOR", "SERVER", "PERIPHERAL", "OTHER"].map((t) => (
              <SelectItem key={t} value={t}>
                {formatAssetType(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard label="Total Assets" value={summary?.total ?? 0} color="purple" />
        <SummaryCard label="In Use" value={summary?.byStatus?.IN_USE ?? 0} color="blue" />
        <SummaryCard label="In Stock" value={summary?.byStatus?.IN_STOCK ?? 0} color="green" />
        <SummaryCard label="In Repair" value={summary?.byStatus?.IN_REPAIR ?? 0} color="amber" />
        <SummaryCard label="Scrapped" value={summary?.byStatus?.SCRAPPED ?? 0} color="red" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-4">Assets by Type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-sm mb-4">Assets by Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
              >
                {donutData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                formatter={(value) => (
                  <span className="text-xs text-foreground">{value}</span>
                )}
              />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">All Assets ({filtered.length})</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/api/reports/hardware/export")}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />Export CSV
          </Button>
        </div>
        <DataTable columns={hwCols} data={filtered} />
      </Card>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div className="page-shell space-y-5">
      <PageHero
        eyebrow="Financial & Assets Analysis"
        title="Reports & Analytics"
        description="Analyze subscription spend trends, hardware category statistics, and export lists for budgeting."
        icon={BarChart3}
      />

      <Tabs defaultValue="subscriptions" className="space-y-6">
        <TabsList className="w-fit">
          <TabsTrigger value="subscriptions" className="text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />Subscriptions
          </TabsTrigger>
          <TabsTrigger value="hardware" className="text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            <Monitor className="w-3.5 h-3.5 mr-1.5" />Hardware
          </TabsTrigger>
        </TabsList>
        <TabsContent value="subscriptions">
          <SubscriptionsTab />
        </TabsContent>
        <TabsContent value="hardware">
          <HardwareTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

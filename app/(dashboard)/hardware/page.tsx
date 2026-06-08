"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, MoreHorizontal, Eye, Pencil, Trash2, MonitorSpeaker, Sparkles } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchInput } from "@/components/shared/SearchInput";
import { PageHero } from "@/components/shared/PageHero";
import { AiImportModal } from "@/components/hardware/AiImportModal";
import { useHardware } from "@/lib/hooks/useHardware";
import { useDepartments } from "@/lib/hooks/useEmployees";
import { useStockLocations } from "@/lib/hooks/useVendors";
import { api, type Asset } from "@/lib/api";
import {
  formatDate,
  getStatusBadgeClass,
  getProcessorGradeBadge,
  formatAssetType,
  getDaysUntil,
  cn,
} from "@/lib/utils";
import type { PaginationState } from "@tanstack/react-table";

const STATUS_TABS = [
  { value: "ALL", label: "All Assets" },
  { value: "IN_USE", label: "In Use" },
  { value: "IN_STOCK", label: "In Stock" },
  { value: "IN_REPAIR", label: "In Repair" },
  { value: "SCRAPPED", label: "Scrapped" },
];

export default function HardwarePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState(searchParams.get("status") ?? "ALL");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") ?? "");
  const [departmentId, setDepartmentId] = useState(searchParams.get("departmentId") ?? "");
  const [locationId, setLocationId] = useState(searchParams.get("locationId") ?? "");
  const [processorGrade, setProcessorGrade] = useState(searchParams.get("processorGrade") ?? "");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: Number(searchParams.get("page") ?? 1) - 1,
    pageSize: 20,
  });

  const syncUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (tab !== "ALL") p.set("status", tab);
    if (search) p.set("search", search);
    if (typeFilter && typeFilter !== "all") p.set("type", typeFilter);
    if (departmentId && departmentId !== "all") p.set("departmentId", departmentId);
    if (locationId && locationId !== "all") p.set("locationId", locationId);
    if (processorGrade && processorGrade !== "all") p.set("processorGrade", processorGrade);
    if (pagination.pageIndex > 0) p.set("page", String(pagination.pageIndex + 1));
    const qs = p.toString();
    const newUrl = `${pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState(null, '', newUrl);
  }, [tab, search, typeFilter, departmentId, locationId, processorGrade, pagination.pageIndex, pathname]);

  useEffect(() => { syncUrl(); }, [syncUrl]);

  const [scrapAsset, setScrapAsset] = useState<Asset | null>(null);
  const [scrapReason, setScrapReason] = useState("");
  const [scrapDisposal, setScrapDisposal] = useState("");
  const [scrapping, setScrapping] = useState(false);

  const { departments } = useDepartments();
  const { locations } = useStockLocations();

  const params = new URLSearchParams({
    page: String(pagination.pageIndex + 1),
    limit: String(pagination.pageSize),
    ...(tab !== "ALL" && { status: tab }),
    ...(search && { search }),
    ...(typeFilter && typeFilter !== "all" && { type: typeFilter }),
    ...(departmentId && departmentId !== "all" && { departmentId }),
    ...(locationId && locationId !== "all" && { locationId }),
    ...(processorGrade && processorGrade !== "all" && { processorGrade }),
  }).toString();

  const { assets, total, totalPages, isLoading, mutate } = useHardware(params);

  const handleScrap = async () => {
    if (!scrapAsset) return;
    setScrapping(true);
    try {
      await api.createScrap({
        assetId: scrapAsset.id,
        reason: scrapReason || undefined,
        disposalMethod: scrapDisposal || undefined,
      });
      toast.success("Asset scrapped");
      mutate();
      setScrapAsset(null);
      setScrapReason("");
      setScrapDisposal("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setScrapping(false);
    }
  };

  const columns: ColumnDef<Asset>[] = [
    {
      accessorKey: "assetId",
      header: "Asset ID",
      cell: ({ getValue }) => (
        <span className="font-mono text-xs font-semibold text-foreground/80">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ getValue }) => (
        <Badge variant="secondary" className="text-xs font-semibold">
          {formatAssetType(getValue() as string)}
        </Badge>
      ),
    },
    {
      id: "brandModel",
      header: "Brand / Model",
      cell: ({ row }) => (
        <div className="text-sm">
          <span className="font-semibold text-foreground">{row.original.brand ?? "—"}</span>
          {row.original.model && (
            <span className="text-muted-foreground font-medium"> {row.original.model}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "serialNumber",
      header: "Serial Number",
      cell: ({ getValue }) =>
        getValue() ? (
          <span className="font-mono text-xs text-muted-foreground">{getValue() as string}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "osType",
      header: "OS",
      cell: ({ getValue }) => (
        <span className="text-sm font-medium">{(getValue() as string) || "—"}</span>
      ),
    },
    {
      id: "processor",
      header: "Processor",
      cell: ({ row }) => {
        const proc = row.original.processor;
        if (!proc) return <span className="text-muted-foreground">—</span>;
        const gradeBadge = getProcessorGradeBadge(proc.grade);
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">{proc.name}</span>
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0 font-bold", gradeBadge.class)}
            >
              {gradeBadge.label}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "ramGb",
      header: "RAM",
      cell: ({ getValue }) => {
        const v = getValue() as number | undefined;
        return v ? (
          <span className="text-sm font-medium">{v} GB</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "assignedTo",
      header: "Assigned To",
      cell: ({ row }) => {
        const name = row.original.assignments?.[0]?.employee?.name;
        return name ? (
          <span className="text-sm font-semibold text-foreground/90">{name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "department",
      header: "Department",
      cell: ({ row }) =>
        row.original.department?.name ?? (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return (
          <Badge
            variant="outline"
            className={cn("text-xs font-bold shadow-sm", getStatusBadgeClass(v))}
          >
            {v.replace(/_/g, " ").charAt(0) + v.replace(/_/g, " ").slice(1).toLowerCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: "warrantyExpiry",
      header: "Warranty",
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined;
        if (!v) return <span className="text-muted-foreground">—</span>;
        const days = getDaysUntil(v);
        const colorClass =
          days < 0
            ? "text-red-500 font-bold"
            : days < 60
            ? "text-amber-500 font-semibold"
            : "text-foreground/90 font-medium";
        return <span className={cn("text-sm", colorClass)}>{formatDate(v)}</span>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-muted">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl p-1 shadow-lg border-border/80">
            <DropdownMenuItem
              className="rounded-lg cursor-pointer py-1.5"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/hardware/${row.original.id}`);
              }}
            >
              <Eye className="w-4 h-4 mr-2 text-muted-foreground" />
              View Detail
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-lg cursor-pointer py-1.5"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/hardware/${row.original.id}/edit`);
              }}
            >
              <Pencil className="w-4 h-4 mr-2 text-muted-foreground" />
              Edit Asset
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-lg cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive py-1.5"
              onClick={(e) => {
                e.stopPropagation();
                setScrapAsset(row.original);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Scrap Asset
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="page-shell space-y-5">
      <PageHero
        eyebrow="Asset Registry"
        title="Hardware Assets"
        description="Track and manage your IT hardware assets, specifications, and employee assignments from one central database."
        icon={MonitorSpeaker}
      >
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setAiModalOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" />
            AI Import
          </Button>
          <Button onClick={() => router.push("/hardware/new")}>
            <Plus className="w-4 h-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </PageHero>

      <AiImportModal 
        open={aiModalOpen} 
        onOpenChange={setAiModalOpen} 
        onSuccess={() => { mutate(); setRefreshKey(k => k + 1); }}
      />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          setPagination((p) => ({ ...p, pageIndex: 0 }));
        }}
        className="w-full md:w-auto"
      >
        <TabsList className="w-full md:w-auto justify-start overflow-x-auto">
          {STATUS_TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="text-xs font-semibold rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filter panel */}
      <div className="filter-panel flex flex-wrap items-center gap-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
          placeholder="Search ID, brand, model..."
          className="w-64"
        />
        <Select
          value={typeFilter || "all"}
          onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-36 text-sm">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-lg border-border/80">
            <SelectItem value="all">All Types</SelectItem>
            {["DESKTOP", "LAPTOP", "MONITOR", "SERVER", "PERIPHERAL", "OTHER"].map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tab === "ALL" && (
          <Select
            value={tab !== "ALL" ? tab : "all"}
            onValueChange={(v) => setTab(v === "all" ? "ALL" : v)}
          >
            <SelectTrigger className="w-36 text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-lg border-border/80">
              <SelectItem value="all">All Statuses</SelectItem>
              {["IN_USE", "IN_STOCK", "IN_REPAIR", "SCRAPPED"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ").charAt(0) + s.replace(/_/g, " ").slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={departmentId || "all"}
          onValueChange={(v) => setDepartmentId(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-44 text-sm">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-lg border-border/80">
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={locationId || "all"}
          onValueChange={(v) => setLocationId(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-40 text-sm">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-lg border-border/80">
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={processorGrade || "all"}
          onValueChange={(v) => setProcessorGrade(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-40 text-sm">
            <SelectValue placeholder="All Grades" />
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-lg border-border/80">
            <SelectItem value="all">All Grades</SelectItem>
            <SelectItem value="LOW">Low Grade</SelectItem>
            <SelectItem value="MID">Mid Grade</SelectItem>
            <SelectItem value="HIGH">High Grade</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!isLoading && assets.length === 0 ? (
        <EmptyState
          icon={MonitorSpeaker}
          title="No assets found"
          description="We couldn't find any hardware assets matching your current search parameters."
          action={{ label: "Add Asset", onClick: () => router.push("/hardware/new") }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={assets}
          isLoading={isLoading}
          total={total}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageCount={totalPages}
          onRowClick={(row) => router.push(`/hardware/${row.id}`)}
        />
      )}

      {/* Scrap Dialog */}
      <Dialog
        open={!!scrapAsset}
        onOpenChange={(o) => {
          if (!o) {
            setScrapAsset(null);
            setScrapReason("");
            setScrapDisposal("");
          }
        }}
      >
        <DialogContent className="max-w-md rounded-lg border-border/85 bg-card">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight">Scrap Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This will mark{" "}
              <span className="font-mono font-bold text-foreground bg-muted/80 px-1.5 py-0.5 rounded border border-border/60 text-xs">
                {scrapAsset?.assetId}
              </span>{" "}
              as scrapped. This action is recorded in history and cannot be easily undone.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason for scrapping</Label>
              <Input
                value={scrapReason}
                onChange={(e) => setScrapReason(e.target.value)}
                placeholder="e.g. End of life, Hardware failure"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Disposal Method</Label>
              <Input
                value={scrapDisposal}
                onChange={(e) => setScrapDisposal(e.target.value)}
                placeholder="e.g. Recycled, Donated, Destroyed"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setScrapAsset(null);
                setScrapReason("");
                setScrapDisposal("");
              }}
              disabled={scrapping}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleScrap} disabled={scrapping} className="shadow-md hover:shadow-lg transition-all duration-200">
              {scrapping && (
                <span className="w-4 h-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full inline-block" />
              )}
              Scrap Asset
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

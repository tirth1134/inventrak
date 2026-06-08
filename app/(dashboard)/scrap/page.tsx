"use client";

import { useState } from "react";
import { Trash2, RotateCcw } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { type PaginationState } from "@tanstack/react-table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchInput } from "@/components/shared/SearchInput";
import { PageHero } from "@/components/shared/PageHero";
import { api, type ScrapRecord } from "@/lib/api";
import { formatDate, formatAssetType, getStatusBadgeClass, cn } from "@/lib/utils";
import useSWR from "swr";

const DISPOSAL_COLORS: Record<string, string> = {
  DONATED: "text-blue-600 border-blue-200 bg-blue-50",
  RECYCLED: "text-green-600 border-green-200 bg-green-50",
  SOLD: "text-purple-600 border-purple-200 bg-purple-50",
  DESTROYED: "text-red-600 border-red-200 bg-red-50",
  RETURNED: "text-yellow-600 border-yellow-200 bg-yellow-50",
};

export default function ScrapPage() {
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const params = new URLSearchParams({
    page: String(pagination.pageIndex + 1),
    limit: String(pagination.pageSize),
    ...(search && { search }),
  }).toString();

  const { data, isLoading, mutate } = useSWR(`/scrap?${params}`, () => api.getScraps(params));
  const scraps = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const handleRestore = async () => {
    if (!restoreId) return;
    setRestoring(true);
    try {
      await api.undoScrap(restoreId);
      toast.success("Asset restored successfully");
      mutate();
      setRestoreId(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRestoring(false);
    }
  };

  const columns: ColumnDef<ScrapRecord>[] = [
    {
      accessorKey: "asset.assetId",
      header: "Asset ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">
          {row.original.asset?.assetId ?? "—"}
        </span>
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.original.asset?.type;
        return type ? (
          <Badge variant="secondary" className="text-xs">{formatAssetType(type)}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "brand_model",
      header: "Brand / Model",
      cell: ({ row }) => {
        const { brand, model } = row.original.asset ?? {};
        if (!brand && !model) return <span className="text-muted-foreground">—</span>;
        return (
          <div>
            <p className="font-medium text-sm">{brand ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{model ?? "—"}</p>
          </div>
        );
      },
    },
    {
      id: "serialNumber",
      header: "Serial Number",
      cell: ({ row }) => (
        <span className="text-sm font-mono">{row.original.asset?.serialNumber ?? "—"}</span>
      ),
    },
    {
      accessorKey: "scrappedAt",
      header: "Scrapped Date",
      cell: ({ getValue }) => (
        <span className="text-sm">{formatDate(getValue() as string)}</span>
      ),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        if (!v) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-sm max-w-[180px] truncate block" title={v}>
            {v}
          </span>
        );
      },
    },
    {
      accessorKey: "disposalMethod",
      header: "Disposal Method",
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        if (!v) return <span className="text-muted-foreground">—</span>;
        return (
          <Badge
            variant="outline"
            className={cn("text-xs", DISPOSAL_COLORS[v] ?? "text-gray-600 border-gray-200 bg-gray-50")}
          >
            {v.charAt(0) + v.slice(1).toLowerCase()}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setRestoreId(row.original.id)}
        >
          <RotateCcw className="w-3 h-3" />
          Restore
        </Button>
      ),
    },
  ];

  return (
    <div className="page-shell space-y-5">
      <PageHero
        eyebrow="Asset Management"
        title="Scrap Repository"
        description="View and restore retired or scrapped assets that are no longer in active operation."
        icon={Trash2}
      />

      <div className="filter-panel flex flex-wrap items-center gap-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
          placeholder="Search by asset ID, brand, model..."
          className="w-72"
        />
        {total > 0 && (
          <span className="text-sm text-muted-foreground px-2">
            {total} scrapped asset{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {!isLoading && scraps.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="No scrapped assets"
          description="Scrapped assets will appear here. You can scrap assets from the hardware detail page."
        />
      ) : (
        <DataTable
          columns={columns}
          data={scraps}
          isLoading={isLoading}
          total={total}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageCount={totalPages}
        />
      )}

      <ConfirmDialog
        open={!!restoreId}
        onOpenChange={(o) => !o && setRestoreId(null)}
        title="Restore Asset"
        description="This will restore the asset to IN_STOCK status and remove the scrap record. Are you sure?"
        confirmLabel="Restore"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={handleRestore}
        loading={restoring}
      />
    </div>
  );
}

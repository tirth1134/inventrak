"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, MoreHorizontal, Eye, Pencil, Trash2, Store } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchInput } from "@/components/shared/SearchInput";
import { PageHero } from "@/components/shared/PageHero";
import { VendorForm } from "@/components/vendors/VendorForm";
import { useVendors } from "@/lib/hooks/useVendors";
import { api, type Vendor } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PaginationState } from "@tanstack/react-table";

const TYPE_BADGE: Record<string, string> = {
  HARDWARE: "text-blue-600 border-blue-200 bg-blue-50",
  SOFTWARE: "text-purple-600 border-purple-200 bg-purple-50",
  BOTH: "text-green-600 border-green-200 bg-green-50",
};

export default function VendorsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: Number(searchParams.get("page") ?? 1) - 1,
    pageSize: 20,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const syncUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (pagination.pageIndex > 0) p.set("page", String(pagination.pageIndex + 1));
    const qs = p.toString();
    const newUrl = `${pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }, [search, pagination.pageIndex, pathname]);

  useEffect(() => { syncUrl(); }, [syncUrl]);

  const params = new URLSearchParams({
    page: String(pagination.pageIndex + 1),
    limit: String(pagination.pageSize),
    ...(search && { search }),
  }).toString();

  const { vendors, total, totalPages, isLoading, mutate } = useVendors(params);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteVendor(deleteId);
      toast.success("Vendor deleted");
      mutate();
      setDeleteId(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const openAdd = () => {
    setEditVendor(null);
    setFormOpen(true);
  };

  const openEdit = (vendor: Vendor) => {
    setEditVendor(vendor);
    setFormOpen(true);
  };

  const columns: ColumnDef<Vendor>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ getValue }) => (
        <span className="font-medium text-foreground">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "contactPerson",
      header: "Contact Person",
      cell: ({ getValue }) => (
        <span className="text-sm">{(getValue() as string) || "—"}</span>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ getValue }) => (
        <span className="text-sm">{(getValue() as string) || "—"}</span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{(getValue() as string) || "—"}</span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return (
          <Badge variant="outline" className={cn("text-xs", TYPE_BADGE[v] ?? "")}>
            {v.charAt(0) + v.slice(1).toLowerCase()}
          </Badge>
        );
      },
    },
    {
      id: "assets",
      header: "Assets",
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs">
          {row.original._count?.assets ?? 0}
        </Badge>
      ),
    },
    {
      id: "invoices",
      header: "Invoices",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {row.original._count?.hardwareInvoices ?? 0}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="w-7 h-7">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/vendors/${row.original.id}`);
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                openEdit(row.original);
              }}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteId(row.original.id);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="page-shell space-y-5">
      <PageHero
        eyebrow="Vendor Network"
        title="Vendors"
        description="Keep supplier contacts, hardware links, software partners, and invoice relationships organized."
        icon={Store}
      >
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </PageHero>

      <div className="surface-panel flex flex-wrap items-center gap-5 rounded-2xl p-5 md:p-6 shadow-sm">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
          placeholder="Search vendors..."
          className="w-64"
        />
      </div>

      {!isLoading && vendors.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No vendors found"
          description="Add vendors to track hardware purchases and software subscriptions."
          action={{ label: "Add Vendor", onClick: openAdd }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={vendors}
          isLoading={isLoading}
          total={total}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageCount={totalPages}
          onRowClick={(row) => router.push(`/vendors/${row.id}`)}
        />
      )}

      {/* Add/Edit Vendor Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) {
            setFormOpen(false);
            setEditVendor(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
          </DialogHeader>
          <VendorForm
            vendor={editVendor ?? undefined}
            onSuccess={() => {
              mutate();
              setFormOpen(false);
              setEditVendor(null);
            }}
            onCancel={() => {
              setFormOpen(false);
              setEditVendor(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Vendor"
        description="Delete this vendor? Associated assets will not be deleted but will lose the vendor link."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}

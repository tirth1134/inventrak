"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Plus, MoreHorizontal, Eye, Pencil, Trash2, Users, Check } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchInput } from "@/components/shared/SearchInput";
import { PageHero } from "@/components/shared/PageHero";
import { useEmployees, useDepartments } from "@/lib/hooks/useEmployees";
import { api, type Employee } from "@/lib/api";
import { getStatusBadgeClass, generateInitials, cn } from "@/lib/utils";
import type { PaginationState } from "@tanstack/react-table";

export default function EmployeesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "");
  const [departmentId, setDepartmentId] = useState(searchParams.get("departmentId") ?? "");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: Number(searchParams.get("page") ?? 1) - 1,
    pageSize: 20,
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { departments } = useDepartments();

  const syncUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (statusFilter && statusFilter !== "all") p.set("status", statusFilter);
    if (departmentId && departmentId !== "all") p.set("departmentId", departmentId);
    if (pagination.pageIndex > 0) p.set("page", String(pagination.pageIndex + 1));
    const qs = p.toString();
    const newUrl = `${pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  }, [search, statusFilter, departmentId, pagination.pageIndex, pathname]);

  useEffect(() => { syncUrl(); }, [syncUrl]);

  const params = new URLSearchParams({
    page: String(pagination.pageIndex + 1),
    limit: String(pagination.pageSize),
    ...(search && { search }),
    ...(statusFilter && statusFilter !== "all" && { status: statusFilter }),
    ...(departmentId && departmentId !== "all" && { departmentId }),
  }).toString();

  const { employees, total, totalPages, isLoading, mutate } = useEmployees(params);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteEmployee(deleteId);
      toast.success("Employee permanently deleted");
      mutate();
      setDeleteId(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<Employee>[] = [
    {
      id: "avatar",
      header: "",
      cell: ({ row }) => (
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {generateInitials(row.original.name)}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ getValue }) => (
        <span className="font-medium text-foreground">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{getValue() as string}</span>
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
      id: "department",
      header: "Department",
      cell: ({ row }) =>
        row.original.department ? (
          <Badge variant="secondary" className="text-xs">
            {row.original.department.name}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "designation",
      header: "Designation",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.designation?.title ?? "—"}</span>
      ),
    },
    {
      id: "systemType",
      header: "System Type",
      cell: ({ row }) => {
        const assigned = row.original.assetAssignments?.find((a) => a.isCurrent);
        const type = assigned?.asset?.type;
        return (
          <span className="text-sm font-medium">
            {type ? type.charAt(0) + type.slice(1).toLowerCase() : "—"}
          </span>
        );
      },
    },
    {
      id: "processor",
      header: "Processor",
      cell: ({ row }) => {
        const assigned = row.original.assetAssignments?.find((a) => a.isCurrent);
        const processorName = assigned?.asset?.processor?.name;
        return (
          <span className="text-sm text-muted-foreground">
            {processorName || "—"}
          </span>
        );
      },
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
                router.push(`/employees/${row.original.id}`);
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/employees/${row.original.id}/edit`);
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
        eyebrow="People Directory"
        title="Employees"
        description="Manage teams, departments, designations, asset ownership, and subscription access with a clean people-first view."
        icon={Users}
      >
        <Button onClick={() => router.push("/employees/new")}>
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </PageHero>

      <div className="surface-panel flex flex-wrap items-center gap-5 rounded-2xl p-5 md:p-6 shadow-sm">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
          placeholder="Search employees..."
          className="w-64"
        />
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => {
            setStatusFilter(v === "all" ? "" : v);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={departmentId || "all"}
          onValueChange={(v) => {
            setDepartmentId(v === "all" ? "" : v);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isLoading && employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No employees found"
          description="Add your first employee to start managing asset assignments."
          action={{ label: "Add Employee", onClick: () => router.push("/employees/new") }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={employees}
          isLoading={isLoading}
          total={total}
          pagination={pagination}
          onPaginationChange={setPagination}
          pageCount={totalPages}
          onRowClick={(row) => router.push(`/employees/${row.id}`)}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
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

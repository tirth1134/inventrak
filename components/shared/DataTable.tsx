"use client";

import {
  flexRender, getCoreRowModel, useReactTable,
  type ColumnDef, type PaginationState, type RowSelectionState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  isLoading?: boolean;
  total?: number;
  pagination?: PaginationState;
  onPaginationChange?: (p: PaginationState) => void;
  pageCount?: number;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  getRowId?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData>({
  columns, data, isLoading, total = 0, pagination, onPaginationChange,
  pageCount = 1, rowSelection, onRowSelectionChange, getRowId, onRowClick,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data, columns, pageCount,
    state: { pagination, rowSelection: rowSelection ?? {} },
    enableRowSelection: !!onRowSelectionChange,
    onRowSelectionChange: onRowSelectionChange
      ? (updater) => onRowSelectionChange(typeof updater === "function" ? updater(rowSelection ?? {}) : updater)
      : undefined,
    onPaginationChange: onPaginationChange
      ? (updater) => onPaginationChange(typeof updater === "function" ? updater(pagination!) : updater)
      : undefined,
    manualPagination: !!pagination,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  });

  return (
    <div className="space-y-4">
      <div className="overflow-hidden border border-border/40 bg-card rounded-xl shadow-sm glass-panel">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-b border-border/40 bg-muted/20 hover:bg-muted/20">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="h-10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-3 px-4">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-b border-border/20">
                  {columns.map((_, ci) => (
                    <TableCell key={ci} className="py-4 px-4"><Skeleton className="h-4 w-full rounded-md" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28 text-center text-muted-foreground text-sm font-medium">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row, index) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.3), type: "spring", stiffness: 120, damping: 15 }}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    "border-b border-border/40 hover:bg-muted/40 transition-colors duration-150",
                    onRowClick && "cursor-pointer",
                    row.getIsSelected() && "bg-muted/50"
                  )}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 px-4 text-sm align-middle text-foreground/90 font-medium">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && onPaginationChange && (
        <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-1">
          <span>
            Showing <span className="text-foreground">{total === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1}</span>–
            <span className="text-foreground">{Math.min((pagination.pageIndex + 1) * pagination.pageSize, total)}</span> of <span className="text-foreground">{total}</span> assets
          </span>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-lg border-border/60 hover:bg-muted/50 transition-colors duration-200"
              onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex - 1 })}
              disabled={pagination.pageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs font-bold text-foreground">
              {pagination.pageIndex + 1} <span className="text-muted-foreground font-medium">/</span> {pageCount}
            </span>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 rounded-lg border-border/60 hover:bg-muted/50 transition-colors duration-200"
              onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex + 1 })}
              disabled={pagination.pageIndex >= pageCount - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Plus, Package, Pencil, Trash2, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHero } from "@/components/shared/PageHero";
import { useStockLocations } from "@/lib/hooks/useStockLocations";
import { api, type StockLocation } from "@/lib/api";
import { cn } from "@/lib/utils";

const locationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
type LocationFormValues = z.infer<typeof locationSchema>;

function LocationFormDialog({
  open,
  onOpenChange,
  initial,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: StockLocation | null;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: initial?.name ?? "", description: initial?.description ?? "" },
  });

  const onSubmit = async (values: LocationFormValues) => {
    try {
      if (initial) {
        await api.updateStockLocation(initial.id, values);
        toast.success("Location updated");
      } else {
        await api.createStockLocation(values);
        toast.success("Location created");
      }
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset({ name: initial?.name ?? "", description: initial?.description ?? "" });
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Location" : "Add Location"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="loc-name">Name</Label>
            <Input id="loc-name" placeholder="e.g. Server Room A" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc-desc">Description</Label>
            <Input
              id="loc-desc"
              placeholder="Optional description"
              {...register("description")}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : initial ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function StockPage() {
  const { locations, isLoading, mutate } = useStockLocations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<StockLocation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.deleteStockLocation(deleteId);
      toast.success("Location deleted");
      mutate();
      setDeleteId(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const totalInStock = locations.reduce(
    (sum, loc) => sum + (loc.assetCounts?.IN_STOCK ?? 0),
    0
  );
  const lowStockItems = locations.filter(
    (loc) => (loc.assetCounts?.IN_STOCK ?? 0) === 0 && (loc.assetCounts?.total ?? 0) > 0
  ).length;

  return (
    <div className="page-shell space-y-5">
      <PageHero
        eyebrow="Storage Control"
        title="Stock Locations"
        description="Manage warehouses, IT closets, and physical storage locations where hardware inventory is stored."
        icon={Package}
      >
        <Button onClick={() => { setEditLocation(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />Add Location
        </Button>
      </PageHero>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
        {[
          { label: "Total Locations", value: locations.length, color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
          { label: "Total In Stock", value: totalInStock, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
          { label: "Low / Empty Stock", value: lowStockItems, color: lowStockItems > 0 ? "text-rose-600 bg-rose-500/10 border-rose-500/20" : "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
          {
            label: "Total Assets",
            value: locations.reduce((s, l) => s + (l.assetCounts?.total ?? 0), 0),
            color: "text-purple-600 bg-purple-500/10 border-purple-500/20",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl surface-panel p-6 hover-lift">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
            <p className={cn("text-3xl font-extrabold tracking-tight mt-3", color.split(" ")[0])}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : locations.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No stock locations"
          description="Add your first location to start tracking inventory."
          action={{
            label: "Add Location",
            onClick: () => { setEditLocation(null); setDialogOpen(true); },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((loc) => {
            const counts = loc.assetCounts;
            return (
              <div key={loc.id} className="surface-panel rounded-2xl p-6 flex flex-col gap-5 hover-lift">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{loc.name}</h3>
                    {loc.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {loc.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7"
                      onClick={() => { setEditLocation(loc); setDialogOpen(true); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(loc.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "In Stock", value: counts?.IN_STOCK ?? 0, color: "text-green-600" },
                    { label: "In Use", value: counts?.IN_USE ?? 0, color: "text-blue-600" },
                    { label: "In Repair", value: counts?.IN_REPAIR ?? 0, color: "text-yellow-600" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-muted/50 rounded-lg p-2">
                      <p className={cn("text-lg font-bold", color)}>{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/hardware?locationId=${loc.id}`}
                  className="flex items-center gap-1 text-xs text-primary hover:underline mt-auto"
                >
                  View Assets <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <LocationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editLocation}
        onSuccess={mutate}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete Location"
        description="This will permanently delete the location. Assets assigned to it will have their location cleared."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}

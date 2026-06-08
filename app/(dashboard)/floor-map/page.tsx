"use client";

import { useState, useMemo } from "react";
import { Plus, Save, Map, X, Pencil, Grid2X2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageLoader } from "@/components/shared/PageLoader";
import { PageHero } from "@/components/shared/PageHero";
import { useFloorMaps, useFloorMap } from "@/lib/hooks/useFloorMaps";
import { useDepartments, useEmployees } from "@/lib/hooks/useEmployees";
import { useStockLocations } from "@/lib/hooks/useStockLocations";
import { api, type Employee, type Asset } from "@/lib/api";
import { generateInitials, cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface DeskState {
  id?: string;
  gridX: number;
  gridY: number;
  label?: string;
  employeeId?: string;
  employee?: Employee;
  assetId?: string;
  asset?: Asset;
  locationId?: string;
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const floorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gridCols: z.coerce.number().int().min(5).max(50).default(20),
  gridRows: z.coerce.number().int().min(5).max(50).default(15),
});
type FloorFormValues = z.infer<typeof floorSchema>;

const deskSchema = z.object({
  label: z.string().optional(),
  employeeId: z.string().optional(),
  assetId: z.string().optional(),
  locationId: z.string().optional(),
});
type DeskFormValues = z.infer<typeof deskSchema>;

// ── Dept color mapping ────────────────────────────────────────────────────────

const DEPT_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-red-500",
];

// ── Cell component ────────────────────────────────────────────────────────────

function DeskCell({
  desk,
  editMode,
  deptColorMap,
  onEmpty,
  onSelect,
}: {
  desk: DeskState | undefined;
  editMode: boolean;
  deptColorMap: Record<string, string>;
  onEmpty: () => void;
  onSelect: (d: DeskState) => void;
}) {
  if (!desk) {
    if (!editMode) {
      return (
        <div className="w-full h-full border border-dashed border-border/50 rounded bg-muted/10" />
      );
    }
    return (
      <button
        className="w-full h-full border-2 border-dashed border-border/40 rounded bg-muted/5 hover:bg-muted/20 hover:border-primary/40 transition-colors"
        onClick={onEmpty}
        title="Add desk"
      />
    );
  }

  const emp = desk.employee;
  const deptId = emp?.departmentId;
  const color = deptId ? (deptColorMap[deptId] ?? DEPT_COLORS[0]) : "bg-gray-400";
  const initials = emp ? generateInitials(emp.name) : desk.label?.[0]?.toUpperCase() ?? "?";

  return (
    <button
      className={cn(
        "w-full h-full rounded flex items-center justify-center relative group transition-transform",
        color,
        "hover:scale-105 hover:z-10"
      )}
      title={[emp?.name, desk.asset?.brand, desk.label].filter(Boolean).join(" · ")}
      onClick={() => onSelect(desk)}
    >
      <span className="text-white text-xs font-bold">{initials}</span>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FloorMapPage() {
  const { floorMaps, isLoading: mapsLoading, mutate: mutateMaps } = useFloorMaps();
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addFloorOpen, setAddFloorOpen] = useState(false);

  // Pending desk changes (in edit mode)
  const [desks, setDesks] = useState<DeskState[]>([]);

  // Panel state for selected desk
  const [selectedDesk, setSelectedDesk] = useState<DeskState | null>(null);

  // Popover state for empty cell click
  const [popoverCell, setPopoverCell] = useState<{ x: number; y: number } | null>(null);

  const effectiveMapId = selectedMapId ?? floorMaps[0]?.id ?? null;
  const { floorMap, isLoading: mapLoading, mutate: mutateMap } = useFloorMap(effectiveMapId);

  // Load desks from server when floor changes
  useMemo(() => {
    if (floorMap?.desks) {
      setDesks(floorMap.desks.map((d) => ({
        id: d.id,
        gridX: d.gridX,
        gridY: d.gridY,
        label: d.label ?? undefined,
        employeeId: d.employeeId ?? undefined,
        employee: d.employee as Employee | undefined,
        assetId: d.assetId ?? undefined,
        asset: d.asset as unknown as Asset | undefined,
        locationId: d.locationId ?? undefined,
      })));
    } else {
      setDesks([]);
    }
  }, [floorMap?.id, floorMap?.desks]);

  const { departments } = useDepartments();
  const { employees } = useEmployees("limit=200");
  const { locations } = useStockLocations();

  const deptColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    departments.forEach((d, i) => {
      map[d.id] = DEPT_COLORS[i % DEPT_COLORS.length];
    });
    return map;
  }, [departments]);

  // ── Add floor form ─────────────────────────────────────────────────────────

  const {
    register: regFloor,
    handleSubmit: handleFloorSubmit,
    reset: resetFloor,
    formState: { errors: floorErrors, isSubmitting: floorSubmitting },
  } = useForm<FloorFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(floorSchema) as any,
    defaultValues: { name: "", gridCols: 20, gridRows: 15 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onAddFloor = async (values: any) => {
    try {
      const res = await api.createFloorMap(values);
      toast.success("Floor map created");
      await mutateMaps();
      setSelectedMapId((res as { data: { id: string } }).data.id);
      setAddFloorOpen(false);
      resetFloor();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // ── Desk popover form ───────────────────────────────────────────────────────

  const {
    register: regDesk,
    handleSubmit: handleDeskSubmit,
    reset: resetDesk,
    setValue: setDeskValue,
    formState: { isSubmitting: deskSubmitting },
  } = useForm<DeskFormValues>({ resolver: zodResolver(deskSchema) });

  const onAddDesk = (values: DeskFormValues) => {
    if (!popoverCell) return;
    const emp = values.employeeId
      ? employees.find((e) => e.id === values.employeeId)
      : undefined;
    setDesks((prev) => {
      const filtered = prev.filter(
        (d) => !(d.gridX === popoverCell.x && d.gridY === popoverCell.y)
      );
      return [
        ...filtered,
        {
          gridX: popoverCell.x,
          gridY: popoverCell.y,
          label: values.label || undefined,
          employeeId: values.employeeId || undefined,
          employee: emp,
          assetId: values.assetId || undefined,
          locationId: values.locationId || undefined,
        },
      ];
    });
    setPopoverCell(null);
    resetDesk();
  };

  const removeDesk = (x: number, y: number) => {
    setDesks((prev) => prev.filter((d) => !(d.gridX === x && d.gridY === y)));
    if (selectedDesk?.gridX === x && selectedDesk?.gridY === y) setSelectedDesk(null);
  };

  // ── Save layout ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!effectiveMapId) return;
    setSaving(true);
    try {
      await api.saveDesks(effectiveMapId, {
        desks: desks.map((d) => ({
          ...(d.id ? { id: d.id } : {}),
          gridX: d.gridX,
          gridY: d.gridY,
          label: d.label,
          employeeId: d.employeeId ?? null,
          assetId: d.assetId ?? null,
          locationId: d.locationId ?? null,
        })),
      });
      toast.success("Layout saved");
      mutateMap();
      setEditMode(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // ── Grid size control ────────────────────────────────────────────────────────

  const cols = floorMap?.gridCols ?? 20;
  const rows = floorMap?.gridRows ?? 15;

  const deskMap = useMemo(() => {
    const map: Record<string, DeskState> = {};
    desks.forEach((d) => { map[`${d.gridX},${d.gridY}`] = d; });
    return map;
  }, [desks]);

  if (mapsLoading) return <PageLoader />;

  return (
    <div className="page-shell space-y-5">
      <PageHero
        eyebrow="Visual Infrastructure"
        title="Floor Map"
        description="Visual desk map editor to map hardware assets and employee seating arrangements across your physical office floors."
        icon={Map}
      >
        <div className="flex items-center gap-2">
          {floorMaps.length > 0 && (
            <>
              <Button
                variant={editMode ? "default" : "outline"}
                className="shadow-sm transition-all"
                onClick={() => {
                  setEditMode((m) => !m);
                  setSelectedDesk(null);
                  setPopoverCell(null);
                }}
              >
                <Pencil className="w-4 h-4 mr-1.5" />
                {editMode ? "Editing Layout" : "Edit Seating"}
              </Button>
              {editMode && (
                <Button className="shadow-md bg-emerald-600 hover:bg-emerald-700 text-white transition-all" onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-1.5" />
                  {saving ? "Saving..." : "Save Layout"}
                </Button>
              )}
            </>
          )}
          <Button variant="outline" className="shadow-sm border border-border/60 hover:bg-secondary transition-all" onClick={() => setAddFloorOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />New Floor
          </Button>
        </div>
      </PageHero>

      {/* Floor selector */}
      {floorMaps.length > 0 && (
        <div className="flex items-center gap-3">
          <Label className="text-sm text-muted-foreground shrink-0">Floor:</Label>
          <Select
            value={effectiveMapId ?? ""}
            onValueChange={(v) => {
              setSelectedMapId(v);
              setEditMode(false);
              setSelectedDesk(null);
            }}
          >
            <SelectTrigger className="w-56 h-9 text-sm">
              <SelectValue placeholder="Select floor" />
            </SelectTrigger>
            <SelectContent>
              {floorMaps.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name} ({f.gridCols}×{f.gridRows})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {floorMap && (
            <span className="text-xs text-muted-foreground">
              {desks.length} desks
            </span>
          )}
        </div>
      )}

      {floorMaps.length === 0 ? (
        <EmptyState
          icon={Map}
          title="No floor maps yet"
          description="Create your first floor map to start placing desks."
          action={{ label: "New Floor", onClick: () => setAddFloorOpen(true) }}
        />
      ) : mapLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <div className="flex gap-8">
          {/* Grid */}
          <div className="flex-1 min-w-0 overflow-auto">
            <div
              className="border border-border rounded-lg p-3 bg-muted/5"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, 36px)`,
                gap: "3px",
              }}
            >
              {Array.from({ length: rows }).flatMap((_, y) =>
                Array.from({ length: cols }).map((_, x) => {
                  const key = `${x},${y}`;
                  const desk = deskMap[key];
                  const isPopoverOpen =
                    popoverCell?.x === x && popoverCell?.y === y;

                  if (editMode && !desk) {
                    return (
                      <Popover
                        key={key}
                        open={isPopoverOpen}
                        onOpenChange={(o) => {
                          if (!o) setPopoverCell(null);
                        }}
                      >
                        <PopoverTrigger asChild>
                          <button
                            className="w-full h-full border-2 border-dashed border-border/40 rounded bg-muted/5 hover:bg-muted/20 hover:border-primary/40 transition-colors"
                            onClick={() => {
                              setPopoverCell({ x, y });
                              resetDesk();
                            }}
                          />
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" side="right">
                          <form
                            onSubmit={handleDeskSubmit(onAddDesk)}
                            className="space-y-3"
                          >
                            <p className="text-xs font-semibold text-foreground">
                              Add Desk ({x}, {y})
                            </p>
                            <div className="space-y-1">
                              <Label className="text-xs">Label</Label>
                              <Input
                                {...regDesk("label")}
                                placeholder="e.g. Desk A3"
                                className="h-7 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Employee</Label>
                              <Select
                                onValueChange={(v) =>
                                  setDeskValue("employeeId", v === "none" ? "" : v)
                                }
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {employees.map((e) => (
                                    <SelectItem key={e.id} value={e.id}>
                                      {e.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Location</Label>
                              <Select
                                onValueChange={(v) =>
                                  setDeskValue("locationId", v === "none" ? "" : v)
                                }
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {locations.map((l) => (
                                    <SelectItem key={l.id} value={l.id}>
                                      {l.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="submit"
                                size="sm"
                                className="flex-1 h-7 text-xs"
                                disabled={deskSubmitting}
                              >
                                Add
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setPopoverCell(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </PopoverContent>
                      </Popover>
                    );
                  }

                  return (
                    <div key={key} className="relative group">
                      <DeskCell
                        desk={desk}
                        editMode={editMode}
                        deptColorMap={deptColorMap}
                        onEmpty={() => {
                          setPopoverCell({ x, y });
                          resetDesk();
                        }}
                        onSelect={(d) => {
                          setSelectedDesk(d);
                          setPopoverCell(null);
                        }}
                      />
                      {editMode && desk && (
                        <button
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          onClick={() => removeDesk(x, y)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Legend */}
            {departments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {departments.map((d) => (
                  <div key={d.id} className="flex items-center gap-1.5">
                    <div className={cn("w-3 h-3 rounded-sm", deptColorMap[d.id] ?? "bg-gray-400")} />
                    <span className="text-xs text-muted-foreground">{d.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Side panel */}
          {selectedDesk && (
            <Card className="w-72 shrink-0 p-4 h-fit">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-foreground">Desk Details</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6"
                  onClick={() => setSelectedDesk(null)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Separator className="mb-3" />
              <div className="space-y-3">
                {selectedDesk.label && (
                  <div>
                    <p className="text-xs text-muted-foreground">Label</p>
                    <p className="text-sm font-medium">{selectedDesk.label}</p>
                  </div>
                )}
                {selectedDesk.employee && (
                  <div>
                    <p className="text-xs text-muted-foreground">Employee</p>
                    <p className="text-sm font-medium">{selectedDesk.employee.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedDesk.employee.email}
                    </p>
                    {selectedDesk.employee.department && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {selectedDesk.employee.department.name}
                      </Badge>
                    )}
                  </div>
                )}
                {selectedDesk.asset && (
                  <div>
                    <p className="text-xs text-muted-foreground">Asset</p>
                    <p className="text-sm font-medium font-mono">
                      {selectedDesk.asset.assetId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[selectedDesk.asset.brand, selectedDesk.asset.model]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Position: ({selectedDesk.gridX}, {selectedDesk.gridY})
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Add Floor Dialog */}
      <Dialog
        open={addFloorOpen}
        onOpenChange={(o) => {
          if (!o) resetFloor();
          setAddFloorOpen(o);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Floor Map</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFloorSubmit(onAddFloor)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. Ground Floor" {...regFloor("name")} />
              {floorErrors.name && (
                <p className="text-xs text-destructive">{floorErrors.name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Grid2X2 className="w-3.5 h-3.5" /> Columns
                </Label>
                <Input
                  type="number"
                  min={5}
                  max={50}
                  {...regFloor("gridCols")}
                />
                {floorErrors.gridCols && (
                  <p className="text-xs text-destructive">{floorErrors.gridCols.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Rows</Label>
                <Input
                  type="number"
                  min={5}
                  max={50}
                  {...regFloor("gridRows")}
                />
                {floorErrors.gridRows && (
                  <p className="text-xs text-destructive">{floorErrors.gridRows.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddFloorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={floorSubmitting}>
                {floorSubmitting ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

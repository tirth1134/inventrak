"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { api, type Accessory } from "@/lib/api";
import { formatDate, getStatusBadgeClass, cn } from "@/lib/utils";

interface AccessoriesPanelProps {
  assetId: string;
  accessories: Accessory[];
  onMutate: () => void;
}

const emptyForm = { name: "", brand: "", serialNumber: "", warrantyExpiry: "", purchaseDate: "", status: "IN_USE" };

export function AccessoriesPanel({ assetId, accessories, onMutate }: AccessoriesPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editAcc, setEditAcc] = useState<Accessory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setForm(emptyForm); setEditAcc(null); setFormOpen(true); };
  const openEdit = (acc: Accessory) => {
    setEditAcc(acc);
    setForm({
      name: acc.name,
      brand: acc.brand ?? "",
      serialNumber: acc.serialNumber ?? "",
      warrantyExpiry: acc.warrantyExpiry ? acc.warrantyExpiry.split("T")[0] : "",
      purchaseDate: acc.purchaseDate ? acc.purchaseDate.split("T")[0] : "",
      status: acc.status,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        brand: form.brand || undefined,
        serialNumber: form.serialNumber || undefined,
        warrantyExpiry: form.warrantyExpiry || undefined,
        purchaseDate: form.purchaseDate || undefined,
        status: form.status,
      };
      if (editAcc) {
        await api.updateAccessory(assetId, editAcc.id, payload);
        toast.success("Accessory updated");
      } else {
        await api.addAccessory(assetId, payload);
        toast.success("Accessory added");
      }
      onMutate();
      setFormOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteAccessory(assetId, deleteId);
      toast.success("Accessory removed");
      onMutate();
      setDeleteId(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" />Add Accessory
        </Button>
      </div>

      {accessories.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accessories linked to this asset.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                {["Name", "Brand", "Serial Number", "Warranty", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accessories.map((acc) => (
                <tr key={acc.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">{acc.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{acc.brand || "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{acc.serialNumber || "—"}</td>
                  <td className="px-4 py-2.5">{formatDate(acc.warrantyExpiry)}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className={cn("text-xs", getStatusBadgeClass(acc.status))}>
                      {acc.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(acc)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => setDeleteId(acc.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editAcc ? "Edit Accessory" : "Add Accessory"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mouse, Keyboard" />
            </div>
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Logitech" />
            </div>
            <div className="space-y-1.5">
              <Label>Serial Number</Label>
              <Input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Purchase Date</Label>
              <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Warranty Expiry</Label>
              <Input type="date" value={form.warrantyExpiry} onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_USE">In Use</SelectItem>
                  <SelectItem value="IN_STOCK">In Stock</SelectItem>
                  <SelectItem value="IN_REPAIR">In Repair</SelectItem>
                  <SelectItem value="SCRAPPED">Scrapped</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{editAcc ? "Update" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove Accessory"
        description="Remove this accessory from the asset?"
        confirmLabel="Remove"
        onConfirm={handleDelete}
      />
    </div>
  );
}

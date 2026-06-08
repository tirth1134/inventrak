"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { type MaintenanceLog } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";

interface MaintenanceLogPanelProps {
  assetId: string;
  logs: MaintenanceLog[];
  onMutate: () => void;
}

const emptyForm = { serviceDate: new Date().toISOString().split("T")[0], description: "", cost: "", vendor: "" };

export function MaintenanceLogPanel({ assetId, logs, onMutate }: MaintenanceLogPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.description.trim() || !form.serviceDate) {
      toast.error("Service date and description are required");
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/hardware/${assetId}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceDate: new Date(form.serviceDate).toISOString(),
          description: form.description,
          cost: form.cost ? parseFloat(form.cost) : undefined,
          vendor: form.vendor || undefined,
        }),
      });
      toast.success("Maintenance entry added");
      onMutate();
      setFormOpen(false);
      setForm(emptyForm);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />Add Entry
        </Button>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No maintenance records yet.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                {["Date", "Description", "Cost", "Vendor/Technician"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 shrink-0">{formatDate(log.serviceDate)}</td>
                  <td className="px-4 py-2.5">{log.description}</td>
                  <td className="px-4 py-2.5">{log.cost ? formatCurrency(log.cost) : "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{log.vendor || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Maintenance Entry</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Service Date *</Label>
                <Input type="date" value={form.serviceDate} onChange={(e) => setForm({ ...form, serviceDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Cost (optional)</Label>
                <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was done?" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Vendor / Technician</Label>
              <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Tech name or vendor" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>Add Entry</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

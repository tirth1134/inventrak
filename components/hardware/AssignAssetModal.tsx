"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";
import { api, type AssetAssignment } from "@/lib/api";

interface AssignAssetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  currentAssignment?: AssetAssignment | null;
  onSuccess: () => void;
}

export function AssignAssetModal({ open, onOpenChange, assetId, currentAssignment, onSuccess }: AssignAssetModalProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: employeesData } = useSWR(
    open ? "/employees?limit=200&status=ACTIVE" : null,
    () => api.getEmployees("limit=200&status=ACTIVE")
  );
  const employees = employeesData?.data ?? [];

  const handleAssign = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      await api.assignAsset(assetId, { employeeId, notes: notes || undefined });
      toast.success("Asset assigned successfully");
      onSuccess();
      onOpenChange(false);
      setEmployeeId("");
      setNotes("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{currentAssignment ? "Reassign Asset" : "Assign Asset"}</DialogTitle>
        </DialogHeader>

        {currentAssignment && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            ⚠ This will unassign <strong>{currentAssignment.employee.name}</strong> and assign to the selected employee.
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Employee *</Label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"
            >
              <option value="">Select employee…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} — {e.department?.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes…" />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!employeeId || loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {currentAssignment ? "Reassign" : "Assign"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

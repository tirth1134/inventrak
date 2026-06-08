"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";
import { api, type Employee } from "@/lib/api";

interface AssignUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptionId: string;
  assignedEmployeeIds: string[];
  onSuccess: () => void;
}

export function AssignUsersModal({ open, onOpenChange, subscriptionId, assignedEmployeeIds, onSuccess }: AssignUsersModalProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const { data } = useSWR(
    open ? "/employees?limit=200&status=ACTIVE" : null,
    () => api.getEmployees("limit=200&status=ACTIVE")
  );
  const available = (data?.data ?? []).filter((e: Employee) => !assignedEmployeeIds.includes(e.id));

  const handleAssign = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      await api.assignSubscriptionUser(subscriptionId, { employeeId, username: username || undefined });
      toast.success("Employee assigned");
      onSuccess();
      onOpenChange(false);
      setEmployeeId("");
      setUsername("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Assign Employee</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Employee *</Label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"
            >
              <option value="">Select employee…</option>
              {available.map((e: Employee) => (
                <option key={e.id} value={e.id}>{e.name} ({e.department?.name})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Username on tool (optional)</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username@tool.com" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!employeeId || loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Assign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

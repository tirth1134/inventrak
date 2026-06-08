"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { type Asset } from "@/lib/api";

interface AssetLabelCardProps {
  asset: Asset;
  companyName?: string;
}

export function AssetLabelCard({ asset, companyName = "InvenTrack" }: AssetLabelCardProps) {
  const currentAssignment = asset.assignments?.find((a) => a.isCurrent);

  return (
    <div>
      {/* Screen version */}
      <div className="no-print border border-border rounded-lg p-4 bg-card text-sm font-mono space-y-1 min-w-64">
        <p className="font-bold text-xs text-muted-foreground uppercase tracking-wider mb-2">{companyName} Asset Label</p>
        <p><span className="text-muted-foreground">ID: </span><span className="font-semibold">{asset.assetId}</span></p>
        {asset.serialNumber && <p><span className="text-muted-foreground">S/N: </span>{asset.serialNumber}</p>}
        <p><span className="text-muted-foreground">Type: </span>{asset.type}{asset.osType ? ` (${asset.osType})` : ""}</p>
        {asset.processor && <p><span className="text-muted-foreground">CPU: </span>{asset.processor.name}</p>}
        {asset.ramGb && <p><span className="text-muted-foreground">RAM: </span>{asset.ramGb} GB</p>}
        {currentAssignment && <p><span className="text-muted-foreground">Assigned: </span>{currentAssignment.employee.name}</p>}
        {asset.department && <p><span className="text-muted-foreground">Dept: </span>{asset.department.name}</p>}
      </div>

      {/* Print-only version */}
      <div className="print-only fixed inset-0 bg-white p-8 text-black font-mono text-sm space-y-2">
        <p className="font-bold text-lg border-b pb-2 mb-4">{companyName} — Asset Label</p>
        <p><strong>ID:</strong> {asset.assetId}</p>
        {asset.serialNumber && <p><strong>S/N:</strong> {asset.serialNumber}</p>}
        <p><strong>Type:</strong> {asset.type}{asset.osType ? ` (${asset.osType})` : ""}</p>
        <p><strong>Brand/Model:</strong> {[asset.brand, asset.model].filter(Boolean).join(" ") || "—"}</p>
        {asset.processor && <p><strong>Processor:</strong> {asset.processor.name}</p>}
        {asset.ramGb && <p><strong>RAM:</strong> {asset.ramGb} GB</p>}
        {currentAssignment && <p><strong>Assigned To:</strong> {currentAssignment.employee.name}</p>}
        {asset.department && <p><strong>Department:</strong> {asset.department.name}</p>}
      </div>

      <Button
        size="sm"
        variant="outline"
        className="mt-3 no-print"
        onClick={() => window.print()}
      >
        <Printer className="w-4 h-4 mr-2" />Print Label
      </Button>
    </div>
  );
}

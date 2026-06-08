"use client";

import { AlertTriangle, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAlerts } from "@/lib/hooks/useAlerts";

export function AlertBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { alerts, total } = useAlerts("daysAhead=30&limit=100");

  const renewalCount = alerts.filter((a) => a.type === "SUBSCRIPTION_RENEWAL").length;
  const warrantyCount = alerts.filter((a) => a.type === "WARRANTY_EXPIRY").length;
  const parts: string[] = [];
  if (renewalCount > 0) parts.push(`${renewalCount} renewal${renewalCount !== 1 ? "s" : ""}`);
  if (warrantyCount > 0) parts.push(`${warrantyCount} warranty${warrantyCount !== 1 ? " expiries" : " expiry"}`);
  if (parts.length === 0 && total > 0) parts.push(`${total} alert${total !== 1 ? "s" : ""}`);

  if (dismissed || total === 0) return null;

  return (
    <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/40">
      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
      <span className="flex-1 text-amber-900 dark:text-amber-200">
        {parts.join(" and ")} need attention.{" "}
        <Link href="/alerts" className="font-semibold underline underline-offset-2 inline-flex items-center gap-1">
          View <ArrowRight className="h-3 w-3" />
        </Link>
      </span>
      <button onClick={() => setDismissed(true)} className="text-amber-600 hover:text-amber-800 p-1">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

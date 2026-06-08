"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Alert } from "@/lib/api";
import { getDaysUntil, getUrgencyColor, formatDate, cn } from "@/lib/utils";

function alertTypeIcon(type: string) {
  const map: Record<string, string> = {
    SUBSCRIPTION_RENEWAL: "🔄",
    WARRANTY_EXPIRY: "🛡",
    PAYMENT_DUE: "💳",
    LOW_STOCK: "📦",
  };
  return map[type] ?? "⚠";
}

export function AlertsWidget({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <span>⚠</span> Upcoming Alerts
        </h3>
        <Link href="/alerts" className="text-xs text-primary hover:underline">View all →</Link>
      </div>
      <div className="space-y-2">
        {alerts.slice(0, 5).map((alert) => {
          const days = alert.dueDate ? getDaysUntil(alert.dueDate) : null;
          return (
            <div key={alert.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <span className="text-lg">{alertTypeIcon(alert.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{alert.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {alert.subscription?.name || alert.asset?.assetId}
                  {alert.dueDate && ` · ${formatDate(alert.dueDate)}`}
                </p>
              </div>
              {days !== null && (
                <span className={cn("text-xs font-medium shrink-0", getUrgencyColor(days))}>
                  {days < 0 ? "Overdue" : days === 0 ? "Today" : `in ${days}d`}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

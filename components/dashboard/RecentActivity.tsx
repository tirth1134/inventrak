"use client";

import { Card } from "@/components/ui/card";
import { type AuditLog } from "@/lib/api";
import { formatRelativeTime, cn } from "@/lib/utils";

function actionBadgeColor(action: string) {
  const map: Record<string, string> = {
    CREATED: "bg-green-100 text-green-700",
    UPDATED: "bg-blue-100 text-blue-700",
    DELETED: "bg-red-100 text-red-700",
    ASSIGNED: "bg-purple-100 text-purple-700",
    SCRAPPED: "bg-gray-100 text-gray-700",
  };
  return map[action] ?? "bg-gray-100 text-gray-700";
}

export function RecentActivity({ logs }: { logs: AuditLog[] }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent activity.</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3">
              <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded shrink-0 mt-0.5", actionBadgeColor(log.action))}>
                {log.action}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">
                  {log.detail || `${log.entity} #${log.entityId.slice(0, 6)}`}
                </p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(log.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

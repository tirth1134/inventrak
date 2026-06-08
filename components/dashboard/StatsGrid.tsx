"use client";

import { CreditCard, Monitor, Bell, IndianRupee, Users, Package, Wrench, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";

interface Stats {
  activeSubscriptions: number;
  totalMonthlySpend: number;
  totalAssets: number;
  activeAlerts: number;
  cancelledSubscriptions: number;
  assetsInUse: number;
  assetsInStock: number;
  assetsInRepair: number;
  scrappedAssets: number;
  totalEmployees: number;
}

function StatCard({ icon: Icon, label, value, color = "blue", href }: {
  icon: React.ElementType; label: string; value: number | string; color?: string; href?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };
  const card = (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorMap[color] ?? colorMap.blue)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </div>
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export function StatsGrid({ stats }: { stats?: Stats }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CreditCard} label="Active Subscriptions" value={stats?.activeSubscriptions ?? 0} color="blue" href="/subscriptions?status=ACTIVE" />
        <StatCard icon={IndianRupee} label="Monthly Spend" value={formatCurrency(stats?.totalMonthlySpend ?? 0)} color="green" href="/reports" />
        <StatCard icon={Monitor} label="Total Assets" value={stats?.totalAssets ?? 0} color="purple" href="/hardware" />
        <StatCard icon={Bell} label="Active Alerts" value={stats?.activeAlerts ?? 0} color={stats?.activeAlerts ? "red" : "blue"} href="/alerts" />
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          { label: "Cancelled Subscriptions", value: stats?.cancelledSubscriptions ?? 0, icon: CreditCard },
          { label: "Assets In Use", value: stats?.assetsInUse ?? 0, icon: Monitor },
          { label: "In Stock", value: stats?.assetsInStock ?? 0, icon: Package },
          { label: "In Repair", value: stats?.assetsInRepair ?? 0, icon: Wrench },
          { label: "Scrapped", value: stats?.scrappedAssets ?? 0, icon: Trash2 },
          { label: "Total Employees", value: stats?.totalEmployees ?? 0, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-semibold text-foreground">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

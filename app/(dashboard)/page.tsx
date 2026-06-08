"use client";

import {
  CreditCard, Monitor, Bell, IndianRupee, Users, Package,
  Wrench, Trash2, ArrowRight, CheckCircle2, Layers3, Activity, Coins,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { useSession } from "next-auth/react";
import { formatCurrency, formatRelativeTime, getUrgencyColor, getDaysUntil, formatDate, cn } from "@/lib/utils";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 25 } },
} as const;

function StatCard({
  icon: Icon, label, value, href, color, glowColor, strokeColor, sparklinePath
}: {
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  href?: string; 
  color: string;
  glowColor: string;
  strokeColor: string;
  sparklinePath: string;
}) {
  const inner = (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "ui-card relative p-6 h-full overflow-hidden group border border-border/60 cursor-pointer",
        glowColor
      )}
    >
      <div className="flex justify-between items-start z-10 relative">
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
          <h3 className={cn(
            "font-bold text-foreground tracking-tight transition-all duration-200",
            String(value).length > 12 ? "text-xl sm:text-2xl" : "text-3xl"
          )}>{value}</h3>
        </div>
        <div className={cn("stat-icon shadow-inner", color)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      
      {/* Sparkline decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-10 overflow-hidden opacity-25 group-hover:opacity-45 transition-opacity pointer-events-none">
        <svg viewBox="0 0 100 25" className="w-full h-full" preserveAspectRatio="none">
          <path
            d={sparklinePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className={strokeColor}
          />
        </svg>
      </div>
    </motion.div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

export default function DashboardPage() {
  const { dashboard, isLoading } = useDashboard();
  const { data: session } = useSession();

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();

  if (isLoading) {
    return (
      <div className="page-shell space-y-6">
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats;
  const alerts = dashboard?.alerts ?? [];
  const recentActivity = dashboard?.recentActivity ?? [];
  const upcomingRenewals = alerts.filter(
    (a) => a.type === "SUBSCRIPTION_RENEWAL" && a.dueDate && getDaysUntil(a.dueDate) <= 30 && getDaysUntil(a.dueDate) >= 0
  );

  const totalHardware = (stats?.assetsInUse ?? 0) + (stats?.assetsInStock ?? 0) + (stats?.assetsInRepair ?? 0);
  const inUsePercent = totalHardware > 0 ? ((stats?.assetsInUse ?? 0) / totalHardware) * 100 : 0;
  const inStockPercent = totalHardware > 0 ? ((stats?.assetsInStock ?? 0) / totalHardware) * 100 : 0;
  const inRepairPercent = totalHardware > 0 ? ((stats?.assetsInRepair ?? 0) / totalHardware) * 100 : 0;

  const monthlySpendStr = (() => {
    if (!stats?.monthlySpendByCurrency || Object.keys(stats.monthlySpendByCurrency).length === 0) {
      return formatCurrency(stats?.totalMonthlySpend ?? 0);
    }
    const activeSpends = Object.entries(stats.monthlySpendByCurrency)
      .filter(([_, amt]) => amt > 0);
    
    if (activeSpends.length === 0) {
      return formatCurrency(0);
    }
    
    return activeSpends
      .map(([curr, amt]) => formatCurrency(amt, curr))
      .join(" + ");
  })();

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="page-shell space-y-6"
    >
      {/* Welcome */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="kicker">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mt-0.5">
            {greeting}, {session?.user?.name || "Admin"}
          </h1>
        </div>
      </motion.div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={CreditCard} 
          label="Active Subscriptions" 
          value={stats?.activeSubscriptions ?? 0} 
          href="/subscriptions?status=ACTIVE" 
          color="bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400"
          glowColor="hover:border-teal-200 dark:hover:border-teal-900/40 hover:shadow-lg hover:shadow-teal-500/5"
          strokeColor="text-teal-500"
          sparklinePath="M 0 15 Q 15 5, 30 18 T 60 8 T 90 12 T 100 5"
        />
        <StatCard 
          icon={Coins} 
          label="Monthly Spend" 
          value={monthlySpendStr} 
          href="/reports" 
          color="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
          glowColor="hover:border-amber-200 dark:hover:border-amber-900/40 hover:shadow-lg hover:shadow-amber-500/5"
          strokeColor="text-amber-500"
          sparklinePath="M 0 10 Q 20 20, 40 8 T 80 15 T 100 12"
        />
        <StatCard 
          icon={Monitor} 
          label="Total Assets" 
          value={stats?.totalAssets ?? 0} 
          href="/hardware" 
          color="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
          glowColor="hover:border-blue-200 dark:hover:border-blue-900/40 hover:shadow-lg hover:shadow-blue-500/5"
          strokeColor="text-blue-500"
          sparklinePath="M 0 18 Q 25 10, 50 15 T 75 5 T 100 8"
        />
        <StatCard 
          icon={Bell} 
          label="Active Alerts" 
          value={stats?.activeAlerts ?? 0} 
          href="/alerts" 
          color="bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
          glowColor="hover:border-red-200 dark:hover:border-red-900/40 hover:shadow-lg hover:shadow-red-500/5"
          strokeColor="text-red-500"
          sparklinePath="M 0 8 Q 15 18, 30 5 T 60 18 T 90 8 T 100 15"
        />
      </div>

      {/* Asset breakdown */}
      <motion.div variants={itemVariants} className="ui-card p-6 border border-border/70">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-5">Asset & Employee Allocation</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 grid grid-cols-3 sm:grid-cols-6 gap-4">
            {[
              { label: "In Use", value: stats?.assetsInUse ?? 0, icon: Monitor, color: "text-blue-500" },
              { label: "In Stock", value: stats?.assetsInStock ?? 0, icon: Package, color: "text-emerald-500" },
              { label: "In Repair", value: stats?.assetsInRepair ?? 0, icon: Wrench, color: "text-amber-500" },
              { label: "Scrapped", value: stats?.scrappedAssets ?? 0, icon: Trash2, color: "text-muted-foreground" },
              { label: "Cancelled Subs", value: stats?.cancelledSubscriptions ?? 0, icon: CreditCard, color: "text-indigo-500" },
              { label: "Employees", value: stats?.totalEmployees ?? 0, icon: Users, color: "text-violet-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="text-center group cursor-default p-2 rounded-xl hover:bg-muted/30 transition-colors">
                <Icon className={cn("h-5 w-5 mx-auto mb-2 transition-transform duration-200 group-hover:scale-110", color)} />
                <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground font-semibold mt-1.5 uppercase tracking-wide truncate">{label}</p>
              </div>
            ))}
          </div>
          <div className="border-t lg:border-t-0 lg:border-l border-border/60 pt-4 lg:pt-0 lg:pl-6 space-y-4">
            <div className="flex justify-between text-xs text-muted-foreground font-bold uppercase tracking-wider">
              <span>Hardware Status Ratio</span>
              <span>{totalHardware} Total Managed</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex shadow-inner">
              <div style={{ width: `${inUsePercent}%` }} className="bg-blue-500 h-full" title={`In Use: ${stats?.assetsInUse}`} />
              <div style={{ width: `${inStockPercent}%` }} className="bg-emerald-500 h-full" title={`In Stock: ${stats?.assetsInStock}`} />
              <div style={{ width: `${inRepairPercent}%` }} className="bg-amber-500 h-full" title={`In Repair: ${stats?.assetsInRepair}`} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-0.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                In Use ({Math.round(inUsePercent)}%)
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                In Stock ({Math.round(inStockPercent)}%)
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                In Repair ({Math.round(inRepairPercent)}%)
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Alerts + panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {alerts.length > 0 && (
          <motion.div variants={itemVariants} className="ui-card p-6 border border-red-200 dark:border-red-950/40 bg-red-50/10 dark:bg-red-950/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                Needs Attention
              </h2>
              <Link href="/alerts" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-1.5">
              {alerts.slice(0, 4).map((alert) => {
                const days = alert.dueDate ? getDaysUntil(alert.dueDate) : null;
                return (
                  <Link key={alert.id} href="/alerts" className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-red-500/5 transition-all duration-200 group border border-transparent hover:border-red-100 dark:hover:border-red-950/30">
                    <div className="h-9 w-9 rounded-xl bg-red-100/60 dark:bg-red-950/40 text-red-600 flex items-center justify-center shrink-0">
                      <Bell className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{alert.title}</p>
                      <p className="text-xs text-muted-foreground truncate font-medium mt-0.5">{alert.subscription?.name || alert.asset?.assetId}</p>
                    </div>
                    {days !== null && (
                      <Badge variant="outline" className={cn("text-xs shrink-0 font-bold px-2 py-0.5 shadow-sm", getUrgencyColor(days))}>
                        {days < 0 ? "Overdue" : days === 0 ? "Today" : `${days}d`}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="ui-card p-6 border border-border/70">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Upcoming Renewals</h2>
          {upcomingRenewals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center h-[calc(100%-2rem)]">
              <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-foreground">All Subscriptions Active</p>
              <p className="text-xs text-muted-foreground mt-0.5">No renewals required in the next 30 days.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {upcomingRenewals.map((alert) => {
                const days = alert.dueDate ? getDaysUntil(alert.dueDate) : null;
                return (
                  <div key={alert.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-semibold text-foreground truncate">{alert.subscription?.name || alert.title}</p>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">{alert.dueDate ? formatDate(alert.dueDate) : "—"}</p>
                    </div>
                    {days !== null && (
                      <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", 
                        days === 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400" : "bg-muted text-muted-foreground"
                      )}>
                        {days === 0 ? "Today" : `${days}d`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className={cn("ui-card p-6 border border-border/70", alerts.length > 0 ? "lg:col-span-2" : "")}>
          <div className="flex items-center gap-2 mb-4 border-b border-border/50 pb-3">
            <Activity className="h-4.5 w-4.5 text-primary" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Recent System Activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Layers3 className="h-10 w-10 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">No recent log entries</p>
            </div>
          ) : (
            <div className="relative border-l border-border/80 ml-3.5 pl-6.5 space-y-5.5 py-1">
              {recentActivity.slice(0, 5).map((log) => {
                let actionColor = "bg-blue-500";
                if (log.action === "CREATE") actionColor = "bg-emerald-500";
                if (log.action === "DELETE" || log.action === "SCRAP") actionColor = "bg-red-500";
                if (log.action === "UPDATE") actionColor = "bg-amber-500";

                return (
                  <div key={log.id} className="relative group">
                    {/* Timeline Node Bullet */}
                    <span className={cn("absolute -left-10 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-card ring-4 ring-muted/30 group-hover:scale-110 transition-transform duration-200", actionColor)} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded", 
                          log.action === "CREATE" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/45 dark:text-emerald-400" :
                          log.action === "UPDATE" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/45 dark:text-amber-400" :
                          log.action === "DELETE" ? "bg-red-50 text-red-600 dark:bg-red-950/45 dark:text-red-400" :
                          "bg-blue-50 text-blue-600 dark:bg-blue-950/45 dark:text-blue-400"
                        )}>
                          {log.action}
                        </span>
                        <span className="text-xs text-muted-foreground font-semibold">{formatRelativeTime(log.createdAt)}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground mt-1.5 leading-relaxed">{log.detail || `${log.entity} #${log.entityId.slice(0, 6)}`}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

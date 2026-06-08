"use client";

import { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Monitor, CreditCard, Users, Truck, BarChart3,
  Settings, LogOut, Bell, Package, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { generateInitials } from "@/lib/utils";
import { useAlerts } from "@/lib/hooks/useAlerts";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}
const SidebarContext = createContext<SidebarContextValue>({ collapsed: false, setCollapsed: () => {} });
export function useSidebar() { return useContext(SidebarContext); }

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem("sidebar-collapsed") === "true") setCollapsed(true);
  }, []);
  useEffect(() => {
    if (mounted) localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed, mounted]);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hardware", label: "Hardware", icon: Monitor },
  { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/vendors", label: "Vendors", icon: Truck },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const systemNav = [
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({
  href, label, icon: Icon, active, badge, collapsed,
}: {
  href: string; label: string; icon: React.ElementType; active: boolean; badge?: number; collapsed: boolean;
}) {
  const content = (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
        active
          ? "text-primary font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {active && (
        <motion.div
          layoutId="activeNavLink"
          className="absolute inset-0 bg-primary/10 rounded-xl -z-10 dark:bg-primary/20"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      {active && (
        <motion.div
          layoutId="activeBorder"
          className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-primary"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      <Icon className={cn("w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105", 
        active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
      )} />
      {!collapsed && (
        <motion.span 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 truncate"
        >
          {label}
        </motion.span>
      )}
      {!collapsed && badge && badge > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white shadow-sm shadow-destructive/30">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="relative">
            {content}
            {badge && badge > 0 && (
              <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-destructive ring-1 ring-background" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {label} {badge && badge > 0 ? `(${badge})` : ""}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { total: alertCount } = useAlerts();
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <TooltipProvider>
      <motion.aside
        animate={{ width: collapsed ? 76 : 240 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex shrink-0 flex-col border-r border-border bg-card/80 backdrop-blur-md h-full relative z-30"
      >
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-7 z-40 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          aria-label="Toggle sidebar collapse"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        {/* Logo */}
        <Link href="/" className="flex h-16 items-center gap-3 border-b border-border/60 px-4.5 hover:bg-muted/30 transition-colors cursor-pointer overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20">
            <Package className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="min-w-0"
            >
              <p className="text-sm font-bold text-foreground leading-none tracking-tight">InvenTrack</p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 uppercase tracking-wider">Inventory</p>
            </motion.div>
          )}
        </Link>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div className="space-y-1">
            {!collapsed && <p className="px-3 mb-2 section-label">Main</p>}
            {nav.map((item) => (
              <NavLink key={item.href} {...item} active={isActive(item.href)} collapsed={collapsed} />
            ))}
          </div>
          <div className="space-y-1">
            {!collapsed && <p className="px-3 mb-2 section-label">System</p>}
            {systemNav.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={isActive(item.href)}
                badge={item.href === "/alerts" ? alertCount : undefined}
                collapsed={collapsed}
              />
            ))}
          </div>
        </nav>

        {/* User */}
        <div className="border-t border-border/60 p-3 bg-muted/10">
          <div className={cn("flex items-center gap-3 rounded-xl px-2 py-2 transition-all duration-200", 
            collapsed ? "justify-center" : "bg-card/50 border border-border/40 shadow-sm"
          )}>
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Avatar className="h-9 w-9 ring-2 ring-primary/10">
                    <AvatarFallback className="text-xs bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 text-primary font-semibold">
                      {session?.user?.name ? generateInitials(session.user.name) : "A"}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-semibold">{session?.user?.name || "Admin"}</p>
                  <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <>
                <Avatar className="h-9 w-9 ring-2 ring-primary/10 shrink-0">
                  <AvatarFallback className="text-xs bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 text-primary font-semibold">
                    {session?.user?.name ? generateInitials(session.user.name) : "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate leading-tight">{session?.user?.name || "Admin"}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{session?.user?.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}

"use client";

import { Sun, Moon, Bell, Settings, LogOut, Search, Loader2, Monitor, CreditCard, AlignLeft } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateInitials, formatAssetType } from "@/lib/utils";
import { useAlerts } from "@/lib/hooks/useAlerts";
import { api, type Subscription, type Asset } from "@/lib/api";
import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/layout/Sidebar";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  type: "asset" | "subscription";
  href: string;
}

function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const [hw, subs] = await Promise.all([
        api.getAssets(`search=${encodeURIComponent(q)}&limit=5`),
        api.getSubscriptions(`search=${encodeURIComponent(q)}&limit=5`),
      ]);
      setResults([
        ...(hw.data ?? []).map((a: Asset) => ({
          id: a.id,
          label: `${a.assetId} — ${[a.brand, a.model].filter(Boolean).join(" ")}`,
          sublabel: formatAssetType(a.type),
          type: "asset" as const,
          href: `/hardware/${a.id}`,
        })),
        ...(subs.data ?? []).map((s: Subscription) => ({
          id: s.id,
          label: s.name,
          sublabel: s.category ?? s.billingCycle,
          type: "subscription" as const,
          href: `/subscriptions/${s.id}`,
        })),
      ]);
      setOpen(true);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      <div className={cn(
        "flex items-center gap-2 rounded-xl border bg-card px-3 h-10 transition-all duration-200 shadow-sm",
        focused ? "border-primary ring-4 ring-primary/10 bg-card" : "border-border/80"
      )}>
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            clearTimeout(debounceRef.current);
            if (!e.target.value.trim()) { setResults([]); setOpen(false); return; }
            debounceRef.current = setTimeout(() => doSearch(e.target.value), 300);
          }}
          onFocus={() => { setFocused(true); if (results.length) setOpen(true); }}
          onBlur={() => setFocused(false)}
          placeholder="Search assets, subscriptions, employees..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
        ) : (
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted/50 px-1.5 text-[10px] font-medium text-muted-foreground/85">
            ⌘K
          </kbd>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-[calc(100%+6px)] left-0 w-full glass-panel ui-card shadow-xl z-50 overflow-hidden py-1.5 rounded-xl border border-border/80"
          >
            {results.length === 0 && !loading ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
            ) : (
              results.map((r) => (
                <button
                  key={r.id}
                  className="flex w-full items-center gap-3 px-4.5 py-2.5 text-left hover:bg-muted/70 transition-colors"
                  onMouseDown={() => { router.push(r.href); setQuery(""); setOpen(false); }}
                >
                  <div className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                    r.type === "asset" 
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400" 
                      : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                  )}>
                    {r.type === "asset" ? <Monitor className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate text-foreground">{r.label}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">{r.sublabel}</p>
                  </div>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Topbar() {
  const { data: session } = useSession();
  const { total } = useAlerts();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { collapsed, setCollapsed } = useSidebar();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border/40 bg-background/60 backdrop-blur-md px-6">
      {/* Sidebar Toggle for Desktop/Mobile layout */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(!collapsed)}
        className="h-9 w-9 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        aria-label="Toggle sidebar"
      >
        <AlignLeft className="h-[18px] w-[18px]" />
      </Button>

      <div className="flex-1">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-lg"
          aria-label="Toggle theme"
        >
          {!mounted ? (
            <Moon className="h-[18px] w-[18px] opacity-0" />
          ) : theme === "dark" ? (
            <Sun className="h-[18px] w-[18px] text-amber-500" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </Button>

        <Button variant="ghost" size="icon" className="relative h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer" asChild>
          <Link href="/alerts">
            <Bell className="h-[18px] w-[18px]" />
            {total > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-card animate-pulse" />
            )}
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-1.5 hover:bg-muted/50 rounded-lg cursor-pointer">
              <Avatar className="h-7 w-7 ring-2 ring-primary/5">
                <AvatarFallback className="text-[10px] bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 text-primary font-semibold">
                  {session?.user?.name ? generateInitials(session.user.name) : "A"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl border border-border/80 shadow-xl p-1.5">
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold text-foreground">{session?.user?.name || "Admin"}</p>
              <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">{session?.user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="rounded-lg cursor-pointer py-2">
              <Link href="/settings" className="flex items-center gap-2 text-sm">
                <Settings className="h-4 w-4 text-muted-foreground" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="rounded-lg cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive py-2 gap-2 text-sm" 
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

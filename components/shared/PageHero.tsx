"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}

export function PageHero({ eyebrow, title, description, icon: Icon, children, className }: PageHeroProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="hidden sm:flex stat-icon bg-primary/10 text-primary mt-0.5">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div>
          {eyebrow && <p className="kicker mb-1">{eyebrow}</p>}
          <h1 className="text-xl font-semibold text-foreground tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1 max-w-xl">{description}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap gap-2 shrink-0">{children}</div>}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface FilterBarProps {
  children: React.ReactNode;
  activeCount?: number;
  className?: string;
}

export function FilterBar({ children, activeCount, className }: FilterBarProps) {
  return (
    <div className={cn("flex items-center gap-3 flex-wrap", className)}>
      {children}
      {activeCount !== undefined && activeCount > 0 && (
        <Badge variant="secondary" className="text-xs h-6 px-2">
          {activeCount} filter{activeCount !== 1 ? "s" : ""} active
        </Badge>
      )}
    </div>
  );
}

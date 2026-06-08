"use client";

import { Topbar } from "@/components/layout/Topbar";
import { AlertBanner } from "@/components/layout/AlertBanner";

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden bg-background">
      <Topbar />
      <AlertBanner />
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SidebarProvider, Sidebar } from "@/components/layout/Sidebar";
import { DashboardLayoutClient } from "@/components/layout/DashboardLayoutClient";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SidebarProvider>
      <div className="flex h-full w-full overflow-hidden bg-background">
        <Sidebar />
        <DashboardLayoutClient>{children}</DashboardLayoutClient>
      </div>
    </SidebarProvider>
  );
}

import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "monthly";
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString(), 10);

    const subscriptions = await prisma.subscription.findMany({
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
    });

    const summary = {
      year,
      period,
      totalActive: subscriptions.filter((s) => s.status === "ACTIVE").length,
      totalCancelled: subscriptions.filter((s) => s.status === "CANCELLED").length,
      totalExpired: subscriptions.filter((s) => s.status === "EXPIRED").length,
      totalMonthlySpend: subscriptions
        .filter((s) => s.status === "ACTIVE" && s.billingCycle === "MONTHLY")
        .reduce((sum, s) => sum + Number(s.price), 0),
      totalYearlySpend: subscriptions
        .filter((s) => s.status === "ACTIVE" && s.billingCycle === "YEARLY")
        .reduce((sum, s) => sum + Number(s.price), 0),
      byCategory: Object.entries(
        subscriptions.reduce(
          (acc, s) => {
            const cat = s.category || "Uncategorized";
            if (!acc[cat]) acc[cat] = { count: 0, totalSpend: 0 };
            acc[cat].count++;
            if (s.status === "ACTIVE") acc[cat].totalSpend += Number(s.price);
            return acc;
          },
          {} as Record<string, { count: number; totalSpend: number }>
        )
      ).map(([category, data]) => ({ category, ...data })),
      byDepartment: Object.entries(
        subscriptions.reduce(
          (acc, s) => {
            const dept = s.department?.name || "Unassigned";
            if (!acc[dept]) acc[dept] = { count: 0, totalSpend: 0 };
            acc[dept].count++;
            if (s.status === "ACTIVE") acc[dept].totalSpend += Number(s.price);
            return acc;
          },
          {} as Record<string, { count: number; totalSpend: number }>
        )
      ).map(([department, data]) => ({ department, ...data })),
    };

    return success({
      summary,
      subscriptions: subscriptions.map((s) => ({
        ...s,
        price: Number(s.price),
        costPerUser: s.licenceCount > 0 ? Math.round((Number(s.price) / s.licenceCount) * 100) / 100 : Number(s.price),
        usernameEncrypted: undefined,
        passwordEncrypted: undefined,
      })),
    });
  } catch (err) {
    console.error("GET /api/reports/subscriptions error:", err);
    return error("Failed to generate subscription report", 500);
  }
}

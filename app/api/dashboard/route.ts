import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return error("Unauthorized", 401);
    }

    const [
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      monthlySpendByCurrency,
      yearlySpendByCurrency,
      totalAssets,
      assetsInUse,
      assetsInStock,
      assetsInRepair,
      scrappedAssets,
      totalEmployees,
      activeAlerts,
      alerts,
      recentActivity,
    ] = await Promise.all([
      // Subscription counts
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.count({ where: { status: "CANCELLED" } }),

      // Monthly spend (grouped by currency of ACTIVE monthly subscriptions)
      prisma.subscription.groupBy({
        by: ["currency"],
        _sum: { price: true },
        where: { status: "ACTIVE", billingCycle: "MONTHLY" },
      }),

      // Yearly spend (grouped by currency of ACTIVE yearly subscriptions)
      prisma.subscription.groupBy({
        by: ["currency"],
        _sum: { price: true },
        where: { status: "ACTIVE", billingCycle: "YEARLY" },
      }),

      // Asset counts
      prisma.asset.count(),
      prisma.asset.count({ where: { status: "IN_USE" } }),
      prisma.asset.count({ where: { status: "IN_STOCK" } }),
      prisma.asset.count({ where: { status: "IN_REPAIR" } }),
      prisma.asset.count({ where: { status: "SCRAPPED" } }),

      // Employee count
      prisma.employee.count({ where: { status: "ACTIVE" } }),

      // Active (undismissed) alerts count
      prisma.alert.count({ where: { isDismissed: false } }),

      // Undismissed alerts sorted by dueDate ascending
      prisma.alert.findMany({
        where: { isDismissed: false },
        orderBy: { dueDate: "asc" },
        include: {
          subscription: { select: { id: true, name: true } },
          asset: { select: { id: true, assetId: true, brand: true, model: true } },
        },
      }),

      // Recent activity (last 10 audit logs)
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          employee: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    const monthlySpendResult: Record<string, number> = {};
    let fallbackMonthlySpend = 0;
    monthlySpendByCurrency.forEach((item) => {
      const val = item._sum.price?.toNumber() ?? 0;
      monthlySpendResult[item.currency] = val;
      fallbackMonthlySpend += val;
    });

    const yearlySpendResult: Record<string, number> = {};
    let fallbackYearlySpend = 0;
    yearlySpendByCurrency.forEach((item) => {
      const val = item._sum.price?.toNumber() ?? 0;
      yearlySpendResult[item.currency] = val;
      fallbackYearlySpend += val;
    });

    return success({
      stats: {
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        totalMonthlySpend: fallbackMonthlySpend,
        totalYearlySpend: fallbackYearlySpend,
        monthlySpendByCurrency: monthlySpendResult,
        yearlySpendByCurrency: yearlySpendResult,
        totalAssets,
        assetsInUse,
        assetsInStock,
        assetsInRepair,
        scrappedAssets,
        totalEmployees,
        activeAlerts,
      },
      alerts,
      recentActivity,
    });
  } catch (err) {
    console.error("Dashboard GET error:", err);
    return error("Failed to load dashboard data", 500);
  }
}

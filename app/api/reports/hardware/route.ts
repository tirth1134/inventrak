import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const searchParams = request.nextUrl.searchParams;
    const groupBy = searchParams.get("groupBy") || "status";
    const status = searchParams.get("status");

    const where: Prisma.AssetWhereInput = {};
    if (status) where.status = status as Prisma.EnumAssetStatusFilter["equals"];

    const assets = await prisma.asset.findMany({
      where,
      include: {
        department: { select: { name: true } },
        vendor: { select: { name: true } },
        processor: { select: { name: true, grade: true } },
        location: { select: { name: true } },
        assignments: {
          where: { isCurrent: true },
          include: { employee: { select: { name: true } } },
        },
      },
      orderBy: { assetId: "asc" },
    });

    // Aggregate by groupBy dimension
    const groups: Record<string, { count: number; totalValue: number }> = {};
    for (const asset of assets) {
      let key = "Unknown";
      if (groupBy === "department") key = asset.department?.name || "Unassigned";
      else if (groupBy === "type") key = asset.type;
      else if (groupBy === "status") key = asset.status;
      else if (groupBy === "vendor") key = asset.vendor?.name || "No Vendor";
      else if (groupBy === "processor_grade") key = asset.processor?.grade || "No Processor";

      if (!groups[key]) groups[key] = { count: 0, totalValue: 0 };
      groups[key].count++;
      if (asset.purchasePrice) groups[key].totalValue += Number(asset.purchasePrice);
    }

    const summary = {
      total: assets.length,
      groupBy,
      groups: Object.entries(groups).map(([label, data]) => ({ label, ...data })),
      byStatus: {
        IN_USE: assets.filter((a) => a.status === "IN_USE").length,
        IN_STOCK: assets.filter((a) => a.status === "IN_STOCK").length,
        IN_REPAIR: assets.filter((a) => a.status === "IN_REPAIR").length,
        SCRAPPED: assets.filter((a) => a.status === "SCRAPPED").length,
      },
      totalPurchaseValue: assets.reduce((sum, a) => sum + (a.purchasePrice ? Number(a.purchasePrice) : 0), 0),
    };

    return success({
      summary,
      assets: assets.map((a) => ({
        ...a,
        purchasePrice: a.purchasePrice ? Number(a.purchasePrice) : null,
        currentAssignee: a.assignments[0]?.employee?.name || null,
      })),
    });
  } catch (err) {
    console.error("GET /api/reports/hardware error:", err);
    return error("Failed to generate hardware report", 500);
  }
}

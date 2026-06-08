import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, paginated, error, parsePagination } from "@/lib/api-response";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const type = searchParams.get("type");
    const daysAheadParam = searchParams.get("daysAhead");

    const where: Prisma.AlertWhereInput = { isDismissed: false };

    if (type) where.type = type as Prisma.EnumAlertTypeFilter["equals"];

    if (daysAheadParam) {
      const daysAhead = parseInt(daysAheadParam, 10);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      where.dueDate = { lte: futureDate };
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: "asc" },
        include: {
          subscription: { select: { id: true, name: true } },
          asset: { select: { id: true, assetId: true, brand: true, model: true } },
        },
      }),
      prisma.alert.count({ where }),
    ]);

    return paginated(alerts, total, page, limit);
  } catch (err) {
    console.error("GET /api/alerts error:", err);
    return error("Failed to fetch alerts", 500);
  }
}

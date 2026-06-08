import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { createStockLocationSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const locations = await prisma.stockLocation.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { assets: true } } },
    });

    // Count assets by status for each location
    const locationsWithCounts = await Promise.all(
      locations.map(async (loc) => {
        const statusCounts = await prisma.asset.groupBy({
          by: ["status"],
          where: { locationId: loc.id },
          _count: true,
        });

        const countsByStatus = statusCounts.reduce(
          (acc, item) => {
            acc[item.status] = item._count;
            return acc;
          },
          {} as Record<string, number>
        );

        return {
          ...loc,
          assetCounts: {
            total: loc._count.assets,
            IN_STOCK: countsByStatus["IN_STOCK"] || 0,
            IN_USE: countsByStatus["IN_USE"] || 0,
            IN_REPAIR: countsByStatus["IN_REPAIR"] || 0,
            SCRAPPED: countsByStatus["SCRAPPED"] || 0,
          },
        };
      })
    );

    return success(locationsWithCounts);
  } catch (err) {
    console.error("GET /api/stock error:", err);
    return error("Failed to fetch stock locations", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const body = await request.json();
    const parsed = createStockLocationSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const location = await prisma.stockLocation.create({ data: parsed.data });

    await createAuditLog({
      action: "CREATED",
      entity: "StockLocation",
      entityId: location.id,
      detail: `Created stock location "${location.name}"`,
      adminId: session.user?.id,
    });

    return success(location, "Stock location created successfully", 201);
  } catch (err) {
    console.error("POST /api/stock error:", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return error("A location with this name already exists", 409);
    }
    return error("Failed to create stock location", 500);
  }
}

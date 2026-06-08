import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { updateStockLocationSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;
    const body = await request.json();
    const parsed = updateStockLocationSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const existing = await prisma.stockLocation.findUnique({ where: { id } });
    if (!existing) return error("Stock location not found", 404);

    const location = await prisma.stockLocation.update({ where: { id }, data: parsed.data });

    await createAuditLog({
      action: "UPDATED",
      entity: "StockLocation",
      entityId: location.id,
      detail: `Updated stock location "${location.name}"`,
      adminId: session.user?.id,
    });

    return success(location, "Stock location updated successfully");
  } catch (err) {
    console.error("PUT /api/stock/[id] error:", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return error("A location with this name already exists", 409);
    }
    return error("Failed to update stock location", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;

    const location = await prisma.stockLocation.findUnique({
      where: { id },
      include: { _count: { select: { assets: true } } },
    });
    if (!location) return error("Stock location not found", 404);

    if (location._count.assets > 0) {
      return error(`Cannot delete location with ${location._count.assets} asset(s) assigned to it`, 409);
    }

    await prisma.stockLocation.delete({ where: { id } });

    await createAuditLog({
      action: "DELETED",
      entity: "StockLocation",
      entityId: id,
      detail: `Deleted stock location "${location.name}"`,
      adminId: session.user?.id,
    });

    return success(null, "Stock location deleted successfully");
  } catch (err) {
    console.error("DELETE /api/stock/[id] error:", err);
    return error("Failed to delete stock location", 500);
  }
}

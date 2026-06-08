import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { updateFloorMapSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;

    const floorMap = await prisma.floorMap.findUnique({
      where: { id },
      include: {
        desks: {
          include: {
            employee: { select: { id: true, name: true, email: true } },
            asset: { select: { id: true, assetId: true, type: true, brand: true, model: true, status: true } },
            location: { select: { id: true, name: true } },
          },
          orderBy: [{ gridY: "asc" }, { gridX: "asc" }],
        },
      },
    });

    if (!floorMap) return error("Floor map not found", 404);
    return success(floorMap);
  } catch (err) {
    console.error("GET /api/floor-map/[id] error:", err);
    return error("Failed to fetch floor map", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;
    const body = await request.json();
    const parsed = updateFloorMapSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const existing = await prisma.floorMap.findUnique({ where: { id } });
    if (!existing) return error("Floor map not found", 404);

    const floorMap = await prisma.floorMap.update({ where: { id }, data: parsed.data });

    await createAuditLog({
      action: "UPDATED",
      entity: "FloorMap",
      entityId: floorMap.id,
      detail: `Updated floor map "${floorMap.name}"`,
      adminId: session.user?.id,
    });

    return success(floorMap, "Floor map updated successfully");
  } catch (err) {
    console.error("PUT /api/floor-map/[id] error:", err);
    return error("Failed to update floor map", 500);
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

    const floorMap = await prisma.floorMap.findUnique({ where: { id } });
    if (!floorMap) return error("Floor map not found", 404);

    await prisma.floorMap.delete({ where: { id } });

    await createAuditLog({
      action: "DELETED",
      entity: "FloorMap",
      entityId: id,
      detail: `Deleted floor map "${floorMap.name}"`,
      adminId: session.user?.id,
    });

    return success(null, "Floor map deleted successfully");
  } catch (err) {
    console.error("DELETE /api/floor-map/[id] error:", err);
    return error("Failed to delete floor map", 500);
  }
}

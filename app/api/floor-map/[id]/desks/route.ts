import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { bulkUpsertDesksSchema } from "@/lib/validators";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;
    const body = await request.json();
    const parsed = bulkUpsertDesksSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const floorMap = await prisma.floorMap.findUnique({ where: { id } });
    if (!floorMap) return error("Floor map not found", 404);

    const desks = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const desk of parsed.data.desks) {
        const { id: deskId, ...deskData } = desk;

        const data = {
          floorMapId: id,
          gridX: deskData.gridX,
          gridY: deskData.gridY,
          label: deskData.label,
          employeeId: deskData.employeeId ?? null,
          assetId: deskData.assetId ?? null,
          locationId: deskData.locationId ?? null,
        };

        if (deskId) {
          const updated = await tx.floorMapDesk.upsert({
            where: { id: deskId },
            create: data,
            update: {
              label: data.label,
              employeeId: data.employeeId,
              assetId: data.assetId,
              locationId: data.locationId,
            },
          });
          results.push(updated);
        } else {
          const upserted = await tx.floorMapDesk.upsert({
            where: { floorMapId_gridX_gridY: { floorMapId: id, gridX: deskData.gridX, gridY: deskData.gridY } },
            create: data,
            update: {
              label: data.label,
              employeeId: data.employeeId,
              assetId: data.assetId,
              locationId: data.locationId,
            },
          });
          results.push(upserted);
        }
      }
      return results;
    });

    await createAuditLog({
      action: "UPDATED",
      entity: "FloorMap",
      entityId: id,
      detail: `Updated ${desks.length} desk(s) on floor map "${floorMap.name}"`,
      adminId: session.user?.id,
    });

    return success(desks, `${desks.length} desk(s) saved`);
  } catch (err) {
    console.error("PUT /api/floor-map/[id]/desks error:", err);
    return error("Failed to save desks", 500);
  }
}

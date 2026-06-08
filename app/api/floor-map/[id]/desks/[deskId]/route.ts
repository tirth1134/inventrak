import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; deskId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id, deskId } = await params;

    const desk = await prisma.floorMapDesk.findUnique({ where: { id: deskId } });
    if (!desk || desk.floorMapId !== id) return error("Desk not found", 404);

    await prisma.floorMapDesk.delete({ where: { id: deskId } });

    await createAuditLog({
      action: "DELETED",
      entity: "FloorMapDesk",
      entityId: deskId,
      detail: `Removed desk at (${desk.gridX}, ${desk.gridY}) from floor map`,
      adminId: session.user?.id,
    });

    return success(null, "Desk removed successfully");
  } catch (err) {
    console.error("DELETE /api/floor-map/[id]/desks/[deskId] error:", err);
    return error("Failed to delete desk", 500);
  }
}

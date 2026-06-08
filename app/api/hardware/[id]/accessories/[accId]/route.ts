import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { updateAccessorySchema } from "@/lib/validators";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; accId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id, accId } = await params;
    const body = await request.json();
    const parsed = updateAccessorySchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const accessory = await prisma.accessory.findUnique({ where: { id: accId } });
    if (!accessory || accessory.assetId !== id) return error("Accessory not found", 404);

    const { warrantyExpiry, purchaseDate, ...rest } = parsed.data;

    const updated = await prisma.accessory.update({
      where: { id: accId },
      data: {
        ...rest,
        warrantyExpiry: warrantyExpiry !== undefined ? (warrantyExpiry ? new Date(warrantyExpiry) : null) : undefined,
        purchaseDate: purchaseDate !== undefined ? (purchaseDate ? new Date(purchaseDate) : null) : undefined,
      },
    });

    await createAuditLog({
      action: "UPDATED",
      entity: "Accessory",
      entityId: accId,
      detail: `Updated accessory "${updated.name}"`,
      adminId: session.user?.id,
    });

    return success(updated, "Accessory updated successfully");
  } catch (err) {
    console.error("PUT /api/hardware/[id]/accessories/[accId] error:", err);
    return error("Failed to update accessory", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; accId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id, accId } = await params;

    const accessory = await prisma.accessory.findUnique({ where: { id: accId } });
    if (!accessory || accessory.assetId !== id) return error("Accessory not found", 404);

    await prisma.accessory.delete({ where: { id: accId } });

    await createAuditLog({
      action: "DELETED",
      entity: "Accessory",
      entityId: accId,
      detail: `Deleted accessory "${accessory.name}"`,
      adminId: session.user?.id,
    });

    return success(null, "Accessory deleted successfully");
  } catch (err) {
    console.error("DELETE /api/hardware/[id]/accessories/[accId] error:", err);
    return error("Failed to delete accessory", 500);
  }
}

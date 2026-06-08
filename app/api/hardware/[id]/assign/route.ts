import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLogTx } from "@/lib/audit";
import { assignAssetSchema } from "@/lib/validators";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;
    const body = await request.json();
    const parsed = assignAssetSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return error("Asset not found", 404);
    if (asset.status === "SCRAPPED") return error("Cannot assign a scrapped asset", 409);

    const employee = await prisma.employee.findUnique({ where: { id: parsed.data.employeeId } });
    if (!employee) return error("Employee not found", 404);
    if (employee.status === "INACTIVE") return error("Cannot assign to an inactive employee", 409);

    const result = await prisma.$transaction(async (tx) => {
      // End current assignment
      await tx.assetAssignment.updateMany({
        where: { assetId: id, isCurrent: true },
        data: { isCurrent: false, returnedAt: new Date() },
      });

      // Create new assignment
      const assignment = await tx.assetAssignment.create({
        data: {
          assetId: id,
          employeeId: parsed.data.employeeId,
          notes: parsed.data.notes,
          isCurrent: true,
        },
        include: { employee: { select: { id: true, name: true, email: true } } },
      });

      // Update asset status
      const updatedAsset = await tx.asset.update({
        where: { id },
        data: { status: "IN_USE" },
      });

      await createAuditLogTx(tx, {
        action: "ASSIGNED",
        entity: "Asset",
        entityId: id,
        detail: `Assigned ${updatedAsset.assetId} to "${employee.name}"`,
        adminId: session.user?.id,
      });

      return assignment;
    });

    return success(result, "Asset assigned successfully", 201);
  } catch (err) {
    console.error("POST /api/hardware/[id]/assign error:", err);
    return error("Failed to assign asset", 500);
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

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return error("Asset not found", 404);

    const currentAssignment = await prisma.assetAssignment.findFirst({
      where: { assetId: id, isCurrent: true },
      include: { employee: { select: { id: true, name: true } } },
    });

    if (!currentAssignment) return error("Asset is not currently assigned", 409);

    await prisma.$transaction(async (tx) => {
      await tx.assetAssignment.update({
        where: { id: currentAssignment.id },
        data: { isCurrent: false, returnedAt: new Date() },
      });

      await tx.asset.update({ where: { id }, data: { status: "IN_STOCK" } });

      await createAuditLogTx(tx, {
        action: "UPDATED",
        entity: "Asset",
        entityId: id,
        detail: `Unassigned ${asset.assetId} from "${currentAssignment.employee.name}"`,
        adminId: session.user?.id,
      });
    });

    return success(null, "Asset unassigned successfully");
  } catch (err) {
    console.error("DELETE /api/hardware/[id]/assign error:", err);
    return error("Failed to unassign asset", 500);
  }
}

import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLogTx } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;

    const scrap = await prisma.scrapRecord.findUnique({
      where: { id },
      include: {
        asset: {
          include: { department: true, vendor: true, processor: true },
        },
      },
    });

    if (!scrap) return error("Scrap record not found", 404);

    return success({
      ...scrap,
      asset: {
        ...scrap.asset,
        purchasePrice: scrap.asset.purchasePrice ? Number(scrap.asset.purchasePrice) : null,
      },
    });
  } catch (err) {
    console.error("GET /api/scrap/[id] error:", err);
    return error("Failed to fetch scrap record", 500);
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

    const scrap = await prisma.scrapRecord.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!scrap) return error("Scrap record not found", 404);

    await prisma.$transaction(async (tx) => {
      await tx.scrapRecord.delete({ where: { id } });
      await tx.asset.update({ where: { id: scrap.assetId }, data: { status: "IN_STOCK" } });

      await createAuditLogTx(tx, {
        action: "UPDATED",
        entity: "Asset",
        entityId: scrap.assetId,
        detail: `Undid scrap for asset ${scrap.asset.assetId} — restored to IN_STOCK`,
        adminId: session.user?.id,
      });
    });

    return success(null, "Scrap undone. Asset restored to IN_STOCK.");
  } catch (err) {
    console.error("DELETE /api/scrap/[id] error:", err);
    return error("Failed to undo scrap", 500);
  }
}

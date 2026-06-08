import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { updateAssetSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        processor: true,
        vendor: true,
        department: true,
        location: true,
        assignments: {
          where: { isCurrent: true },
          include: { employee: { select: { id: true, name: true, email: true } } },
        },
        accessories: { orderBy: { createdAt: "desc" } },
        invoiceItems: {
          include: { invoice: true },
        },
        maintenanceLogs: { orderBy: { serviceDate: "desc" } },
        alerts: { where: { isDismissed: false }, orderBy: { dueDate: "asc" } },
        scrapRecord: true,
      },
    });

    if (!asset) return error("Asset not found", 404);

    return success({
      ...asset,
      purchasePrice: asset.purchasePrice ? Number(asset.purchasePrice) : null,
      maintenanceLogs: asset.maintenanceLogs.map((log) => ({
        ...log,
        cost: log.cost ? Number(log.cost) : null,
      })),
    });
  } catch (err) {
    console.error("GET /api/hardware/[id] error:", err);
    return error("Failed to fetch asset", 500);
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
    const parsed = updateAssetSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) return error("Asset not found", 404);

    const { purchaseDate, warrantyExpiry, processorId, vendorId, departmentId, locationId, ...rest } = parsed.data;

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        ...rest,
        purchaseDate: purchaseDate !== undefined ? (purchaseDate ? new Date(purchaseDate) : null) : undefined,
        warrantyExpiry: warrantyExpiry !== undefined ? (warrantyExpiry ? new Date(warrantyExpiry) : null) : undefined,
        processorId: processorId !== undefined ? processorId || null : undefined,
        vendorId: vendorId !== undefined ? vendorId || null : undefined,
        departmentId: departmentId !== undefined ? departmentId || null : undefined,
        locationId: locationId !== undefined ? locationId || null : undefined,
      },
      include: { processor: true, vendor: true, department: true, location: true },
    });

    await createAuditLog({
      action: "UPDATED",
      entity: "Asset",
      entityId: asset.id,
      detail: `Updated asset ${asset.assetId}`,
      adminId: session.user?.id,
    });

    return success({
      ...asset,
      purchasePrice: asset.purchasePrice ? Number(asset.purchasePrice) : null,
    }, "Asset updated successfully");
  } catch (err) {
    console.error("PUT /api/hardware/[id] error:", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return error("An asset with this serial number already exists", 409);
    }
    return error("Failed to update asset", 500);
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

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { _count: { select: { assignments: true } } },
    });
    if (!asset) return error("Asset not found", 404);

    if (asset.status !== "IN_STOCK") {
      return error("Only IN_STOCK assets can be deleted", 409);
    }
    if (asset._count.assignments > 0) {
      return error("Cannot delete asset with assignment history", 409);
    }

    await prisma.asset.delete({ where: { id } });

    await createAuditLog({
      action: "DELETED",
      entity: "Asset",
      entityId: id,
      detail: `Deleted asset ${asset.assetId}`,
      adminId: session.user?.id,
    });

    return success(null, "Asset deleted successfully");
  } catch (err) {
    console.error("DELETE /api/hardware/[id] error:", err);
    return error("Failed to delete asset", 500);
  }
}

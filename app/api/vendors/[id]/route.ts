import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { updateVendorSchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        assets: {
          select: { id: true, assetId: true, type: true, brand: true, model: true, status: true },
          orderBy: { createdAt: "desc" },
        },
        hardwareInvoices: { orderBy: { invoiceDate: "desc" } },
      },
    });

    if (!vendor) return error("Vendor not found", 404);

    return success({
      ...vendor,
      hardwareInvoices: vendor.hardwareInvoices.map((inv) => ({
        ...inv,
        amount: Number(inv.amount),
      })),
    });
  } catch (err) {
    console.error("GET /api/vendors/[id] error:", err);
    return error("Failed to fetch vendor", 500);
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
    const parsed = updateVendorSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) return error("Vendor not found", 404);

    const vendor = await prisma.vendor.update({ where: { id }, data: parsed.data });

    await createAuditLog({
      action: "UPDATED",
      entity: "Vendor",
      entityId: vendor.id,
      detail: `Updated vendor "${vendor.name}"`,
      adminId: session.user?.id,
    });

    return success(vendor, "Vendor updated successfully");
  } catch (err) {
    console.error("PUT /api/vendors/[id] error:", err);
    return error("Failed to update vendor", 500);
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

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: { _count: { select: { assets: true, hardwareInvoices: true } } },
    });
    if (!vendor) return error("Vendor not found", 404);

    if (vendor._count.assets > 0 || vendor._count.hardwareInvoices > 0) {
      return error(
        `Cannot delete vendor linked to ${vendor._count.assets} asset(s) and ${vendor._count.hardwareInvoices} invoice(s)`,
        409
      );
    }

    await prisma.vendor.delete({ where: { id } });

    await createAuditLog({
      action: "DELETED",
      entity: "Vendor",
      entityId: id,
      detail: `Deleted vendor "${vendor.name}"`,
      adminId: session.user?.id,
    });

    return success(null, "Vendor deleted successfully");
  } catch (err) {
    console.error("DELETE /api/vendors/[id] error:", err);
    return error("Failed to delete vendor", 500);
  }
}

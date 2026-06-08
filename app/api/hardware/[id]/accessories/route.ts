import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { createAccessorySchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return error("Asset not found", 404);

    const accessories = await prisma.accessory.findMany({
      where: { assetId: id },
      orderBy: { createdAt: "desc" },
    });

    return success(accessories);
  } catch (err) {
    console.error("GET /api/hardware/[id]/accessories error:", err);
    return error("Failed to fetch accessories", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;
    const body = await request.json();
    const parsed = createAccessorySchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return error("Asset not found", 404);

    const accessory = await prisma.accessory.create({
      data: {
        assetId: id,
        name: parsed.data.name,
        brand: parsed.data.brand,
        serialNumber: parsed.data.serialNumber,
        warrantyExpiry: parsed.data.warrantyExpiry ? new Date(parsed.data.warrantyExpiry) : null,
        purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : null,
        status: parsed.data.status || "IN_USE",
      },
    });

    await createAuditLog({
      action: "CREATED",
      entity: "Accessory",
      entityId: accessory.id,
      detail: `Added accessory "${accessory.name}" to asset ${asset.assetId}`,
      adminId: session.user?.id,
    });

    return success(accessory, "Accessory added successfully", 201);
  } catch (err) {
    console.error("POST /api/hardware/[id]/accessories error:", err);
    return error("Failed to add accessory", 500);
  }
}

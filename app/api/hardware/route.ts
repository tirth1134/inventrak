import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, paginated, error, parsePagination } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { createAssetSchema } from "@/lib/validators";
import { generateAssetId } from "@/lib/asset-id";
import { Prisma } from "@prisma/client";

/**
 * GET /api/hardware
 * List assets with filters and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const departmentId = searchParams.get("departmentId");
    const locationId = searchParams.get("locationId");
    const processorGrade = searchParams.get("processorGrade");
    const search = searchParams.get("search");

    const where: Prisma.AssetWhereInput = {};

    if (status) {
      where.status = status as Prisma.EnumAssetStatusFilter["equals"];
    }
    if (type) {
      where.type = type as Prisma.EnumAssetTypeFilter["equals"];
    }
    if (departmentId) {
      where.departmentId = departmentId;
    }
    if (locationId) {
      where.locationId = locationId;
    }
    if (processorGrade) {
      where.processor = {
        grade: processorGrade as Prisma.EnumProcessorGradeFilter["equals"],
      };
    }
    if (search) {
      where.OR = [
        { assetId: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { serialNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          processor: true,
          vendor: true,
          department: true,
          location: true,
          assignments: {
            where: { isCurrent: true },
            include: { employee: { select: { id: true, name: true, email: true } } },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.asset.count({ where }),
    ]);

    return paginated(assets, total, page, limit);
  } catch (err) {
    console.error("GET /api/hardware error:", err);
    return error("Failed to fetch assets", 500);
  }
}

/**
 * POST /api/hardware
 * Create a new asset with auto-generated assetId.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const body = await request.json();
    const parsed = createAssetSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;
    const assetId = await generateAssetId();

    const asset = await prisma.asset.create({
      data: {
        assetId,
        type: data.type,
        brand: data.brand,
        model: data.model,
        serialNumber: data.serialNumber || null,
        osType: data.osType,
        processorId: data.processorId || null,
        ramGb: data.ramGb,
        storageGb: data.storageGb,
        storageType: data.storageType,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        purchasePrice: data.purchasePrice,
        currency: data.currency,
        vendorId: data.vendorId || null,
        warrantyExpiry: data.warrantyExpiry
          ? new Date(data.warrantyExpiry)
          : null,
        departmentId: data.departmentId || null,
        locationId: data.locationId || null,
        status: data.status || "IN_STOCK",
        remarks: data.remarks,
      },
      include: {
        processor: true,
        vendor: true,
        department: true,
        location: true,
      },
    });

    // Create WARRANTY_EXPIRY alert if warrantyExpiry is provided
    if (data.warrantyExpiry) {
      try {
        await prisma.alert.create({
          data: {
            type: "WARRANTY_EXPIRY",
            title: `Warranty expiring for ${asset.assetId}`,
            message: `Warranty for ${asset.brand || ""} ${asset.model || ""} (${asset.assetId}) expires on ${new Date(data.warrantyExpiry).toISOString().split("T")[0]}.`,
            dueDate: new Date(data.warrantyExpiry),
            assetId: asset.id,
          },
        });
      } catch (alertErr) {
        console.error("Failed to create warranty alert:", alertErr);
      }
    }

    await createAuditLog({
      action: "CREATED",
      entity: "Asset",
      entityId: asset.id,
      detail: `Created asset ${asset.assetId} (${asset.type})`,
      adminId: session.user?.id,
    });

    return success(asset, "Asset created successfully", 201);
  } catch (err) {
    console.error("POST /api/hardware error:", err);
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return error("An asset with this serial number already exists", 409);
    }
    return error("Failed to create asset", 500);
  }
}

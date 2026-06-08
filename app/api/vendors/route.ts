import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, paginated, error, parsePagination } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { createVendorSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const type = searchParams.get("type");
    const search = searchParams.get("search");

    const where: Prisma.VendorWhereInput = {};
    if (type) where.type = type as Prisma.EnumVendorTypeFilter["equals"];
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contactPerson: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: { _count: { select: { assets: true, hardwareInvoices: true } } },
      }),
      prisma.vendor.count({ where }),
    ]);

    return paginated(vendors, total, page, limit);
  } catch (err) {
    console.error("GET /api/vendors error:", err);
    return error("Failed to fetch vendors", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const body = await request.json();
    const parsed = createVendorSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const vendor = await prisma.vendor.create({ data: parsed.data });

    await createAuditLog({
      action: "CREATED",
      entity: "Vendor",
      entityId: vendor.id,
      detail: `Created vendor "${vendor.name}"`,
      adminId: session.user?.id,
    });

    return success(vendor, "Vendor created successfully", 201);
  } catch (err) {
    console.error("POST /api/vendors error:", err);
    return error("Failed to create vendor", 500);
  }
}

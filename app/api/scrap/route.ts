import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, paginated, error, parsePagination } from "@/lib/api-response";
import { createAuditLogTx } from "@/lib/audit";
import { createScrapSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const [scraps, total] = await Promise.all([
      prisma.scrapRecord.findMany({
        skip,
        take: limit,
        orderBy: { scrappedAt: "desc" },
        include: {
          asset: {
            include: { department: true, vendor: true },
          },
        },
      }),
      prisma.scrapRecord.count(),
    ]);

    return paginated(
      scraps.map((s) => ({
        ...s,
        asset: {
          ...s.asset,
          purchasePrice: s.asset.purchasePrice ? Number(s.asset.purchasePrice) : null,
        },
      })),
      total,
      page,
      limit
    );
  } catch (err) {
    console.error("GET /api/scrap error:", err);
    return error("Failed to fetch scrap records", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const body = await request.json();
    const parsed = createScrapSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const asset = await prisma.asset.findUnique({ where: { id: parsed.data.assetId } });
    if (!asset) return error("Asset not found", 404);
    if (asset.status === "SCRAPPED") return error("Asset is already scrapped", 409);

    const scrapRecord = await prisma.$transaction(async (tx) => {
      // End active assignment
      await tx.assetAssignment.updateMany({
        where: { assetId: asset.id, isCurrent: true },
        data: { isCurrent: false, returnedAt: new Date() },
      });

      // Set asset status to SCRAPPED
      await tx.asset.update({ where: { id: asset.id }, data: { status: "SCRAPPED" } });

      // Create scrap record
      const record = await tx.scrapRecord.create({
        data: {
          assetId: asset.id,
          reason: parsed.data.reason,
          disposalMethod: parsed.data.disposalMethod,
          notes: parsed.data.notes,
        },
        include: { asset: true },
      });

      await createAuditLogTx(tx, {
        action: "SCRAPPED",
        entity: "Asset",
        entityId: asset.id,
        detail: `Scrapped asset ${asset.assetId}. Reason: ${parsed.data.reason || "N/A"}`,
        adminId: session.user?.id,
      });

      return record;
    });

    return success({
      ...scrapRecord,
      asset: {
        ...scrapRecord.asset,
        purchasePrice: scrapRecord.asset.purchasePrice ? Number(scrapRecord.asset.purchasePrice) : null,
      },
    }, "Asset scrapped successfully", 201);
  } catch (err) {
    console.error("POST /api/scrap error:", err);
    return error("Failed to scrap asset", 500);
  }
}

import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { createFloorMapSchema } from "@/lib/validators";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const floorMaps = await prisma.floorMap.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { desks: true } } },
    });

    return success(floorMaps);
  } catch (err) {
    console.error("GET /api/floor-map error:", err);
    return error("Failed to fetch floor maps", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const body = await request.json();
    const parsed = createFloorMapSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const floorMap = await prisma.floorMap.create({ data: parsed.data });

    await createAuditLog({
      action: "CREATED",
      entity: "FloorMap",
      entityId: floorMap.id,
      detail: `Created floor map "${floorMap.name}"`,
      adminId: session.user?.id,
    });

    return success(floorMap, "Floor map created successfully", 201);
  } catch (err) {
    console.error("POST /api/floor-map error:", err);
    return error("Failed to create floor map", 500);
  }
}

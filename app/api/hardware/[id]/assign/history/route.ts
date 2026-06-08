import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";

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

    const history = await prisma.assetAssignment.findMany({
      where: { assetId: id },
      include: {
        employee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { assignedAt: "desc" },
    });

    return success(history);
  } catch (err) {
    console.error("GET /api/hardware/[id]/assign/history error:", err);
    return error("Failed to fetch assignment history", 500);
  }
}

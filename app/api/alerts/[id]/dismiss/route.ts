import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;

    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) return error("Alert not found", 404);
    if (alert.isDismissed) return error("Alert is already dismissed", 400);

    const updated = await prisma.alert.update({
      where: { id },
      data: { isDismissed: true },
    });

    return success(updated, "Alert dismissed");
  } catch (err) {
    console.error("PUT /api/alerts/[id]/dismiss error:", err);
    return error("Failed to dismiss alert", 500);
  }
}

import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id, userId } = await params;

    const subscriptionUser = await prisma.subscriptionUser.findUnique({
      where: { id: userId },
      include: {
        subscription: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
    });

    if (!subscriptionUser || subscriptionUser.subscriptionId !== id) {
      return error("Subscription user not found", 404);
    }

    await prisma.subscriptionUser.delete({ where: { id: userId } });

    await createAuditLog({
      action: "UPDATED",
      entity: "Subscription",
      entityId: id,
      detail: `Removed employee "${subscriptionUser.employee.name}" from subscription "${subscriptionUser.subscription.name}"`,
      adminId: session.user?.id,
    });

    return success(null, "Employee removed from subscription");
  } catch (err) {
    console.error("DELETE /api/subscriptions/[id]/users/[userId] error:", err);
    return error("Failed to remove employee from subscription", 500);
  }
}

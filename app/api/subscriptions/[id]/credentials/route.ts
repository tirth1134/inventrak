import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { decrypt } from "@/lib/crypto";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      select: { id: true, name: true, usernameEncrypted: true, passwordEncrypted: true },
    });

    if (!subscription) return error("Subscription not found", 404);

    return success({
      username: subscription.usernameEncrypted ? decrypt(subscription.usernameEncrypted) : null,
      password: subscription.passwordEncrypted ? decrypt(subscription.passwordEncrypted) : null,
    });
  } catch (err) {
    console.error("GET /api/subscriptions/[id]/credentials error:", err);
    return error("Failed to retrieve credentials", 500);
  }
}

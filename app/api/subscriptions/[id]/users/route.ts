import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { assignSubscriptionUserSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;

    const subscription = await prisma.subscription.findUnique({ where: { id } });
    if (!subscription) return error("Subscription not found", 404);

    const users = await prisma.subscriptionUser.findMany({
      where: { subscriptionId: id },
      include: {
        employee: { select: { id: true, name: true, email: true, department: { select: { id: true, name: true } } } },
      },
      orderBy: { assignedAt: "desc" },
    });

    return success(users);
  } catch (err) {
    console.error("GET /api/subscriptions/[id]/users error:", err);
    return error("Failed to fetch subscription users", 500);
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
    const parsed = assignSubscriptionUserSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const subscription = await prisma.subscription.findUnique({ where: { id } });
    if (!subscription) return error("Subscription not found", 404);

    const employee = await prisma.employee.findUnique({ where: { id: parsed.data.employeeId } });
    if (!employee) return error("Employee not found", 404);

    const subscriptionUser = await prisma.subscriptionUser.create({
      data: {
        subscriptionId: id,
        employeeId: parsed.data.employeeId,
        username: parsed.data.username,
      },
      include: {
        employee: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog({
      action: "ASSIGNED",
      entity: "Subscription",
      entityId: id,
      detail: `Assigned employee "${employee.name}" to subscription "${subscription.name}"`,
      adminId: session.user?.id,
    });

    return success(subscriptionUser, "Employee assigned to subscription", 201);
  } catch (err) {
    console.error("POST /api/subscriptions/[id]/users error:", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return error("Employee is already assigned to this subscription", 409);
    }
    return error("Failed to assign employee", 500);
  }
}

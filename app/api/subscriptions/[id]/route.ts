import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { updateSubscriptionSchema } from "@/lib/validators";
import { encrypt } from "@/lib/crypto";
import { Prisma } from "@prisma/client";

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
      include: {
        department: { select: { id: true, name: true } },
        users: {
          include: {
            employee: { select: { id: true, name: true, email: true } },
          },
          orderBy: { assignedAt: "desc" },
        },
        invoices: { orderBy: { invoiceDate: "desc" } },
        alerts: { where: { isDismissed: false }, orderBy: { dueDate: "asc" } },
      },
    });

    if (!subscription) return error("Subscription not found", 404);

    const { usernameEncrypted, passwordEncrypted, ...rest } = subscription;
    void usernameEncrypted;
    void passwordEncrypted;

    const price = Number(rest.price);
    return success({
      ...rest,
      price,
      costPerUser: rest.licenceCount > 0 ? Math.round((price / rest.licenceCount) * 100) / 100 : price,
      invoices: rest.invoices.map((inv) => ({ ...inv, amount: Number(inv.amount) })),
    });
  } catch (err) {
    console.error("GET /api/subscriptions/[id] error:", err);
    return error("Failed to fetch subscription", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing) return error("Subscription not found", 404);

    const { username, password, buyDate, renewalDate, nextPaymentDate, departmentId, status, ...rest } = parsed.data;

    const updateData: Prisma.SubscriptionUpdateInput = {
      ...rest,
      buyDate: buyDate !== undefined ? (buyDate ? new Date(buyDate) : null) : undefined,
      renewalDate: renewalDate !== undefined ? (renewalDate ? new Date(renewalDate) : null) : undefined,
      nextPaymentDate: nextPaymentDate !== undefined ? (nextPaymentDate ? new Date(nextPaymentDate) : null) : undefined,
    };

    if (username !== undefined) {
      updateData.usernameEncrypted = username ? encrypt(username) : null;
    }
    if (password !== undefined) {
      updateData.passwordEncrypted = password ? encrypt(password) : null;
    }
    if (departmentId !== undefined) {
      updateData.department = departmentId ? { connect: { id: departmentId } } : { disconnect: true };
    }
    if (status !== undefined) {
      updateData.status = status;
      if (status === "CANCELLED" && existing.status !== "CANCELLED") {
        updateData.cancelledAt = new Date();
      }
    }

    const subscription = await prisma.subscription.update({
      where: { id },
      data: updateData,
      include: { department: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      action: "UPDATED",
      entity: "Subscription",
      entityId: subscription.id,
      detail: `Updated subscription "${subscription.name}"`,
      adminId: session.user?.id,
    });

    const { usernameEncrypted, passwordEncrypted, ...responseData } = subscription;
    void usernameEncrypted;
    void passwordEncrypted;

    return success({
      ...responseData,
      price: Number(responseData.price),
    }, "Subscription updated successfully");
  } catch (err) {
    console.error("PUT /api/subscriptions/[id] error:", err);
    return error("Failed to update subscription", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;

    const subscription = await prisma.subscription.findUnique({ where: { id } });
    if (!subscription) return error("Subscription not found", 404);

    await prisma.subscription.delete({ where: { id } });

    await createAuditLog({
      action: "DELETED",
      entity: "Subscription",
      entityId: id,
      detail: `Deleted subscription "${subscription.name}"`,
      adminId: session.user?.id,
    });

    return success(null, "Subscription deleted successfully");
  } catch (err) {
    console.error("DELETE /api/subscriptions/[id] error:", err);
    return error("Failed to delete subscription", 500);
  }
}

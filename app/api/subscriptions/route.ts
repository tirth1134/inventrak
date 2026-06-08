import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { success, paginated, error, parsePagination } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { createSubscriptionSchema } from "@/lib/validators";
import { encrypt } from "@/lib/crypto";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return error("Unauthorized", 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get("status");
    const departmentId = searchParams.get("departmentId");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const where: Prisma.SubscriptionWhereInput = {};

    if (status) {
      where.status = status as Prisma.EnumSubscriptionStatusFilter["equals"];
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { planName: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          department: { select: { id: true, name: true } },
          _count: { select: { users: true, invoices: true } },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    const data = subscriptions.map((sub) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { usernameEncrypted, passwordEncrypted, ...rest } = sub;
      const price = Number(rest.price);
      const costPerUser =
        rest.licenceCount > 0
          ? Math.round((price / rest.licenceCount) * 100) / 100
          : price;

      return {
        ...rest,
        price,
        costPerUser,
      };
    });

    return paginated(data, total, page, limit);
  } catch (err) {
    console.error("GET /api/subscriptions error:", err);
    return error("Failed to fetch subscriptions", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return error("Unauthorized", 401);
    }

    const body = await request.json();
    const parsed = createSubscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const {
      username,
      password,
      buyDate,
      renewalDate,
      nextPaymentDate,
      ...rest
    } = parsed.data;

    const subscriptionData: Prisma.SubscriptionCreateInput = {
      ...rest,
      buyDate: buyDate ? new Date(buyDate) : undefined,
      renewalDate: renewalDate ? new Date(renewalDate) : undefined,
      nextPaymentDate: nextPaymentDate ? new Date(nextPaymentDate) : undefined,
      usernameEncrypted: username ? encrypt(username) : undefined,
      passwordEncrypted: password ? encrypt(password) : undefined,
      ...(rest.departmentId
        ? { department: { connect: { id: rest.departmentId } } }
        : {}),
    };

    // Remove raw departmentId since we use the relation connect syntax
    delete (subscriptionData as Record<string, unknown>).departmentId;

    const subscription = await prisma.$transaction(async (tx) => {
      const created = await tx.subscription.create({
        data: subscriptionData,
        include: {
          department: { select: { id: true, name: true } },
        },
      });

      // Auto-create renewal alert if renewalDate is provided
      if (renewalDate) {
        await tx.alert.create({
          data: {
            type: "SUBSCRIPTION_RENEWAL",
            title: `Renewal: ${created.name}`,
            message: `Subscription "${created.name}" is due for renewal on ${new Date(renewalDate).toISOString().split("T")[0]}.`,
            dueDate: new Date(renewalDate),
            subscriptionId: created.id,
          },
        });
      }

      return created;
    });

    await createAuditLog({
      action: "CREATED",
      entity: "Subscription",
      entityId: subscription.id,
      detail: `Created subscription "${subscription.name}"`,
      adminId: session.user?.id,
    });

    // Exclude encrypted credentials from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { usernameEncrypted, passwordEncrypted, ...responseData } =
      subscription;

    return success(
      {
        ...responseData,
        price: Number(responseData.price),
        costPerUser:
          responseData.licenceCount > 0
            ? Math.round(
                (Number(responseData.price) / responseData.licenceCount) * 100
              ) / 100
            : Number(responseData.price),
      },
      "Subscription created successfully",
      201
    );
  } catch (err) {
    console.error("POST /api/subscriptions error:", err);
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return error("A subscription with these details already exists", 409);
    }
    return error("Failed to create subscription", 500);
  }
}

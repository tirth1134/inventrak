import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { createDepartmentSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { employees: true, subscriptions: true, assets: true } },
      },
    });

    return success(departments);
  } catch (err) {
    console.error("GET /api/departments error:", err);
    return error("Failed to fetch departments", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const body = await request.json();
    const parsed = createDepartmentSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const department = await prisma.department.create({
      data: { name: parsed.data.name },
    });

    await createAuditLog({
      action: "CREATED",
      entity: "Department",
      entityId: department.id,
      detail: `Created department "${department.name}"`,
      adminId: session.user?.id,
    });

    return success(department, "Department created successfully", 201);
  } catch (err) {
    console.error("POST /api/departments error:", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return error("A department with this name already exists", 409);
    }
    return error("Failed to create department", 500);
  }
}

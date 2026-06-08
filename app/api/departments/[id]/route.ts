import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { updateDepartmentSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: { select: { employees: true, subscriptions: true, assets: true } },
      },
    });

    if (!department) return error("Department not found", 404);
    return success(department);
  } catch (err) {
    console.error("GET /api/departments/[id] error:", err);
    return error("Failed to fetch department", 500);
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
    const parsed = updateDepartmentSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) return error("Department not found", 404);

    const department = await prisma.department.update({
      where: { id },
      data: parsed.data,
    });

    await createAuditLog({
      action: "UPDATED",
      entity: "Department",
      entityId: department.id,
      detail: `Updated department "${department.name}"`,
      adminId: session.user?.id,
    });

    return success(department, "Department updated successfully");
  } catch (err) {
    console.error("PUT /api/departments/[id] error:", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return error("A department with this name already exists", 409);
    }
    return error("Failed to update department", 500);
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

    const department = await prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });
    if (!department) return error("Department not found", 404);

    if (department._count.employees > 0) {
      return error(
        `Cannot delete department with ${department._count.employees} employee(s). Reassign them first.`,
        409
      );
    }

    await prisma.department.delete({ where: { id } });

    await createAuditLog({
      action: "DELETED",
      entity: "Department",
      entityId: id,
      detail: `Deleted department "${department.name}"`,
      adminId: session.user?.id,
    });

    return success(null, "Department deleted successfully");
  } catch (err) {
    console.error("DELETE /api/departments/[id] error:", err);
    return error("Failed to delete department", 500);
  }
}

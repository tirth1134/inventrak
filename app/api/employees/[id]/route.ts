import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog, createAuditLogTx } from "@/lib/audit";
import { updateEmployeeSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return error("Unauthorized", 401);
    }

    const { id } = await params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, title: true } },
        assetAssignments: {
          where: { isCurrent: true },
          include: {
            asset: {
              select: {
                id: true,
                assetId: true,
                type: true,
                brand: true,
                model: true,
                status: true,
              },
            },
          },
          orderBy: { assignedAt: "desc" },
        },
        subscriptionUsers: {
          include: {
            subscription: {
              select: {
                id: true,
                name: true,
                category: true,
                status: true,
                billingCycle: true,
                price: true,
              },
            },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
    });

    if (!employee) {
      return error("Employee not found", 404);
    }

    return success(employee);
  } catch (err) {
    console.error("Employee GET error:", err);
    return error("Failed to fetch employee", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return error("Unauthorized", 401);
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return error("Employee not found", 404);
    }

    // Verify department if being updated
    if (parsed.data.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: parsed.data.departmentId },
      });
      if (!department) {
        return error("Department not found", 404);
      }
    }

    // Verify designation if being updated
    if (parsed.data.designationId) {
      const designation = await prisma.designation.findUnique({
        where: { id: parsed.data.designationId },
      });
      if (!designation) {
        return error("Designation not found", 404);
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: parsed.data,
      include: {
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, title: true } },
      },
    });

    await createAuditLog({
      action: "UPDATED",
      entity: "Employee",
      entityId: employee.id,
      detail: `Updated employee "${employee.name}"`,
      adminId: session.user?.id,
    });

    return success(employee, "Employee updated successfully");
  } catch (err) {
    console.error("Employee PUT error:", err);
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return error("An employee with this email already exists", 409);
    }
    return error("Failed to update employee", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return error("Unauthorized", 401);
    }

    const { id } = await params;

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return error("Employee not found", 404);
    }

    // Hard delete: clean up relations first, then delete employee record
    const result = await prisma.$transaction(async (tx) => {
      // Find all current assignments for the employee
      const currentAssignments = await tx.assetAssignment.findMany({
        where: { employeeId: id, isCurrent: true },
      });

      // Update assets status back to IN_STOCK if they were IN_USE
      if (currentAssignments.length > 0) {
        const assetIds = currentAssignments.map((a) => a.assetId);
        await tx.asset.updateMany({
          where: { id: { in: assetIds }, status: "IN_USE" },
          data: { status: "IN_STOCK" },
        });
      }

      // Delete all asset assignments for this employee
      const deletedAssignments = await tx.assetAssignment.deleteMany({
        where: { employeeId: id },
      });

      // Delete all subscription users for this employee
      const deletedSubscriptions = await tx.subscriptionUser.deleteMany({
        where: { employeeId: id },
      });

      // Nullify references in FloorMapDesk
      await tx.floorMapDesk.updateMany({
        where: { employeeId: id },
        data: { employeeId: null },
      });

      // Nullify references in AuditLog
      await tx.auditLog.updateMany({
        where: { employeeId: id },
        data: { employeeId: null },
      });

      // Nullify teamLead references in Subscription
      await tx.subscription.updateMany({
        where: { teamLeadId: id },
        data: { teamLeadId: null, teamLeadName: null },
      });

      // Delete the employee
      const employee = await tx.employee.delete({
        where: { id },
      });

      await createAuditLogTx(tx, {
        action: "DELETED",
        entity: "Employee",
        entityId: id,
        detail: `Permanently deleted employee "${employee.name}" — deleted ${deletedAssignments.count} assignment(s) and ${deletedSubscriptions.count} subscription(s)`,
        adminId: session.user?.id,
      });

      return {
        employee,
        deletedAssignments: deletedAssignments.count,
        deletedSubscriptions: deletedSubscriptions.count,
      };
    });

    return success(result, "Employee deleted successfully");
  } catch (err) {
    console.error("Employee DELETE error:", err);
    return error("Failed to delete employee", 500);
  }
}

import prisma from "@/lib/prisma";

interface AuditLogParams {
  action: string; // "CREATED", "UPDATED", "DELETED", "ASSIGNED", "SCRAPPED"
  entity: string; // "Asset", "Subscription", "Employee", etc.
  entityId: string;
  detail?: string;
  adminId?: string;
  employeeId?: string;
}

/**
 * Create an audit log entry.
 * Call this after every create/update/delete operation.
 */
export async function createAuditLog(params: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        detail: params.detail,
        adminId: params.adminId,
        employeeId: params.employeeId,
      },
    });
  } catch (err) {
    // Audit logging should never break the main operation
    console.error("Failed to create audit log:", err);
  }
}

/**
 * Create audit log within a Prisma transaction
 */
export function createAuditLogTx(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: AuditLogParams
) {
  return tx.auditLog.create({
    data: {
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      detail: params.detail,
      adminId: params.adminId,
      employeeId: params.employeeId,
    },
  });
}

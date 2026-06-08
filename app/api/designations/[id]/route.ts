import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { updateDesignationSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;
    const body = await request.json();
    const parsed = updateDesignationSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const existing = await prisma.designation.findUnique({ where: { id } });
    if (!existing) return error("Designation not found", 404);

    const designation = await prisma.designation.update({
      where: { id },
      data: parsed.data,
    });

    await createAuditLog({
      action: "UPDATED",
      entity: "Designation",
      entityId: designation.id,
      detail: `Updated designation "${designation.title}"`,
      adminId: session.user?.id,
    });

    return success(designation, "Designation updated successfully");
  } catch (err) {
    console.error("PUT /api/designations/[id] error:", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return error("A designation with this title already exists", 409);
    }
    return error("Failed to update designation", 500);
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

    const designation = await prisma.designation.findUnique({ where: { id } });
    if (!designation) return error("Designation not found", 404);

    await prisma.designation.delete({ where: { id } });

    await createAuditLog({
      action: "DELETED",
      entity: "Designation",
      entityId: id,
      detail: `Deleted designation "${designation.title}"`,
      adminId: session.user?.id,
    });

    return success(null, "Designation deleted successfully");
  } catch (err) {
    console.error("DELETE /api/designations/[id] error:", err);
    return error("Failed to delete designation", 500);
  }
}

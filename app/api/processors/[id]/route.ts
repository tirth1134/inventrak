import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { updateProcessorSchema } from "@/lib/validators";
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
    const parsed = updateProcessorSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const existing = await prisma.processor.findUnique({ where: { id } });
    if (!existing) return error("Processor not found", 404);

    const processor = await prisma.processor.update({ where: { id }, data: parsed.data });

    await createAuditLog({
      action: "UPDATED",
      entity: "Processor",
      entityId: processor.id,
      detail: `Updated processor "${processor.name}"`,
      adminId: session.user?.id,
    });

    return success(processor, "Processor updated successfully");
  } catch (err) {
    console.error("PUT /api/processors/[id] error:", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return error("A processor with this name already exists", 409);
    }
    return error("Failed to update processor", 500);
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

    const processor = await prisma.processor.findUnique({
      where: { id },
      include: { _count: { select: { assets: true } } },
    });
    if (!processor) return error("Processor not found", 404);

    if (processor._count.assets > 0) {
      return error(`Cannot delete processor used by ${processor._count.assets} asset(s)`, 409);
    }

    await prisma.processor.delete({ where: { id } });

    await createAuditLog({
      action: "DELETED",
      entity: "Processor",
      entityId: id,
      detail: `Deleted processor "${processor.name}"`,
      adminId: session.user?.id,
    });

    return success(null, "Processor deleted successfully");
  } catch (err) {
    console.error("DELETE /api/processors/[id] error:", err);
    return error("Failed to delete processor", 500);
  }
}

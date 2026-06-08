import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { createDesignationSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const designations = await prisma.designation.findMany({
      orderBy: { title: "asc" },
      include: { _count: { select: { employees: true } } },
    });

    return success(designations);
  } catch (err) {
    console.error("GET /api/designations error:", err);
    return error("Failed to fetch designations", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const body = await request.json();
    const parsed = createDesignationSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const designation = await prisma.designation.create({
      data: { title: parsed.data.title },
    });

    await createAuditLog({
      action: "CREATED",
      entity: "Designation",
      entityId: designation.id,
      detail: `Created designation "${designation.title}"`,
      adminId: session.user?.id,
    });

    return success(designation, "Designation created successfully", 201);
  } catch (err) {
    console.error("POST /api/designations error:", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return error("A designation with this title already exists", 409);
    }
    return error("Failed to create designation", 500);
  }
}

import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { createProcessorSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const grade = request.nextUrl.searchParams.get("grade");

    const where: Prisma.ProcessorWhereInput = {};
    if (grade) where.grade = grade as Prisma.EnumProcessorGradeFilter["equals"];

    const processors = await prisma.processor.findMany({
      where,
      orderBy: { name: "asc" },
      include: { _count: { select: { assets: true } } },
    });

    return success(processors);
  } catch (err) {
    console.error("GET /api/processors error:", err);
    return error("Failed to fetch processors", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const body = await request.json();
    const parsed = createProcessorSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const processor = await prisma.processor.create({ data: parsed.data });

    await createAuditLog({
      action: "CREATED",
      entity: "Processor",
      entityId: processor.id,
      detail: `Created processor "${processor.name}"`,
      adminId: session.user?.id,
    });

    return success(processor, "Processor created successfully", 201);
  } catch (err) {
    console.error("POST /api/processors error:", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return error("A processor with this name already exists", 409);
    }
    return error("Failed to create processor", 500);
  }
}

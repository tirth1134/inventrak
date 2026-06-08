import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, paginated, error, parsePagination } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { createEmployeeSchema } from "@/lib/validators";
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
    const search = searchParams.get("search");

    const where: Prisma.EmployeeWhereInput = {};

    if (status === "ACTIVE" || status === "INACTIVE") {
      where.status = status;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          department: { select: { id: true, name: true } },
          designation: { select: { id: true, title: true } },
          assetAssignments: {
            where: { isCurrent: true, asset: { type: { in: ["LAPTOP", "DESKTOP"] } } },
            include: { asset: { include: { processor: true } } },
            take: 1
          },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return paginated(employees, total, page, limit);
  } catch (err) {
    console.error("Employees GET error:", err);
    return error("Failed to fetch employees", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return error("Unauthorized", 401);
    }

    const body = await request.json();
    const parsed = createEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const { name, email, phone, departmentId, designationId, isTeamLead, status } =
      parsed.data;

    // Verify department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });
    if (!department) {
      return error("Department not found", 404);
    }

    // Verify designation exists if provided
    if (designationId) {
      const designation = await prisma.designation.findUnique({
        where: { id: designationId },
      });
      if (!designation) {
        return error("Designation not found", 404);
      }
    }

    // Check for duplicate email
    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) {
      return error("An employee with this email already exists", 409);
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        phone,
        departmentId,
        designationId,
        isTeamLead,
        status,
      },
      include: {
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, title: true } },
      },
    });

    await createAuditLog({
      action: "CREATED",
      entity: "Employee",
      entityId: employee.id,
      detail: `Created employee "${employee.name}" (${employee.email})`,
      adminId: session.user?.id,
    });

    return success(employee, "Employee created successfully", 201);
  } catch (err) {
    console.error("Employees POST error:", err);
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return error("An employee with this email already exists", 409);
    }
    return error("Failed to create employee", 500);
  }
}

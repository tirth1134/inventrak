import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { changeEmailSchema } from "@/lib/validators";
import bcrypt from "bcryptjs";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const body = await request.json();
    const parsed = changeEmailSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const admin = await prisma.admin.findFirst();
    if (!admin) return error("Admin not found", 404);

    const isValid = await bcrypt.compare(parsed.data.currentPassword, admin.password);
    if (!isValid) return error("Current password is incorrect", 401);

    await prisma.admin.update({
      where: { id: admin.id },
      data: { email: parsed.data.newEmail },
    });

    return success(null, "Email updated successfully. You will need to login with your new email on next session.");
  } catch (err) {
    console.error("PUT /api/settings/email error:", err);
    return error("Failed to update email", 500);
  }
}

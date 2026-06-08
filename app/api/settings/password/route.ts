import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { changePasswordSchema } from "@/lib/validators";
import bcrypt from "bcryptjs";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    const admin = await prisma.admin.findFirst();
    if (!admin) return error("Admin not found", 404);

    const isValid = await bcrypt.compare(parsed.data.currentPassword, admin.password);
    if (!isValid) return error("Current password is incorrect", 401);

    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: newHash },
    });

    return success(null, "Password updated successfully");
  } catch (err) {
    console.error("PUT /api/settings/password error:", err);
    return error("Failed to update password", 500);
  }
}

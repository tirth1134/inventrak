import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { updateSettingsSchema } from "@/lib/validators";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const settings = await prisma.setting.findMany();

    const settingsMap = settings.reduce(
      (acc, setting) => {
        // Never expose SMTP password in plain GET
        if (setting.key === "smtp_pass") {
          acc[setting.key] = setting.value ? "••••••••" : "";
        } else {
          acc[setting.key] = setting.value;
        }
        return acc;
      },
      {} as Record<string, string>
    );

    return success(settingsMap);
  } catch (err) {
    console.error("GET /api/settings error:", err);
    return error("Failed to fetch settings", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const body = await request.json();

    // Intercept test email request
    if (body.test_email === "true") {
      const targetEmail = body.test_email_address || session.user?.email;
      if (!targetEmail) {
        return error("No email associated with the current session and no custom email provided", 400);
      }
      
      const { sendTestEmail } = await import("@/lib/mailer");
      try {
        await sendTestEmail(targetEmail);
        return success(null, "Test email sent successfully");
      } catch (e: any) {
        return error("Failed to send test email: " + e.message, 500);
      }
    }

    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
    }

    await Promise.all(
      Object.entries(parsed.data).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );

    return success(null, "Settings updated successfully");
  } catch (err) {
    console.error("PUT /api/settings error:", err);
    return error("Failed to update settings", 500);
  }
}

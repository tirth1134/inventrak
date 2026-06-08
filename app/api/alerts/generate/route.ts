import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { generateAlerts, sendPendingAlertEmails } from "@/lib/alerts";

export async function POST(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const alertsCreated = await generateAlerts();
    const emailsSent = await sendPendingAlertEmails();

    return success(
      { alertsCreated, emailsSent },
      `Generated ${alertsCreated} alert(s), sent ${emailsSent} email(s)`
    );
  } catch (err) {
    console.error("POST /api/alerts/generate error:", err);
    return error("Failed to generate alerts", 500);
  }
}

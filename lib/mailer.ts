import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";
import type { Alert } from "@prisma/client";

/**
 * Get SMTP configuration from DB settings (with .env fallback).
 */
async function getSmtpConfig() {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "smtp_host",
          "smtp_port",
          "smtp_user",
          "smtp_pass",
          "smtp_from",
        ],
      },
    },
  });

  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  return {
    host: settingsMap["smtp_host"] || process.env.SMTP_HOST || "",
    port: parseInt(settingsMap["smtp_port"] || process.env.SMTP_PORT || "587", 10),
    user: settingsMap["smtp_user"] || process.env.SMTP_USER || "",
    pass: settingsMap["smtp_pass"] || process.env.SMTP_PASS || "",
    from: settingsMap["smtp_from"] || process.env.SMTP_FROM || "",
  };
}

/**
 * Create a Nodemailer transporter using current SMTP settings.
 * Settings are fetched fresh each time so changes take effect immediately.
 */
async function createTransporter() {
  const config = await getSmtpConfig();

  if (!config.host) {
    throw new Error("SMTP host is not configured");
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

/**
 * Send an alert email digest containing one or more alerts.
 */
export async function sendAlertEmail(alerts: Alert[]): Promise<void> {
  if (alerts.length === 0) return;

  const config = await getSmtpConfig();
  const transporter = await createTransporter();

  const alertEmailsStr =
    (await prisma.setting.findUnique({ where: { key: "alert_emails" } }))
      ?.value || "";

  const defaultAdmin = await prisma.admin.findFirst();
  const adminEmail = defaultAdmin?.email || process.env.ADMIN_EMAIL || "";

  const toAddresses = alertEmailsStr
    ? alertEmailsStr.split(",").map((e) => e.trim()).filter(Boolean)
    : (adminEmail ? [adminEmail] : []);

  if (toAddresses.length === 0) {
    console.warn("No alert emails configured — skipping alert email");
    return;
  }

  const alertRows = alerts
    .map(
      (a) =>
        `<tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${a.type}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${a.title}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${a.message}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "N/A"}</td>
        </tr>`
    )
    .join("\n");

  const companyName =
    (await prisma.setting.findUnique({ where: { key: "company_name" } }))
      ?.value || "InvenTrack";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: #333;">${companyName} — Alert Digest</h2>
      <p>You have ${alerts.length} active alert(s) that need attention:</p>
      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Type</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Title</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Message</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Due Date</th>
          </tr>
        </thead>
        <tbody>
          ${alertRows}
        </tbody>
      </table>
      <p style="margin-top: 20px; color: #888; font-size: 12px;">
        This is an automated email from ${companyName} asset management system.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: config.from,
    to: toAddresses.join(", "),
    subject: `[${companyName}] ${alerts.length} Active Alert(s) Need Attention`,
    html,
  });
}

/**
 * Send a test email to verify SMTP configuration.
 */
export async function sendTestEmail(to: string): Promise<void> {
  const transporter = await createTransporter();
  const config = await getSmtpConfig();

  const companyName =
    (await prisma.setting.findUnique({ where: { key: "company_name" } }))
      ?.value || "InvenTrack";

  await transporter.sendMail({
    from: config.from,
    to,
    subject: `[${companyName}] Test Email`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>SMTP Configuration Test</h2>
        <p>If you're reading this, your SMTP settings are working correctly!</p>
        <p style="color: #888; font-size: 12px;">Sent from ${companyName} asset management system.</p>
      </div>
    `,
  });
}

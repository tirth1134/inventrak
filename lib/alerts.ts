import prisma from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/mailer";
import type { AlertType } from "@prisma/client";

/**
 * Generate alerts for upcoming subscription renewals, payment dates,
 * and asset warranty expiries.
 *
 * This function is idempotent — it checks for existing un-dismissed alerts
 * before creating new ones to avoid duplicates.
 */
export async function generateAlerts(): Promise<number> {
  const daysAheadSetting = await prisma.setting.findUnique({
    where: { key: "alert_days_ahead" },
  });
  const daysAhead = parseInt(daysAheadSetting?.value || process.env.ALERT_DAYS_AHEAD || "30", 10);

  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  let alertsCreated = 0;

  // ── Subscription Renewal Alerts ─────────────────────────────────────────
  const subscriptionsRenewal = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      renewalDate: {
        gte: now,
        lte: futureDate,
      },
    },
  });

  for (const sub of subscriptionsRenewal) {
    const created = await createAlertIfNotExists({
      type: "SUBSCRIPTION_RENEWAL",
      title: `Subscription Renewal: ${sub.name}`,
      message: `${sub.name} renewal is due on ${sub.renewalDate!.toISOString().split("T")[0]}. Plan: ${sub.planName || "N/A"}, Price: ${sub.currency} ${sub.price}`,
      dueDate: sub.renewalDate!,
      subscriptionId: sub.id,
    });
    if (created) alertsCreated++;
  }

  // ── Subscription Payment Due Alerts ─────────────────────────────────────
  const subscriptionsPayment = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      nextPaymentDate: {
        gte: now,
        lte: futureDate,
      },
    },
  });

  for (const sub of subscriptionsPayment) {
    const created = await createAlertIfNotExists({
      type: "PAYMENT_DUE",
      title: `Payment Due: ${sub.name}`,
      message: `Payment for ${sub.name} is due on ${sub.nextPaymentDate!.toISOString().split("T")[0]}. Amount: ${sub.currency} ${sub.price}`,
      dueDate: sub.nextPaymentDate!,
      subscriptionId: sub.id,
    });
    if (created) alertsCreated++;
  }

  // ── Asset Warranty Expiry Alerts ────────────────────────────────────────
  const assetsWarranty = await prisma.asset.findMany({
    where: {
      status: { not: "SCRAPPED" },
      warrantyExpiry: {
        gte: now,
        lte: futureDate,
      },
    },
  });

  for (const asset of assetsWarranty) {
    const created = await createAlertIfNotExists({
      type: "WARRANTY_EXPIRY",
      title: `Warranty Expiry: ${asset.assetId}`,
      message: `Warranty for ${asset.brand || ""} ${asset.model || ""} (${asset.assetId}) expires on ${asset.warrantyExpiry!.toISOString().split("T")[0]}`,
      dueDate: asset.warrantyExpiry!,
      assetId: asset.id,
    });
    if (created) alertsCreated++;
  }

  // ── Low Stock Alerts ────────────────────────────────────────────────────
  const lowStockThresholdSetting = await prisma.setting.findUnique({
    where: { key: "low_stock_threshold" },
  });
  const lowStockThreshold = parseInt(lowStockThresholdSetting?.value || "2", 10);

  const assetTypes = ["DESKTOP", "LAPTOP", "MONITOR", "SERVER", "PERIPHERAL", "OTHER"] as const;

  for (const assetType of assetTypes) {
    const inStockCount = await prisma.asset.count({
      where: {
        type: assetType,
        status: "IN_STOCK",
      },
    });

    if (inStockCount < lowStockThreshold) {
      const created = await createAlertIfNotExists({
        type: "LOW_STOCK",
        title: `Low Stock: ${assetType}`,
        message: `Only ${inStockCount} ${assetType.toLowerCase()} asset(s) in stock (threshold: ${lowStockThreshold})`,
        dueDate: now,
      });
      if (created) alertsCreated++;
    }
  }

  return alertsCreated;
}

/**
 * Create an alert if one with the same type + entity + dueDate doesn't already exist.
 */
async function createAlertIfNotExists(params: {
  type: AlertType;
  title: string;
  message: string;
  dueDate: Date;
  subscriptionId?: string;
  assetId?: string;
}): Promise<boolean> {
  // Build the where clause for deduplication
  const whereClause: Record<string, unknown> = {
    type: params.type,
    isDismissed: false,
  };

  if (params.subscriptionId) {
    whereClause.subscriptionId = params.subscriptionId;
  }
  if (params.assetId) {
    whereClause.assetId = params.assetId;
  }

  // For date comparison, check same day
  if (params.dueDate) {
    const startOfDay = new Date(params.dueDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(params.dueDate);
    endOfDay.setHours(23, 59, 59, 999);
    whereClause.dueDate = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  const existingAlert = await prisma.alert.findFirst({
    where: whereClause,
  });

  if (existingAlert) {
    return false; // Alert already exists
  }

  await prisma.alert.create({
    data: {
      type: params.type,
      title: params.title,
      message: params.message,
      dueDate: params.dueDate,
      subscriptionId: params.subscriptionId,
      assetId: params.assetId,
    },
  });

  return true;
}

/**
 * Send email for all pending alerts (where isEmailSent = false).
 * After sending, marks all as sent.
 */
export async function sendPendingAlertEmails(): Promise<number> {
  // Check if alert email is enabled
  const emailEnabled = await prisma.setting.findUnique({
    where: { key: "alert_email_enabled" },
  });

  if (emailEnabled?.value === "false") {
    return 0;
  }

  const pendingAlerts = await prisma.alert.findMany({
    where: {
      isDismissed: false,
      isEmailSent: false,
    },
    orderBy: {
      dueDate: "asc",
    },
  });

  if (pendingAlerts.length === 0) {
    return 0;
  }

  try {
    await sendAlertEmail(pendingAlerts);

    // Mark all as sent
    await prisma.alert.updateMany({
      where: {
        id: {
          in: pendingAlerts.map((a) => a.id),
        },
      },
      data: {
        isEmailSent: true,
      },
    });

    return pendingAlerts.length;
  } catch (err) {
    console.error("Failed to send alert emails:", err);
    return 0;
  }
}

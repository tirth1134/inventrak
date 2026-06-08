import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { error } from "@/lib/api-response";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const subscriptions = await prisma.subscription.findMany({
      include: {
        department: { select: { name: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
    });

    const headers = [
      "Name",
      "Category",
      "Plan",
      "Status",
      "Billing Cycle",
      "Price",
      "Currency",
      "Licence Count",
      "Cost Per User",
      "Department",
      "Team Lead",
      "Renewal Date",
      "Next Payment Date",
      "Payment Method",
      "Users Assigned",
      "Tags",
      "Notes",
    ];

    const rows = subscriptions.map((s) => {
      const price = Number(s.price);
      const costPerUser = s.licenceCount > 0 ? Math.round((price / s.licenceCount) * 100) / 100 : price;
      return [
        s.name,
        s.category || "",
        s.planName || "",
        s.status,
        s.billingCycle,
        price.toString(),
        s.currency,
        s.licenceCount.toString(),
        costPerUser.toString(),
        s.department?.name || "",
        s.teamLeadName || "",
        s.renewalDate ? s.renewalDate.toISOString().split("T")[0] : "",
        s.nextPaymentDate ? s.nextPaymentDate.toISOString().split("T")[0] : "",
        s.paymentMethod || "",
        s._count.users.toString(),
        s.tags.join(";"),
        s.notes || "",
      ];
    });

    const csvLines = [headers, ...rows].map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    );
    const csv = csvLines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="subscriptions-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err) {
    console.error("GET /api/reports/subscriptions/export error:", err);
    return error("Failed to export subscriptions", 500);
  }
}

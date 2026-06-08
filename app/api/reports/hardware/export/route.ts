import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { error } from "@/lib/api-response";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const status = request.nextUrl.searchParams.get("status");
    const where: Prisma.AssetWhereInput = {};
    if (status) where.status = status as Prisma.EnumAssetStatusFilter["equals"];

    const assets = await prisma.asset.findMany({
      where,
      include: {
        department: { select: { name: true } },
        vendor: { select: { name: true } },
        processor: { select: { name: true, grade: true } },
        location: { select: { name: true } },
        assignments: {
          where: { isCurrent: true },
          include: { employee: { select: { name: true, email: true } } },
        },
      },
      orderBy: { assetId: "asc" },
    });

    const headers = [
      "Asset ID",
      "Type",
      "Brand",
      "Model",
      "Serial Number",
      "OS",
      "Processor",
      "Processor Grade",
      "RAM (GB)",
      "Storage (GB)",
      "Storage Type",
      "Status",
      "Department",
      "Location",
      "Vendor",
      "Purchase Date",
      "Purchase Price",
      "Currency",
      "Warranty Expiry",
      "Assigned To",
      "Assignee Email",
      "Remarks",
    ];

    const rows = assets.map((a) => [
      a.assetId,
      a.type,
      a.brand || "",
      a.model || "",
      a.serialNumber || "",
      a.osType || "",
      a.processor?.name || "",
      a.processor?.grade || "",
      a.ramGb?.toString() || "",
      a.storageGb?.toString() || "",
      a.storageType || "",
      a.status,
      a.department?.name || "",
      a.location?.name || "",
      a.vendor?.name || "",
      a.purchaseDate ? a.purchaseDate.toISOString().split("T")[0] : "",
      a.purchasePrice ? Number(a.purchasePrice).toString() : "",
      a.currency,
      a.warrantyExpiry ? a.warrantyExpiry.toISOString().split("T")[0] : "",
      a.assignments[0]?.employee?.name || "",
      a.assignments[0]?.employee?.email || "",
      a.remarks || "",
    ]);

    const csvLines = [headers, ...rows].map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    );
    const csv = csvLines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="hardware-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err) {
    console.error("GET /api/reports/hardware/export error:", err);
    return error("Failed to export hardware report", 500);
  }
}

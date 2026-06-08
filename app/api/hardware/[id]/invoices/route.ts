import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;

    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return error("Asset not found", 404);

    const invoiceItems = await prisma.hardwareInvoiceItem.findMany({
      where: { assetId: id },
      include: {
        invoice: {
          include: { vendor: { select: { id: true, name: true } } },
        },
      },
      orderBy: { invoice: { invoiceDate: "desc" } },
    });

    return success(
      invoiceItems.map((item) => ({
        ...item,
        invoice: { ...item.invoice, amount: Number(item.invoice.amount) },
      }))
    );
  } catch (err) {
    console.error("GET /api/hardware/[id]/invoices error:", err);
    return error("Failed to fetch invoices", 500);
  }
}

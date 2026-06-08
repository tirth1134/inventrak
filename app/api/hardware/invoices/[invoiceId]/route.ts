import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { deleteUploadedFile } from "@/lib/upload";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { invoiceId } = await params;

    const invoice = await prisma.hardwareInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: {
          include: { asset: { select: { id: true, assetId: true, brand: true, model: true, type: true } } },
        },
        vendor: { select: { id: true, name: true } },
      },
    });

    if (!invoice) return error("Invoice not found", 404);

    return success({ ...invoice, amount: Number(invoice.amount) });
  } catch (err) {
    console.error("GET /api/hardware/invoices/[invoiceId] error:", err);
    return error("Failed to fetch invoice", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { invoiceId } = await params;

    const invoice = await prisma.hardwareInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return error("Invoice not found", 404);

    await prisma.hardwareInvoice.delete({ where: { id: invoiceId } });

    if (invoice.filePath) {
      await deleteUploadedFile(invoice.filePath);
    }

    await createAuditLog({
      action: "DELETED",
      entity: "HardwareInvoice",
      entityId: invoiceId,
      detail: `Deleted hardware invoice ${invoice.invoiceNumber || invoiceId}`,
      adminId: session.user?.id,
    });

    return success(null, "Invoice deleted successfully");
  } catch (err) {
    console.error("DELETE /api/hardware/invoices/[invoiceId] error:", err);
    return error("Failed to delete invoice", 500);
  }
}

import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { deleteUploadedFile } from "@/lib/upload";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; invoiceId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id, invoiceId } = await params;

    const invoice = await prisma.softwareInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice || invoice.subscriptionId !== id) {
      return error("Invoice not found", 404);
    }

    await prisma.softwareInvoice.delete({ where: { id: invoiceId } });

    if (invoice.filePath) {
      await deleteUploadedFile(invoice.filePath);
    }

    await createAuditLog({
      action: "DELETED",
      entity: "SoftwareInvoice",
      entityId: invoiceId,
      detail: `Deleted invoice ${invoice.invoiceNumber || invoiceId}`,
      adminId: session.user?.id,
    });

    return success(null, "Invoice deleted successfully");
  } catch (err) {
    console.error("DELETE /api/subscriptions/[id]/invoices/[invoiceId] error:", err);
    return error("Failed to delete invoice", 500);
  }
}

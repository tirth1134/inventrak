import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { createSoftwareInvoiceSchema } from "@/lib/validators";
import { parseFormData, saveUploadedFile } from "@/lib/upload";
import formidable from "formidable";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;

    const subscription = await prisma.subscription.findUnique({ where: { id } });
    if (!subscription) return error("Subscription not found", 404);

    const invoices = await prisma.softwareInvoice.findMany({
      where: { subscriptionId: id },
      orderBy: { invoiceDate: "desc" },
    });

    return success(invoices.map((inv) => ({ ...inv, amount: Number(inv.amount) })));
  } catch (err) {
    console.error("GET /api/subscriptions/[id]/invoices error:", err);
    return error("Failed to fetch invoices", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { id } = await params;

    const subscription = await prisma.subscription.findUnique({ where: { id } });
    if (!subscription) return error("Subscription not found", 404);

    const contentType = request.headers.get("content-type") || "";
    let uploadResult = null;
    let invoiceData: Record<string, unknown> = {};

    if (contentType.includes("multipart/form-data")) {
      const { fields, files } = await parseFormData(request);

      const rawFields: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(fields)) {
        rawFields[key] = Array.isArray(val) ? val[0] : val;
      }
      if (rawFields.amount) rawFields.amount = parseFloat(rawFields.amount as string);

      const parsed = createSoftwareInvoiceSchema.safeParse(rawFields);
      if (!parsed.success) {
        return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }
      invoiceData = parsed.data;

      const fileField = files.file;
      const file = Array.isArray(fileField) ? fileField[0] : fileField;
      if (file) {
        uploadResult = await saveUploadedFile(file as formidable.File, "software-invoices");
      }
    } else {
      const body = await request.json();
      const parsed = createSoftwareInvoiceSchema.safeParse(body);
      if (!parsed.success) {
        return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }
      invoiceData = parsed.data;
    }

    const invoice = await prisma.softwareInvoice.create({
      data: {
        subscriptionId: id,
        invoiceNumber: invoiceData.invoiceNumber as string | undefined,
        amount: invoiceData.amount as number,
        currency: (invoiceData.currency as string) || "INR",
        invoiceDate: new Date(invoiceData.invoiceDate as string),
        notes: invoiceData.notes as string | undefined,
        filePath: uploadResult?.filePath,
        fileName: uploadResult?.fileName,
        fileType: uploadResult?.fileType,
      },
    });

    await createAuditLog({
      action: "CREATED",
      entity: "SoftwareInvoice",
      entityId: invoice.id,
      detail: `Added invoice to subscription "${subscription.name}"`,
      adminId: session.user?.id,
    });

    return success({ ...invoice, amount: Number(invoice.amount) }, "Invoice created successfully", 201);
  } catch (err) {
    console.error("POST /api/subscriptions/[id]/invoices error:", err);
    return error("Failed to create invoice", 500);
  }
}

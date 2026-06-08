import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { createAuditLog } from "@/lib/audit";
import { createHardwareInvoiceSchema } from "@/lib/validators";
import { parseFormData, saveUploadedFile } from "@/lib/upload";
import formidable from "formidable";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const contentType = request.headers.get("content-type") || "";
    let invoiceData: Record<string, unknown> = {};
    let uploadResult = null;

    if (contentType.includes("multipart/form-data")) {
      const { fields, files } = await parseFormData(request);

      const rawFields: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(fields)) {
        rawFields[key] = Array.isArray(val) ? val[0] : val;
      }
      if (rawFields.amount) rawFields.amount = parseFloat(rawFields.amount as string);
      if (rawFields.assetIds) {
        try {
          rawFields.assetIds = JSON.parse(rawFields.assetIds as string);
        } catch {
          rawFields.assetIds = [rawFields.assetIds];
        }
      }

      const parsed = createHardwareInvoiceSchema.safeParse(rawFields);
      if (!parsed.success) {
        return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }
      invoiceData = parsed.data;

      const fileField = files.file;
      const file = Array.isArray(fileField) ? fileField[0] : fileField;
      if (file) {
        uploadResult = await saveUploadedFile(file as formidable.File, "hardware-invoices");
      }
    } else {
      const body = await request.json();
      const parsed = createHardwareInvoiceSchema.safeParse(body);
      if (!parsed.success) {
        return error("Validation failed", 400, parsed.error.flatten().fieldErrors);
      }
      invoiceData = parsed.data;
    }

    const assetIds = invoiceData.assetIds as string[];

    // Verify all assets exist
    const assets = await prisma.asset.findMany({ where: { id: { in: assetIds } } });
    if (assets.length !== assetIds.length) {
      return error("One or more asset IDs not found", 404);
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.hardwareInvoice.create({
        data: {
          invoiceNumber: invoiceData.invoiceNumber as string | undefined,
          amount: invoiceData.amount as number,
          currency: (invoiceData.currency as string) || "INR",
          invoiceDate: new Date(invoiceData.invoiceDate as string),
          vendorId: (invoiceData.vendorId as string) || null,
          notes: invoiceData.notes as string | undefined,
          filePath: uploadResult?.filePath,
          fileName: uploadResult?.fileName,
          fileType: uploadResult?.fileType,
          items: {
            create: assetIds.map((assetId) => ({ assetId })),
          },
        },
        include: {
          items: { include: { asset: { select: { id: true, assetId: true } } } },
          vendor: { select: { id: true, name: true } },
        },
      });
      return created;
    });

    await createAuditLog({
      action: "CREATED",
      entity: "HardwareInvoice",
      entityId: invoice.id,
      detail: `Created hardware invoice ${invoice.invoiceNumber || invoice.id} for ${assetIds.length} asset(s)`,
      adminId: session.user?.id,
    });

    return success({ ...invoice, amount: Number(invoice.amount) }, "Invoice created successfully", 201);
  } catch (err) {
    console.error("POST /api/hardware/invoices error:", err);
    return error("Failed to create hardware invoice", 500);
  }
}

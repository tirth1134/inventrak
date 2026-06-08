import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { success, error } from "@/lib/api-response";
import { parseFormData, saveUploadedFile } from "@/lib/upload";
import formidable from "formidable";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { files, fields } = await parseFormData(request);

    const fileField = files.file;
    const file = Array.isArray(fileField) ? fileField[0] : fileField;
    if (!file) return error("No file provided", 400);

    const typeField = fields.type;
    const type = Array.isArray(typeField) ? typeField[0] : typeField || "general";

    const result = await saveUploadedFile(file as formidable.File, type as string);

    return success(result, "File uploaded successfully", 201);
  } catch (err) {
    console.error("POST /api/uploads error:", err);
    if (err instanceof Error && err.message.includes("maxFileSize")) {
      return error("File size exceeds limit", 413);
    }
    return error("Failed to upload file", 500);
  }
}

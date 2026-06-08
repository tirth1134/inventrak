import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readUploadedFile } from "@/lib/upload";
import { error } from "@/lib/api-response";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await auth();
    if (!session) return error("Unauthorized", 401);

    const { path: pathSegments } = await params;
    const filePath = path.join(UPLOAD_DIR, ...pathSegments);

    // Prevent path traversal
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return error("Forbidden", 403);
    }

    const result = await readUploadedFile(resolvedPath);
    if (!result) return error("File not found", 404);

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("GET /api/uploads/[...path] error:", err);
    return error("Failed to serve file", 500);
  }
}

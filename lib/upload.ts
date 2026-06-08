import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import formidable from "formidable";
import { IncomingMessage } from "http";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "10", 10);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export interface UploadResult {
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

/**
 * Parse multipart form data from a Next.js request.
 * Returns parsed fields and files.
 */
export async function parseFormData(
  req: Request
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  // Convert Web Request to a readable stream for formidable
  const contentType = req.headers.get("content-type") || "";

  // Create a temporary upload directory
  const tmpDir = path.join(UPLOAD_DIR, "tmp");
  await fs.mkdir(tmpDir, { recursive: true });

  const form = formidable({
    uploadDir: tmpDir,
    keepExtensions: true,
    maxFileSize: MAX_FILE_SIZE_BYTES,
    filter: ({ mimetype }) => {
      if (!mimetype) return false;
      return ALLOWED_TYPES.includes(mimetype);
    },
  });

  // Convert the Web API Request to a node-like IncomingMessage
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const body = await req.arrayBuffer();
  const { Readable } = await import("stream");
  const readable = new Readable();
  readable.push(Buffer.from(body));
  readable.push(null);

  // Attach headers to the readable stream to make it look like IncomingMessage
  const nodeReq = Object.assign(readable, {
    headers,
    method: "POST",
    url: "",
  }) as unknown as IncomingMessage;

  return new Promise((resolve, reject) => {
    form.parse(nodeReq, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ fields, files });
    });
  });
}

/**
 * Save an uploaded file to the structured storage path.
 * Path format: {UPLOAD_DIR}/{type}/{year}/{month}/{uuid}-{originalname}
 */
export async function saveUploadedFile(
  file: formidable.File,
  type: string = "general"
): Promise<UploadResult> {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const uuid = randomUUID();
  const originalName = file.originalFilename || "unnamed";
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");

  const destDir = path.join(UPLOAD_DIR, type, year, month);
  await fs.mkdir(destDir, { recursive: true });

  const fileName = `${uuid}-${sanitizedName}`;
  const destPath = path.join(destDir, fileName);

  // Move file from temp to final location
  await fs.rename(file.filepath, destPath);

  // Determine file type
  const ext = path.extname(originalName).toLowerCase();
  let fileType = "unknown";
  if (ext === ".pdf") fileType = "pdf";
  else if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) fileType = "image";

  return {
    filePath: destPath,
    fileName: originalName,
    fileType,
    fileSize: file.size || 0,
  };
}

/**
 * Delete an uploaded file from disk.
 */
export async function deleteUploadedFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    // File may already be deleted — log but don't throw
    console.error(`Failed to delete file ${filePath}:`, err);
  }
}

/**
 * Read a file and return it as a buffer with content type.
 */
export async function readUploadedFile(
  filePath: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();

    const contentTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".jpg": "application/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    };

    return {
      buffer,
      contentType: contentTypes[ext] || "application/octet-stream",
    };
  } catch {
    return null;
  }
}

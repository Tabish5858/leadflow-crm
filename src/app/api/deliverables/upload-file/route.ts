import { NextRequest, NextResponse } from "next/server";
import { cloudinary, getWorkspaceFolder } from "@/lib/cloudinary";
import { withAuth } from "@/lib/api/middleware";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB for deliverables
const ALLOWED_FILE_TYPES = [
  // Images
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "image/bmp", "image/tiff", "image/avif",
  // Videos
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "video/x-msvideo", "video/x-matroska", "video/mpeg", "video/3gpp",
  // Documents
  "application/pdf", "text/plain", "text/html", "text/csv", "text/markdown",
  "application/rtf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Audio
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/aac", "audio/flac",
  "audio/webm", "audio/mp4", "audio/x-m4a",
  // Archives
  "application/zip", "application/x-rar-compressed", "application/gzip",
  "application/x-7z-compressed",
];

export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "File is required" }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
          { status: 400 }
        );
      }

      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} not allowed` },
          { status: 400 }
        );
      }

      // Convert to base64 for Cloudinary
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

      const folder = `${getWorkspaceFolder(ctx.workspaceId)}/deliverables`;
      const result = await cloudinary.uploader.upload(base64, {
        folder,
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      });

      return NextResponse.json({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
    } catch (error) {
      console.error("Deliverable file upload error:", error);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
  });
}

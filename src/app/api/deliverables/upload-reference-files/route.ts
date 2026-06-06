import { NextRequest, NextResponse } from "next/server";
import { cloudinary, getWorkspaceFolder } from "@/lib/cloudinary";
import { withAuth } from "@/lib/api/middleware";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB for reference files

export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const formData = await req.formData();
      const files = formData.getAll("files") as File[];

      if (!files.length) {
        return NextResponse.json({ error: "At least one file is required" }, { status: 400 });
      }

      const results: Array<{
        fileName: string;
        url: string;
        publicId: string;
        fileSize: number;
        mimeType: string;
      }> = [];

      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: `File ${file.name} exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
            { status: 400 }
          );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

        const folder = `${getWorkspaceFolder(ctx.workspaceId)}/revision-references`;
        const result = await cloudinary.uploader.upload(base64, {
          folder,
          resource_type: "auto",
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        });

        results.push({
          fileName: file.name,
          url: result.secure_url,
          publicId: result.public_id,
          fileSize: file.size,
          mimeType: file.type,
        });
      }

      return NextResponse.json({
        success: true,
        files: results,
      });
    } catch (error) {
      console.error("Reference files upload error:", error);
      return NextResponse.json({ error: "Failed to upload reference files" }, { status: 500 });
    }
  });
}

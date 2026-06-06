import { NextRequest, NextResponse } from "next/server";
import { cloudinary, getWorkspaceFolder } from "@/lib/cloudinary";
import { withAuth } from "@/lib/api/middleware";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB for voice memos

export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const formData = await req.formData();
      const audio = formData.get("audio") as File | null;

      if (!audio) {
        return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
      }

      if (audio.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Audio file exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
          { status: 400 }
        );
      }

      const bytes = await audio.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = `data:${audio.type};base64,${buffer.toString("base64")}`;

      const folder = `${getWorkspaceFolder(ctx.workspaceId)}/voice-memos`;
      const result = await cloudinary.uploader.upload(base64, {
        folder,
        resource_type: "video", // Cloudinary treats audio as video resource type
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      });

      return NextResponse.json({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        duration: result.duration || 0,
      });
    } catch (error) {
      console.error("Voice memo upload error:", error);
      return NextResponse.json({ error: "Failed to upload voice memo" }, { status: 500 });
    }
  });
}

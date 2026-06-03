import { NextRequest, NextResponse } from "next/server";
import { cloudinary, getWorkspaceFolder, getFileType, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/lib/cloudinary";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { withAuth } from "@/lib/api/middleware";

const DOCUMENTS_COLLECTION = "documents";

export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const leadId = formData.get("leadId") as string;
      const projectId = formData.get("projectId") as string;
      const deliverableName = formData.get("deliverableName") as string;

      if (!file) {
        return NextResponse.json(
          { error: "File is required" },
          { status: 400 }
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
          { status: 400 }
        );
      }

      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} not allowed. Allowed: ${ALLOWED_FILE_TYPES.join(", ")}` },
          { status: 400 }
        );
      }

      // Convert file to base64 for Cloudinary upload
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

      // Upload to Cloudinary
      const folder = getWorkspaceFolder(ctx.workspaceId);
      const result = await cloudinary.uploader.upload(base64, {
        folder,
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      });

      // Store metadata in Firestore
      const docData: Record<string, unknown> = {
        workspaceId: ctx.workspaceId,
        fileName: file.name,
        fileType: getFileType(file.type),
        mimeType: file.type,
        fileSize: file.size,
        cloudinaryPublicId: result.public_id,
        cloudinaryUrl: result.secure_url,
        cloudinaryResourceType: result.resource_type,
        uploadedBy: ctx.userId,
        createdAt: Timestamp.now(),
      };
      if (leadId) docData.leadId = leadId;
      if (projectId) docData.projectId = projectId;
      if (deliverableName) docData.deliverableName = deliverableName;
      const docRef = await getAdminDb().collection(DOCUMENTS_COLLECTION).add(docData);

      return NextResponse.json({
        success: true,
        documentId: docRef.id,
        url: result.secure_url,
        publicId: result.public_id,
      });
    } catch (error) {
      console.error("Document upload error:", error);
      const message = "Failed to upload document";
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }
  });
}

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

export const CLOUDINARY_FOLDER = "leadflow";

export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/mpeg",
  "audio/wav",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function getWorkspaceFolder(workspaceId: string) {
  return `${CLOUDINARY_FOLDER}/${workspaceId}`;
}

export function getFileType(mimeType: string): string {
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("image")) return "image";
  if (mimeType.includes("word") || mimeType.includes("msword")) return "document";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "spreadsheet";
  if (mimeType.includes("text")) return "text";
  if (mimeType.includes("audio")) return "voice";
  return "other";
}

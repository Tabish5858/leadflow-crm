import "server-only";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

// Re-export client-safe constants from the shared config module
export {
  CLOUDINARY_FOLDER,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  getFileType,
  getWorkspaceFolder,
} from "./cloudinary-config";

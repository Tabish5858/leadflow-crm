"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, Loader2, Check, AlertCircle } from "lucide-react";

interface ImageUploadProps {
  /** Current image URL */
  currentUrl?: string | null;
  /** Upload API endpoint */
  endpoint: "/api/upload/avatar" | "/api/upload/workspace-logo";
  /** Called when upload succeeds with the new URL */
  onUploaded: (url: string) => void;
  /** Workspace ID (required for auth headers) */
  workspaceId: string;
  /** Button label */
  label?: string;
  /** Additional CSS */
  className?: string;
  /** Accepted file types */
  accept?: string;
}

export function ImageUpload({
  currentUrl,
  endpoint,
  onUploaded,
  workspaceId,
  label = "Upload Image",
  className,
  accept = "image/jpeg,image/png,image/webp,image/gif",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus("uploading");
    setErrorMsg("");

    try {
      // Get fresh Firebase auth token
      const { getAuth } = await import("firebase/auth");
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        throw new Error("You must be signed in to upload files");
      }

      const token = await user.getIdToken();

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-workspace-id": workspaceId,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setStatus("success");
      onUploaded(data.url);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      // Reset input so same file can be re-uploaded
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleUpload}
        className="hidden"
        id={`image-upload-${endpoint.replace(/\//g, "-")}`}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : status === "success" ? (
          <Check className="mr-2 h-4 w-4 text-green-500" />
        ) : status === "error" ? (
          <AlertCircle className="mr-2 h-4 w-4 text-destructive" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {uploading ? "Uploading..." : currentUrl ? "Change Image" : label}
      </Button>
      {status === "error" && errorMsg && (
        <span className="text-xs text-destructive">{errorMsg}</span>
      )}
      {currentUrl && status !== "uploading" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            onUploaded("");
            setStatus("idle");
          }}
        >
          Remove
        </Button>
      )}
    </div>
  );
}

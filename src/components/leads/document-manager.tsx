"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Document as LeadDocument } from "@/types";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFileSize, getFileIcon, canPreview } from "@/lib/documents";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/lib/cloudinary-config";
import { getApiAuthHeaders } from "@/lib/api/client";
import {
  Upload,
  Download,
  Trash2,
  Eye,
  FileText,
  AlertCircle,
  X,
  CheckCircle2,
} from "lucide-react";

const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".txt",
  ".csv",
].join(",");

interface DocumentManagerProps {
  leadId: string;
  workspaceId: string;
  userId: string;
}

interface UploadState {
  fileName: string;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

function DocumentRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <Skeleton className="h-8 w-8 rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

export function DocumentManager({
  leadId,
  workspaceId,
  userId,
}: DocumentManagerProps) {
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadStates, setUploadStates] = useState<UploadState[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/list?leadId=${leadId}&workspaceId=${workspaceId}`, {
        headers: await getApiAuthHeaders(workspaceId),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Server error (${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setDocuments(
          data.documents.map((d: Record<string, unknown>) => ({
            ...d,
            createdAt: d.createdAt
              ? { toDate: () => new Date(d.createdAt as string) }
              : { toDate: () => new Date() },
          }))
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load documents";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [leadId, workspaceId, userId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const newUploadStates: UploadState[] = fileArray.map((f) => ({
        fileName: f.name,
        progress: 0,
        status: "uploading",
      }));
      setUploadStates((prev) => [...prev, ...newUploadStates]);

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const stateIndex = newUploadStates.length - fileArray.length + i;

        if (file.size > MAX_FILE_SIZE) {
          setUploadStates((prev) => {
            const updated = [...prev];
            updated[stateIndex] = {
              ...updated[stateIndex],
              status: "error",
              error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
            };
            return updated;
          });
          toast.error(`${file.name}: exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
          continue;
        }

        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          setUploadStates((prev) => {
            const updated = [...prev];
            updated[stateIndex] = {
              ...updated[stateIndex],
              status: "error",
              error: "File type not supported",
            };
            return updated;
          });
          toast.error(`${file.name}: file type not supported`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("leadId", leadId);

        try {
          const xhr = new XMLHttpRequest();

          await new Promise<void>((resolve, reject) => {
            xhr.upload.addEventListener("progress", (e) => {
              if (e.lengthComputable) {
                const progress = Math.round((e.loaded / e.total) * 100);
                setUploadStates((prev) => {
                  const updated = [...prev];
                  updated[stateIndex] = { ...updated[stateIndex], progress };
                  return updated;
                });
              }
            });

            xhr.addEventListener("load", () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                let msg = "Upload failed";
                try {
                  const errBody = JSON.parse(xhr.responseText);
                  msg = errBody.error || msg;
                } catch {}
                reject(new Error(msg));
              }
            });

            xhr.addEventListener("error", () => reject(new Error("Network error")));
            xhr.open("POST", "/api/documents/upload");
            xhr.setRequestHeader("x-workspace-id", workspaceId);
            xhr.send(formData);
          });

          setUploadStates((prev) => {
            const updated = [...prev];
            updated[stateIndex] = { ...updated[stateIndex], status: "success", progress: 100 };
            return updated;
          });
          toast.success(`${file.name} uploaded`);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Upload failed";
          setUploadStates((prev) => {
            const updated = [...prev];
            updated[stateIndex] = {
              ...updated[stateIndex],
              status: "error",
              error: errorMsg,
            };
            return updated;
          });
          toast.error(`Failed to upload ${file.name}: ${errorMsg}`);
        }
      }

      await fetchDocuments();

      setTimeout(() => {
        setUploadStates((prev) => prev.filter((s) => s.status === "error"));
      }, 2000);
    },
    [leadId, workspaceId, userId, fetchDocuments]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDelete = async (documentId: string, fileName: string) => {
    setDeletingDocId(documentId);
    try {
      const res = await fetch("/api/documents/list", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(await getApiAuthHeaders(workspaceId)),
        },
        body: JSON.stringify({ documentId }),
      });
      const data = await res.json();
      if (data.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== documentId));
        toast.success(`${fileName} deleted`);
      } else {
        toast.error(data.error || "Failed to delete document");
      }
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeletingDocId(null);
    }
  };

  const handlePreview = (doc: LeadDocument) => {
    if (canPreview(doc.fileType)) {
      setPreviewUrl(doc.cloudinaryUrl);
      setPreviewName(doc.fileName);
    } else {
      // Open non-previewable files in a new tab
      window.open(doc.cloudinaryUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = (url: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <DocumentRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Drag and drop files here, or{" "}
          <button
            type="button"
            className="text-primary hover:underline font-medium"
            onClick={() => fileInputRef.current?.click()}
          >
            browse
          </button>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, DOC, images, spreadsheets (max 10MB)
        </p>
      </div>

      {/* Upload progress */}
      {uploadStates.length > 0 && (
        <div className="space-y-2">
          {uploadStates.map((state, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 text-sm"
            >
              {state.status === "uploading" && (
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="truncate">{state.fileName}</span>
                    <span className="text-muted-foreground">{state.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 rounded-full"
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>
                </div>
              )}
              {state.status === "success" && (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="truncate text-green-600">{state.fileName}</span>
                </>
              )}
              {state.status === "error" && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="truncate text-red-600">{state.fileName}</span>
                  {state.error && (
                    <span className="text-xs text-muted-foreground">{state.error}</span>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() =>
                          setUploadStates((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="ml-auto shrink-0"
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent><p>Dismiss</p></TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="mx-auto h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">No documents yet</p>
          <p className="text-xs mt-1">Upload your first document above</p>
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
          {documents.map((doc) => {
            const Icon = getFileIcon(doc.fileType);
            const isDeleting = deletingDocId === doc.id;

            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.fileSize)} &middot;{" "}
                    {doc.createdAt?.toDate().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <TooltipButton
                    tooltip="Preview"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handlePreview(doc)}
                  >
                    <Eye className="h-4 w-4" />
                  </TooltipButton>
                  <TooltipButton
                    tooltip="Download"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleDownload(doc.cloudinaryUrl, doc.fileName)}
                  >
                    <Download className="h-4 w-4" />
                  </TooltipButton>
                  <TooltipButton
                    tooltip="Delete document"
                    variant="ghost"
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(doc.id, doc.fileName)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </TooltipButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewName}</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="flex items-center justify-center bg-muted rounded-lg overflow-hidden max-h-[60vh]">
              {previewName.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[60vh] border-0"
                  title={previewName}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={previewName}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import React, { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { DeliverableVersion, DeliverableRevisionComment } from "@/types";
import { requestRevision } from "@/lib/firebase/project-deliverables";
import { getFileCategory } from "@/types";
import { toast } from "sonner";

// ─── Props ──────────────────────────────────────────────────────────────────

interface RevisionRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliverableId: string;
  version: DeliverableVersion;
  userId: string;
  isClient?: boolean;
  readOnly?: boolean;
  existingRevision?: {
    comments: DeliverableRevisionComment[];
    reason?: string;
  };
}

// ─── Per-item revision data ──────────────────────────────────────────────────

interface RevisionItemData {
  fileId: string;
  fileName: string;
  description: string;
  referenceFiles: { fileName: string; url: string; fileSize: number; mimeType: string }[];
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function RevisionRequestModal({
  open, onOpenChange, deliverableId, version, userId, isClient, readOnly, existingRevision,
}: RevisionRequestModalProps) {
  // ─── State ──────────────────────────────────────────────────────────────
  const [revisionData, setRevisionData] = useState<Record<string, RevisionItemData>>(() => {
    const initial: Record<string, RevisionItemData> = {};

    // Initialize from existing revision or empty
    if (existingRevision?.comments) {
      for (const c of existingRevision.comments) {
        const key = c.fileId || c.associatedItemId || "general";
        initial[key] = {
          fileId: key,
          fileName: c.associatedItemName || "Item",
          description: c.text,
          referenceFiles: (c.attachments || []).map((a) => ({
            fileName: a.fileName,
            url: a.cloudinaryUrl || a.filePath,
            fileSize: a.fileSize,
            mimeType: a.mimeType,
          })),
        };
      }
    } else {
      // Initialize from version files/links
      for (const f of version.files || []) {
        initial[f.id || f.fileName] = {
          fileId: f.id || f.fileName,
          fileName: f.originalName || f.fileName,
          description: "",
          referenceFiles: [],
        };
      }
      for (const l of version.links || []) {
        initial[l.url] = {
          fileId: l.url,
          fileName: l.title,
          description: "",
          referenceFiles: [],
        };
      }
      initial["general"] = {
        fileId: "general",
        fileName: "General Feedback",
        description: "",
        referenceFiles: [],
      };
    }

    return initial;
  });

  const [reason, setReason] = useState(existingRevision?.reason || "");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingForId, setUploadingForId] = useState<string | null>(null);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleDescriptionChange = (fileId: string, text: string) => {
    setRevisionData((prev) => ({
      ...prev,
      [fileId]: { ...prev[fileId], description: text },
    }));
  };

  const uploadReferenceFile = async (fileId: string, file: File) => {
    setUploadingForId(fileId);
    try {
      const formData = new FormData();
      formData.append("files", file);

      const token = await import("@/lib/firebase/client").then((m) => m.auth.currentUser?.getIdToken());
      const res = await fetch("/api/deliverables/upload-reference-files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-workspace-id": "", // Will be set by middleware
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      setRevisionData((prev) => ({
        ...prev,
        [fileId]: {
          ...prev[fileId],
          referenceFiles: [
            ...(prev[fileId]?.referenceFiles || []),
            ...data.files,
          ],
        },
      }));
    } catch (err) {
      console.error("Failed to upload reference file:", err);
      toast.error("Failed to upload reference file");
    } finally {
      setUploadingForId(null);
    }
  };

  const removeReferenceFile = (fileId: string, index: number) => {
    setRevisionData((prev) => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        referenceFiles: prev[fileId].referenceFiles.filter((_, i) => i !== index),
      },
    }));
  };

  const handleSubmitRevision = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the revision");
      return;
    }

    setSubmitting(true);
    try {
      // Build comments with associations
      const comments = Object.entries(revisionData)
        .filter(([key, data]) => data.description.trim() || data.referenceFiles.length > 0)
        .map(([key, data]) => ({
          text: data.description.trim() || "No specific feedback",
          fileId: key === "general" ? undefined : key,
          linkId: key.startsWith("http") ? key : undefined,
          associationType: key === "general" ? "general" as const : key.startsWith("http") ? "link" as const : "file" as const,
          associatedItemId: key,
          associatedItemName: data.fileName,
          attachments: data.referenceFiles.map((rf, idx) => ({
            id: `ref-${idx}-${Date.now()}`,
            fileName: rf.fileName,
            originalName: rf.fileName,
            filePath: rf.url,
            fileSize: rf.fileSize,
            mimeType: rf.mimeType,
            uploadedAt: undefined as unknown as import("firebase/firestore").Timestamp,
            uploadedBy: userId,
            downloadCount: 0,
            videoMoments: [],
            imageMarkups: [],
          })),
        }));

      await requestRevision(
        deliverableId,
        version.id,
        userId,
        reason.trim(),
        comments,
      );

      toast.success("Revision request submitted");
      onOpenChange(false);
    } catch (err: unknown) {
      console.error("Failed to submit revision:", err);
      const msg = err instanceof Error ? err.message : "Failed to submit revision";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render category sections ───────────────────────────────────────────

  const renderFileItem = (data: RevisionItemData) => {
    const isGeneral = data.fileId === "general";
    return (
      <div key={data.fileId} className="border rounded-lg p-3 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2 mb-2">
          {!isGeneral && data.referenceFiles.length > 0 && (
            <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
              {data.referenceFiles[0]?.mimeType?.startsWith("image/") ? (
                <img src={data.referenceFiles[0].url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg">📄</span>
              )}
            </div>
          )}
          <span className="text-sm font-medium flex-1 truncate">{data.fileName}</span>
        </div>

        {readOnly ? (
          <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {data.description || "No feedback provided"}
          </p>
        ) : (
          <Textarea
            value={data.description}
            onChange={(e) => handleDescriptionChange(data.fileId, e.target.value)}
            placeholder={isGeneral ? "Overall revision notes..." : "How can this be improved?"}
            className="min-h-[60px] text-xs mb-2"
          />
        )}

        {/* Reference files */}
        {data.referenceFiles.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {data.referenceFiles.map((rf, idx) => (
              <div key={idx} className="relative flex-shrink-0 group">
                {rf.mimeType.startsWith("image/") ? (
                  <div className="w-16 h-16 rounded overflow-hidden border">
                    <img src={rf.url} alt={rf.fileName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded border flex items-center justify-center bg-gray-50 dark:bg-gray-700 text-[20px]">
                    📄
                  </div>
                )}
                {!readOnly && (
                  <button
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeReferenceFile(data.fileId, idx)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!readOnly && data.fileId !== "general" && (
          <div className="mt-1">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadReferenceFile(data.fileId, file);
                e.target.value = "";
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingForId === data.fileId}
            >
              {uploadingForId === data.fileId ? "Uploading..." : "+ Add reference file"}
            </Button>
          </div>
        )}
      </div>
    );
  };

  // ─── Categorize items ────────────────────────────────────────────────────

  const getCategoryLabel = (mimeType: string): string => {
    const cat = getFileCategory(mimeType);
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? "Revision Request Details" : "Request Revision"}
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Version {version.versionNumber} — {version.files?.length || 0} files, {version.links?.length || 0} links
          </p>
        </DialogHeader>

        {/* Reason */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Revision Reason</label>
          {readOnly ? (
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
              {reason || existingRevision?.reason || "No reason provided"}
            </p>
          ) : (
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Summarize the main reason for this revision request..."
              className="min-h-[60px]"
            />
          )}
        </div>

        <Separator />

        {/* Per-file feedback */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Feedback Per Item</h3>

          {/* Gallery items */}
          {version.files?.filter((f) => getFileCategory(f.mimeType) === "image").length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase">Gallery</h4>
              <div className="space-y-2">
                {version.files
                  .filter((f) => getFileCategory(f.mimeType) === "image")
                  .map((f) => renderFileItem(revisionData[f.id || f.fileName] || {
                    fileId: f.id || f.fileName,
                    fileName: f.originalName || f.fileName,
                    description: "",
                    referenceFiles: [],
                  }))}
              </div>
            </div>
          )}

          {/* Video items */}
          {version.files?.filter((f) => getFileCategory(f.mimeType) === "video").length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase">Videos</h4>
              <div className="space-y-2">
                {version.files
                  .filter((f) => getFileCategory(f.mimeType) === "video")
                  .map((f) => renderFileItem(revisionData[f.id || f.fileName] || {
                    fileId: f.id || f.fileName,
                    fileName: f.originalName || f.fileName,
                    description: "",
                    referenceFiles: [],
                  }))}
              </div>
            </div>
          )}

          {/* Document items */}
          {version.files?.filter((f) => getFileCategory(f.mimeType) === "document").length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase">Documents</h4>
              <div className="space-y-2">
                {version.files
                  .filter((f) => getFileCategory(f.mimeType) === "document")
                  .map((f) => renderFileItem(revisionData[f.id || f.fileName] || {
                    fileId: f.id || f.fileName,
                    fileName: f.originalName || f.fileName,
                    description: "",
                    referenceFiles: [],
                  }))}
              </div>
            </div>
          )}

          {/* Audio items */}
          {version.files?.filter((f) => getFileCategory(f.mimeType) === "audio").length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase">Audio</h4>
              <div className="space-y-2">
                {version.files
                  .filter((f) => getFileCategory(f.mimeType) === "audio")
                  .map((f) => renderFileItem(revisionData[f.id || f.fileName] || {
                    fileId: f.id || f.fileName,
                    fileName: f.originalName || f.fileName,
                    description: "",
                    referenceFiles: [],
                  }))}
              </div>
            </div>
          )}

          {/* Download items */}
          {version.files?.filter((f) => getFileCategory(f.mimeType) === "download").length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase">Downloads</h4>
              <div className="space-y-2">
                {version.files
                  .filter((f) => getFileCategory(f.mimeType) === "download")
                  .map((f) => renderFileItem(revisionData[f.id || f.fileName] || {
                    fileId: f.id || f.fileName,
                    fileName: f.originalName || f.fileName,
                    description: "",
                    referenceFiles: [],
                  }))}
              </div>
            </div>
          )}

          {/* Links */}
          {version.links?.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase">Links</h4>
              <div className="space-y-2">
                {version.links.map((l) => renderFileItem(revisionData[l.url] || {
                  fileId: l.url,
                  fileName: l.title,
                  description: "",
                  referenceFiles: [],
                }))}
              </div>
            </div>
          )}

          {/* General feedback */}
          {renderFileItem(revisionData["general"] || {
            fileId: "general",
            fileName: "General Feedback",
            description: "",
            referenceFiles: [],
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button onClick={handleSubmitRevision} disabled={submitting || !reason.trim()}>
              {submitting ? "Submitting..." : "Submit Revision Request"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


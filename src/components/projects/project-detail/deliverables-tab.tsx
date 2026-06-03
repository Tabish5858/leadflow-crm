"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Document } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { formatFileSize, getFileIcon, canPreview } from "@/lib/documents";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/lib/cloudinary-config";
import { getApiAuthHeaders } from "@/lib/api/client";
import { updateProject } from "@/lib/firebase/projects";
import {
  Upload,
  Download,
  Eye,
  Package,
  CheckCircle2,
  Send,
  X,
  AlertCircle,
  CheckCircle,
  FolderKanban,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  Image,
  File,
  Trash2,
  Info,
  Loader2,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliverableStatus = "not_submitted" | "submitted" | "approved" | "needs_revision";

interface DeliverableVersion {
  id: string;
  versionNumber: number;
  files: DeliverableFile[];
  notes?: string;
  uploadedAt: string;
  status: DeliverableStatus;
}

interface Deliverable {
  id: string;
  title: string;
  description?: string;
  status: DeliverableStatus;
  versions: DeliverableVersion[];
  isExpanded?: boolean;
}

interface DeliverableFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  cloudinaryUrl: string;
  uploadedAt: string;
}

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip,.ai,.psd,.sketch,.fig";

const STATUS_CONFIG: Record<DeliverableStatus, { label: string; color: string; bg: string }> = {
  not_submitted: { label: "Not Submitted", color: "#6b7280", bg: "#F3F4F6" },
  submitted: { label: "Submitted", color: "#7c3aed", bg: "#EDE9FE" },
  approved: { label: "Approved", color: "#059669", bg: "#D1FAE5" },
  needs_revision: { label: "Needs Revision", color: "#d97706", bg: "#FEF3C7" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}

function getFileTypeIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("pdf")) return FileText;
  return File;
}

// ─── Add Version Modal ────────────────────────────────────────────────────────

function AddVersionModal({
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { files: File[]; notes: string }) => void;
  saving: boolean;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setFiles([]); setNotes(""); }
  }, [open]);

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const valid = newFiles.filter((f) => ALLOWED_FILE_TYPES.includes(f.type));
      if (valid.length !== newFiles.length) toast.error("Some file types not allowed");
      setFiles((prev) => [...prev, ...valid]);
    }
    if (e.target) e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Version</DialogTitle>
          <DialogDescription>Upload files for this deliverable version.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* File upload */}
          <div className="space-y-2">
            <Label>Files</Label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            >
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to browse or drag files here</p>
              <p className="text-xs text-muted-foreground/60 mt-1">PDF, images, documents (max 50MB each)</p>
              <input ref={fileRef} type="file" multiple accept={ACCEPTED_EXTENSIONS} onChange={handleAddFiles} className="hidden" />
            </div>
            {files.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                    <File className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(f.size)}</span>
                    <button onClick={() => removeFile(i)} className="p-0.5 hover:bg-gray-200 rounded">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Notes */}
          <div className="space-y-2">
            <Label>Version Notes</Label>
            <Textarea placeholder="What changed in this version?" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave({ files, notes })} disabled={saving || files.length === 0}>
            {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>) : `Upload Version (${files.length} file${files.length !== 1 ? "s" : ""})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Version Files Preview Modal ──────────────────────────────────────────────

function VersionPreviewModal({
  open,
  onOpenChange,
  files,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: DeliverableFile[];
  title: string;
}) {
  const [activeFile, setActiveFile] = useState<DeliverableFile | null>(files[0] || null);

  useEffect(() => {
    if (open && files.length > 0) setActiveFile(files[0]);
  }, [open, files]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate">{title}</DialogTitle>
        </DialogHeader>
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No files to preview</p>
        ) : (
          <div className="space-y-4">
            {/* File selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {files.map((f) => {
                const FileIcon = getFileTypeIcon(f.fileType);
                const isActive = f.id === activeFile?.id;
                return (
                  <button key={f.id} onClick={() => setActiveFile(f)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap border transition-colors ${
                      isActive ? "bg-muted border-border font-medium" : "hover:bg-muted/50 border-transparent"
                    }`}
                  >
                    <FileIcon className="h-3.5 w-3.5" />
                    {f.fileName}
                  </button>
                );
              })}
            </div>
            {/* File preview */}
            {activeFile && (
              <div className="bg-muted/30 rounded-lg p-2 flex items-center justify-center min-h-[300px]">
                {activeFile.fileType.startsWith("image/") ? (
                  <img src={activeFile.cloudinaryUrl} alt={activeFile.fileName} className="max-w-full max-h-[60vh] object-contain rounded" />
                ) : activeFile.fileType.includes("pdf") ? (
                  <iframe src={activeFile.cloudinaryUrl} className="w-full h-[60vh] rounded" title={activeFile.fileName} />
                ) : (
                  <div className="text-center py-12">
                    <File className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">Preview not available for this file type</p>
                    <Button variant="outline" size="sm" asChild>
                      <a href={activeFile.cloudinaryUrl} download={activeFile.fileName} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-1.5" /> Download
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            )}
            {/* Download all */}
            <div className="flex justify-end gap-2">
              {activeFile && (
                <Button variant="outline" size="sm" asChild>
                  <a href={activeFile.cloudinaryUrl} download={activeFile.fileName} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-1.5" /> Download Current
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Deliver Final Package Modal ──────────────────────────────────────────────

function DeliverFinalPackageModal({
  open,
  onOpenChange,
  onConfirm,
  saving,
  deliverableCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  saving: boolean;
  deliverableCount: number;
}) {
  const [step, setStep] = useState<"confirm" | "success">("confirm");

  useEffect(() => { if (!open) setStep("confirm"); }, [open]);

  const handleConfirm = async () => {
    await onConfirm();
    setStep("success");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle>Deliver Final Package</DialogTitle>
              <DialogDescription>
                You are about to deliver {deliverableCount} deliverable{deliverableCount !== 1 ? "s" : ""} to the client as the final package.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>After delivery, the client will be able to view and download all deliverables. This action can be reversed.</span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleConfirm} disabled={saving}>
                {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Delivering...</>) : "Deliver Final Package"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                <CheckCircle2 className="h-5 w-5 text-green-600 inline mr-2" />
                Package Delivered!
              </DialogTitle>
              <DialogDescription>
                All deliverables have been sent to the client successfully.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <Package className="h-10 w-10 mx-auto text-green-600 mb-2" />
              <p className="text-sm font-medium text-green-700">Final Package Delivered</p>
              <p className="text-xs text-green-600/70 mt-1">The client can now view and download all files.</p>
            </div>
            <DialogFooter>
              <Button onClick={() => { setStep("confirm"); onOpenChange(false); }}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main DeliverablesTab Component ───────────────────────────────────────────

interface DeliverablesTabProps {
  projectId: string;
  workspaceId: string;
  userId: string;
  onProjectUpdated: () => void;
  hasFinalPackage: boolean;
}

export default function DeliverablesTab({ projectId, workspaceId, userId, onProjectUpdated, hasFinalPackage }: DeliverablesTabProps) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDeliverables, setExpandedDeliverables] = useState<Set<string>>(new Set());
  const [showAddVersion, setShowAddVersion] = useState<string | null>(null);
  const [showVersionPreview, setShowVersionPreview] = useState<{ deliverableId: string; versionId: string } | null>(null);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [delivering, setDelivering] = useState(false);

  // Load deliverables from project files
  const loadDeliverables = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/list?projectId=${projectId}&workspaceId=${workspaceId}`, {
        headers: await getApiAuthHeaders(workspaceId),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const grouped = new Map<string, DeliverableFile[]>();
          for (const doc of data.documents as Record<string, unknown>[]) {
            const deliverableName = (doc.deliverableName as string) || "Untitled Deliverable";
            const existing = grouped.get(deliverableName) || [];
            existing.push({
              id: doc.id as string,
              fileName: doc.fileName as string,
              fileType: doc.fileType as string,
              fileSize: doc.fileSize as number,
              cloudinaryUrl: doc.cloudinaryUrl as string,
              uploadedAt: (doc.createdAt as any)?.seconds
                ? new Date((doc.createdAt as any).seconds * 1000).toISOString()
                : new Date().toISOString(),
            });
            grouped.set(deliverableName, existing);
          }

          const result: Deliverable[] = Array.from(grouped.entries()).map(([title, files], idx) => ({
            id: `del-${idx}`,
            title,
            status: "submitted" as DeliverableStatus,
            versions: [{
              id: `v-${idx}-1`,
              versionNumber: 1,
              files,
              uploadedAt: files[0]?.uploadedAt || new Date().toISOString(),
              status: "submitted" as DeliverableStatus,
            }],
          }));

          setDeliverables(result.length > 0 ? result : []);
        }
      }
    } catch {
      toast.error("Failed to load deliverables");
    } finally {
      setLoading(false);
    }
  }, [projectId, workspaceId]);

  useEffect(() => { loadDeliverables(); }, [loadDeliverables]);

  const toggleExpanded = (id: string) => {
    setExpandedDeliverables((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  // Add version to a deliverable
  const handleAddVersion = async (deliverableId: string, data: { files: File[]; notes: string }) => {
    setSavingVersion(true);
    try {
      const formData = new FormData();
      for (const file of data.files) {
        formData.append("file", file);
      }
      formData.append("projectId", projectId);
      formData.append("deliverableName", deliverables.find((d) => d.id === deliverableId)?.title || "Untitled Deliverable");
      formData.append("versionNotes", data.notes);

      const headers = await getApiAuthHeaders(workspaceId);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { ...headers, "x-workspace-id": workspaceId },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      toast.success("Version uploaded");
      setShowAddVersion(null);
      loadDeliverables();
    } catch {
      toast.error("Failed to upload version");
    } finally {
      setSavingVersion(false);
    }
  };

  // Deliver final package
  const handleDeliverFinalPackage = async () => {
    setDelivering(true);
    try {
      await updateProject(projectId, {
        hasFinalPackage: true,
        finalPackageDelivered: true,
      } as any);
      toast.success("Final package delivered");
      setShowDeliverModal(false);
      onProjectUpdated();
    } catch {
      toast.error("Failed to deliver package");
    } finally {
      setDelivering(false);
    }
  };

  // Get files for preview
  const getPreviewFiles = (): DeliverableFile[] => {
    if (!showVersionPreview) return [];
    const del = deliverables.find((d) => d.id === showVersionPreview.deliverableId);
    if (!del) return [];
    const v = del.versions.find((v) => v.id === showVersionPreview.versionId);
    return v?.files || [];
  };

  const getPreviewTitle = (): string => {
    if (!showVersionPreview) return "";
    const del = deliverables.find((d) => d.id === showVersionPreview.deliverableId);
    if (!del) return "";
    const v = del.versions.find((v) => v.id === showVersionPreview.versionId);
    return `${del.title} - Version ${v?.versionNumber || "?"}`;
  };

  const totalFiles = deliverables.reduce((acc, d) => acc + d.versions.reduce((vAcc, v) => vAcc + v.files.length, 0), 0);
  const approvedCount = deliverables.filter((d) => d.status === "approved").length;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Deliverables</h3>
            <p className="text-xs text-muted-foreground">
              {deliverables.length} deliverable{deliverables.length !== 1 ? "s" : ""} &middot; {totalFiles} file{totalFiles !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {/* Deliver Final Package button */}
        {!hasFinalPackage && deliverables.length > 0 && (
          <Button
            onClick={() => setShowDeliverModal(true)}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            Deliver Final Package
          </Button>
        )}
      </div>

      {/* ─── Final Package Banner ─── */}
      {hasFinalPackage && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 bg-green-50">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-700">Final Package Delivered</p>
            <p className="text-xs text-green-600/70">All deliverables have been sent to the client.</p>
          </div>
        </div>
      )}

      {/* ─── Loading ─── */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-16 w-full rounded-lg" />))}</div>
      ) : deliverables.length === 0 ? (
        /* ─── Empty State ─── */
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No deliverables yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Upload files to the Files tab to create deliverables.</p>
        </div>
      ) : (
        /* ─── Deliverable List ─── */
        <div className="space-y-3">
          {deliverables.map((del) => {
            const isExpanded = expandedDeliverables.has(del.id);
            const statusCfg = STATUS_CONFIG[del.status] || STATUS_CONFIG.not_submitted;
            const latestVersion = del.versions[del.versions.length - 1];

            return (
              <div key={del.id} className="border border-border rounded-lg bg-card overflow-hidden">
                {/* Deliverable Header */}
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => toggleExpanded(del.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button className="shrink-0 p-0.5 hover:bg-gray-200 rounded">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    </button>
                    <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{del.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {del.versions.length} version{del.versions.length !== 1 ? "s" : ""}
                        {latestVersion && ` · ${formatDate(latestVersion.uploadedAt)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                {/* Expanded Version List */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {del.versions.map((version) => (
                      <div key={version.id} className="flex items-center justify-between p-3 pl-10 hover:bg-accent/30 transition-colors border-b border-border/50 last:border-b-0">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground">Version {version.versionNumber}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(version.uploadedAt)} · {version.files.length} file{version.files.length !== 1 ? "s" : ""}</p>
                          </div>
                          {version.notes && (
                            <p className="text-[10px] text-muted-foreground/70 italic truncate max-w-[200px] hidden sm:block">{version.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowVersionPreview({ deliverableId: del.id, versionId: version.id })} title="Preview">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {/* Add Version button */}
                    <button
                      onClick={() => setShowAddVersion(del.id)}
                      className="flex items-center gap-2 w-full p-3 pl-10 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Version
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Progress Summary ─── */}
      {deliverables.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
          <span>{deliverables.length} deliverable{deliverables.length !== 1 ? "s" : ""}</span>
          <span className="text-muted-foreground/30">|</span>
          <span>{totalFiles} file{totalFiles !== 1 ? "s" : ""}</span>
          <span className="text-muted-foreground/30">|</span>
          <span>{approvedCount} approved</span>
        </div>
      )}

      {/* ─── Modals ─── */}
      <AddVersionModal
        open={!!showAddVersion}
        onOpenChange={(open) => { if (!open) setShowAddVersion(null); }}
        onSave={(data) => { if (showAddVersion) handleAddVersion(showAddVersion, data); }}
        saving={savingVersion}
      />

      <VersionPreviewModal
        open={!!showVersionPreview}
        onOpenChange={() => setShowVersionPreview(null)}
        files={getPreviewFiles()}
        title={getPreviewTitle()}
      />

      <DeliverFinalPackageModal
        open={showDeliverModal}
        onOpenChange={setShowDeliverModal}
        onConfirm={handleDeliverFinalPackage}
        saving={delivering}
        deliverableCount={deliverables.length}
      />
    </div>
  );
}

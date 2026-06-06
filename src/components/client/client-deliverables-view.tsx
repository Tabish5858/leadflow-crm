"use client";

import { useState, useEffect } from "react";
import type { Deliverable, DeliverableFileAttachment } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { formatFileSize } from "@/lib/documents";
import { getApiAuthHeaders } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { getProjectDeliverables, addComment, addReply, submitPaymentProof, approveVersion, requestRevision } from "@/lib/firebase/project-deliverables";
import {
  Download,
  Eye,
  Package,
  CheckCircle2,
  FileText,
  File,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Upload,
  X,
  Loader2,
  Image as ImageIcon,
  Video,
  PartyPopper,
  ArrowRight,
  ThumbsUp,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Timestamp } from "firebase/firestore";
import React from "react";
import { DeliveryFlowModal } from "@/components/projects/delivery-flow-modal";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Timestamp | Date | string | undefined): string {
  if (!d) return "";
  const date = d instanceof Timestamp ? d.toDate() : typeof d === "string" ? new Date(d) : d;
  try { return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return String(d); }
}

function FilePreviewDialog({ open, onOpenChange, files, title }: {
  open: boolean; onOpenChange: () => void; files: DeliverableFileAttachment[]; title: string;
}) {
  const [activeFile, setActiveFile] = useState<DeliverableFileAttachment | null>(files[0] || null);
  useEffect(() => { if (open && files.length > 0) setActiveFile(files[0]); }, [open, files]);

  const getUrl = (f: DeliverableFileAttachment) => f.cloudinaryUrl || f.filePath;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="truncate">{title}</DialogTitle></DialogHeader>
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No files to preview</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-wrap">
              {files.map((f) => (
                <button key={f.id} onClick={() => setActiveFile(f)}
                  className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap border transition-colors",
                    activeFile?.id === f.id ? "bg-muted border-border font-medium" : "border-transparent hover:bg-muted/50"
                  )}>
                  {f.mimeType?.startsWith("image/") ? <ImageIcon className="h-3.5 w-3.5" /> :
                   f.mimeType?.startsWith("video/") ? <Video className="h-3.5 w-3.5" /> :
                   <FileText className="h-3.5 w-3.5" />}
                  {f.fileName || f.originalName}
                </button>
              ))}
            </div>
            {activeFile && (
              <div className="bg-muted/30 rounded-lg p-2 flex items-center justify-center min-h-[300px]">
                {(() => {
                  const url = getUrl(activeFile);
                  if (!url) {
                    return (
                      <div className="text-center py-12">
                        <File className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground mb-2">File URL not available</p>
                        <p className="text-xs text-muted-foreground/60">The file may still be uploading or processing.</p>
                      </div>
                    );
                  }
                  if (activeFile.mimeType?.startsWith("image/")) {
                    return <img src={url} alt={activeFile.fileName} className="max-w-full max-h-[60vh] object-contain rounded" />;
                  }
                  if (activeFile.mimeType?.startsWith("video/")) {
                    return <video controls className="w-full max-h-[60vh] rounded" src={url} />;
                  }
                  if (activeFile.mimeType?.includes("pdf")) {
                    return <iframe src={url} className="w-full h-[60vh] rounded" title={activeFile.fileName} />;
                  }
                  return (
                    <div className="text-center py-12">
                      <File className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground mb-2">Preview not available</p>
                      <Button variant="outline" size="sm" asChild>
                        <a href={url} download={activeFile.fileName} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-1.5" /> Download
                        </a>
                      </Button>
                    </div>
                  );
                })()}
              </div>
            )}
            <div className="flex justify-end">
              {activeFile && getUrl(activeFile) && (
                <Button variant="outline" size="sm" asChild>
                  <a href={getUrl(activeFile)} download={activeFile.fileName} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-1.5" /> Download
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

// ─── Comments (client-side) ──────────────────────────────────────────────────

function ClientComments({ deliverableId, comments, userId, workspaceId }: {
  deliverableId: string;
  comments: import("@/types").ThreadedComment[];
  userId: string;
  workspaceId: string;
}) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const handleAdd = async () => {
    if (!text.trim()) return;
    try {
      await addComment(deliverableId, userId, { text: text.trim() });
      setText("");
      toast.success("Comment added");
    } catch { toast.error("Failed to add comment"); }
  };

  const handleReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    try {
      await addReply(deliverableId, commentId, userId, { text: replyText.trim() });
      setReplyText("");
      setReplyTo(null);
    } catch { toast.error("Failed to reply"); }
  };

  return (
    <div className="space-y-2">
      <h5 className="text-xs font-medium flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Comments</h5>
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment..." className="text-xs h-8"
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }} />
        <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={!text.trim()}>Send</Button>
      </div>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {comments.map((c) => (
          <div key={c.id} className="text-xs border rounded p-2">
            <p>{c.text}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(c.createdAt)}</p>
            {c.replies?.map((r) => (
              <div key={r.id} className="ml-3 mt-1 pl-2 border-l text-[10px]">
                <p>{r.text}</p>
                <p className="text-muted-foreground">{formatDate(r.createdAt)}</p>
              </div>
            ))}
            {replyTo === c.id ? (
              <div className="flex gap-2 mt-1">
                <Input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply..." className="text-[10px] h-6" />
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => handleReply(c.id)}>Reply</Button>
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setReplyTo(null); setReplyText(""); }}>X</Button>
              </div>
            ) : (
              <button className="text-[10px] text-muted-foreground hover:text-foreground mt-0.5" onClick={() => setReplyTo(c.id)}>Reply</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Payment Proof Upload (client-side) ──────────────────────────────────────

function ClientPaymentProof({ deliverable, userId, workspaceId, onUpdate }: {
  deliverable: Deliverable; userId: string; workspaceId: string; onUpdate: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  if (!deliverable.invoiceSettings?.requirePaymentToView && !deliverable.invoiceSettings?.requirePaymentToDownload) return null;
  if (deliverable.paymentProof?.status === "approved") return (
    <div className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Payment approved</div>
  );

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", deliverable.projectId);
      formData.append("workspaceId", workspaceId);
      const headers = await getApiAuthHeaders(workspaceId);
      const res = await fetch("/api/documents/upload", {
        method: "POST", headers: { ...headers, "x-workspace-id": workspaceId }, body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      await submitPaymentProof(deliverable.id, userId, {
        fileName: file.name, filePath: data.url || data.cloudinaryUrl || data.filePath, fileSize: file.size,
      });
      toast.success("Payment proof uploaded");
      onUpdate();
    } catch { toast.error("Failed to upload"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  return (
    <div className="space-y-2 border rounded p-3">
      <p className="text-xs font-medium flex items-center gap-1"><DollarSign className="h-3 w-3" /> Payment Required</p>
      <p className="text-[10px] text-muted-foreground">Upload proof of payment to view/download this deliverable.</p>
      {deliverable.paymentProof?.status === "pending" ? (
        <p className="text-xs text-warning">Payment proof submitted — awaiting review.</p>
      ) : deliverable.paymentProof?.status === "rejected" ? (
        <div>
          <p className="text-xs text-destructive">Payment rejected: {deliverable.paymentProof.reviewNotes}</p>
        </div>
      ) : (
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="text-xs" />
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload Proof"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Client Version Row ──────────────────────────────────────────────────────

function ClientVersionRow({ version, deliverableId, deliverableTitle, userId, workspaceId, onPreview, onRefresh }: {
  version: import("@/types").DeliverableVersion;
  deliverableId: string;
  deliverableTitle: string;
  userId: string;
  workspaceId: string;
  onPreview: (title: string, files: DeliverableFileAttachment[]) => void;
  onRefresh: () => void;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleApprove = async (comments?: string) => {
    setProcessing(true);
    try {
      await approveVersion(deliverableId, version.id, userId, comments);
      toast.success("Version approved");
      setReviewOpen(false);
      onRefresh();
    } catch (e) { toast.error(`Failed to approve: ${(e as Error)?.message || 'Unknown error'}`); }
    finally { setProcessing(false); }
  };

  const handleRequestRevision = async (reason: string) => {
    setProcessing(true);
    try {
      await requestRevision(deliverableId, version.id, userId, reason);
      toast.success("Revision requested");
      setReviewOpen(false);
      onRefresh();
    } catch (e) { toast.error(`Failed to request revision: ${(e as Error)?.message || 'Unknown error'}`); }
    finally { setProcessing(false); }
  };

  return (
    <div className="flex items-center justify-between p-3 pl-10 hover:bg-accent/30 border-b border-border/50 last:border-b-0">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium">Version {version.versionNumber}</p>
          <p className="text-[10px] text-muted-foreground">{version.files.length} file{version.files.length !== 1 ? "s" : ""} · {formatDate(version.uploadedAt)}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {/* Status badge for non-submitted versions */}
        {version.status === "approved" && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-success/10 text-success">Approved</span>
        )}
        {version.status === "revision_requested" && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-warning/10 text-warning">Revision requested</span>
        )}
        {/* Approve / Revision buttons for submitted versions */}
        {version.status === "submitted" && (
          <>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setReviewOpen(true)}>
              <ThumbsUp className="h-3 w-3" /> Review
            </Button>
          </>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreview(`${deliverableTitle} - V${version.versionNumber}`, version.files)} title="Preview">
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ReviewVersionModal open={reviewOpen} onOpenChange={setReviewOpen}
        onApprove={handleApprove} onRequestRevision={handleRequestRevision} processing={processing} />
    </div>
  );
}

// ─── Review Version Modal (client side) ─────────────────────────────────────

function ReviewVersionModal({
  open, onOpenChange, onApprove, onRequestRevision, processing,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  onApprove: (comments?: string) => void; onRequestRevision: (reason: string) => void;
  processing: boolean;
}) {
  const [mode, setMode] = useState<"approve" | "revision">("approve");
  const [comments, setComments] = useState("");
  const [reason, setReason] = useState("");
  useEffect(() => { if (!open) { setComments(""); setReason(""); setMode("approve"); } }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "approve" ? "Approve Version" : "Request Revision"}</DialogTitle>
          <DialogDescription>
            {mode === "approve" ? "Mark this version as approved." : "Request changes for this version."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 mb-4">
          <Button variant={mode === "approve" ? "default" : "outline"} size="sm" onClick={() => setMode("approve")}>
            <ThumbsUp className="h-4 w-4 mr-1.5" /> Approve
          </Button>
          <Button variant={mode === "revision" ? "default" : "outline"} size="sm" onClick={() => setMode("revision")}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Request Revision
          </Button>
        </div>
        {mode === "approve" ? (
          <div className="space-y-2">
            <Label>Comments (optional)</Label>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Any feedback on the approved version..." rows={2} />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Reason for revision <span className="text-destructive">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe what needs to be changed..." rows={3} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => mode === "approve" ? onApprove(comments) : onRequestRevision(reason)}
            disabled={processing || (mode === "revision" && !reason.trim())}
          >
            {processing ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>) :
              mode === "approve" ? "Approve Version" : "Request Revision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ClientDeliverablesView ─────────────────────────────────────────────

interface ClientDeliverablesViewProps {
  projectId: string;
  workspaceId: string;
  userId: string;
}



export default function ClientDeliverablesView({ projectId, workspaceId, userId }: ClientDeliverablesViewProps) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [previewFiles, setPreviewFiles] = useState<DeliverableFileAttachment[]>([]);
  const [previewTitle, setPreviewTitle] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showDeliveryFlow, setShowDeliveryFlow] = useState(false);

  useEffect(() => {
    getProjectDeliverables(projectId)
      .then(setDeliverables)
      .catch(() => toast.error("Failed to load deliverables"))
      .finally(() => setLoading(false));
  }, [projectId]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const handlePreview = (title: string, files: DeliverableFileAttachment[]) => {
    setPreviewTitle(title);
    setPreviewFiles(files);
    setShowPreview(true);
  };

  if (loading) return <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => (<Skeleton key={i} className="h-14 w-full rounded-lg" />))}</div>;
  if (deliverables.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-lg">
      <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <p className="text-sm font-medium text-muted-foreground mb-1">No deliverables yet</p>
      <p className="text-xs text-muted-foreground/60">
        Your project deliverables will appear here once shared by your team.
      </p>
    </div>
  );

  const allDelivered = deliverables.every((d) => d.finalPackageDelivered);
  const totalFiles = deliverables.reduce((a, d) => a + d.versions.reduce((b, v) => b + v.files.length, 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-base font-semibold">Deliverables</h3>
        <span className="text-xs text-muted-foreground">({deliverables.length} · {totalFiles} files)</span>
      </div>

      {/* Final Package Banner */}
      {allDelivered && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-success/30 bg-success/10">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-success">Final Package Delivered</p>
            <p className="text-xs text-muted-foreground">Your deliverables are ready. You can view and download all files below.</p>
          </div>
          <Button size="sm" variant="default" className="shrink-0 gap-1.5" onClick={() => setShowDeliveryFlow(true)}>
            Share Feedback <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Deliverable List */}
      <div className="space-y-2">
        {deliverables.map((del) => {
          const isExpanded = expanded.has(del.id);
          return (
            <div key={del.id} className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => toggleExpanded(del.id)}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button className="shrink-0 p-0.5">{isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}</button>
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{del.title}</p>
                    <p className="text-xs text-muted-foreground">{del.versions.length} version{del.versions.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-border">
                  {/* Payment Proof */}
                  <div className="px-3 py-2">
                    <ClientPaymentProof deliverable={del} userId={userId} workspaceId={workspaceId} onUpdate={() => {
                      getProjectDeliverables(projectId).then(setDeliverables);
                    }} />
                  </div>

                  {/* Versions */}
                  {del.versions.map((v) => (
                    <ClientVersionRow
                      key={v.id}
                      version={v}
                      deliverableId={del.id}
                      deliverableTitle={del.title}
                      userId={userId}
                      workspaceId={workspaceId}
                      onPreview={handlePreview}
                      onRefresh={() => getProjectDeliverables(projectId).then(setDeliverables)}
                    />
                  ))}

                  {/* Comments */}
                  {del.comments.length > 0 && (
                    <div className="p-3 border-t border-border/50">
                      <ClientComments deliverableId={del.id} comments={del.comments} userId={userId} workspaceId={workspaceId} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <FilePreviewDialog open={showPreview} onOpenChange={() => setShowPreview(false)} files={previewFiles} title={previewTitle} />

      <DeliveryFlowModal
        isOpen={showDeliveryFlow}
        onClose={() => setShowDeliveryFlow(false)}
        deliverables={deliverables}
        projectId={projectId}
        workspaceId={workspaceId}
        userId={userId}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Deliverable, DeliverableFileAttachment, ImageMarkup } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { formatFileSize } from "@/lib/documents";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/lib/cloudinary-config";
import { getApiAuthHeaders } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  getProjectDeliverables,
  createDeliverable,
  addDeliverableVersion,
  approveVersion,
  requestRevision,
  addComment,
  addReply,
  deliverFinalPackage,
  addVideoMoment,
  addImageMarkup,
  submitPaymentProof,
  approvePaymentProof,
  rejectPaymentProof,
} from "@/lib/firebase/project-deliverables";
import {
  Upload,
  Download,
  Eye,
  Package,
  CheckCircle2,
  Send,
  X,
  FileText,
  File,
  Plus,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  MessageSquare,
  Video,
  Image as ImageIcon,
  ThumbsUp,
  RefreshCw,
  DollarSign,
  ShieldCheck,
  Lock,
  Unlock,
  GripVertical,
  Link,
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

// ─── Types ───────────────────────────────────────────────────────────────────

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip,.ai,.psd,.sketch,.fig,.mp4,.mov,.avi,.webm,.wav,.mp3";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  not_submitted: { label: "Not Submitted", color: "hsl(215 16% 60%)", bg: "hsl(217 20% 18%)" },
  submitted: { label: "Submitted", color: "hsl(207 90% 54%)", bg: "hsl(207 90% 54% / 0.15)" },
  under_review: { label: "Under Review", color: "hsl(270 60% 56%)", bg: "hsl(270 60% 56% / 0.15)" },
  needs_revision: { label: "Needs Revision", color: "hsl(38 92% 45%)", bg: "hsl(38 92% 45% / 0.15)" },
  approved: { label: "Approved", color: "hsl(152 55% 38%)", bg: "hsl(152 55% 38% / 0.15)" },
  delivered: { label: "Delivered", color: "hsl(152 55% 38%)", bg: "hsl(152 55% 38% / 0.15)" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Timestamp | Date | string | undefined): string {
  if (!d) return "";
  const date = d instanceof Timestamp ? d.toDate() : typeof d === "string" ? new Date(d) : d;
  try { return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return String(d); }
}

function tsNow(): Timestamp {
  return Timestamp.now();
}

// ─── Create Deliverable Modal ────────────────────────────────────────────────

function CreateDeliverableModal({
  open, onOpenChange, onSave, saving,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; onSave: (d: { title: string; description: string }) => void; saving: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  useEffect(() => { if (open) { setTitle(""); setDescription(""); } }, [open]);
  const handleSubmit = () => {
    if (!title.trim()) { toast.error("Deliverable title is required"); return; }
    onSave({ title: title.trim(), description: description.trim() });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Deliverable</DialogTitle>
          <DialogDescription>Create a new deliverable to share with your client.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="del-title">Title <span className="text-destructive">*</span></Label>
            <Input id="del-title" placeholder="e.g., Logo Design" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="del-desc">Description</Label>
            <Textarea id="del-desc" placeholder="Brief description of this deliverable" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !title.trim()}>
            {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>) : "Create Deliverable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Version Modal ───────────────────────────────────────────────────────

function AddVersionModal({
  open, onOpenChange, onSave, saving,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; onSave: (d: { files: File[]; notes: string }) => void; saving: boolean;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!open) { setFiles([]); setNotes(""); } }, [open]);

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const valid = Array.from(e.target.files).filter((f) => ALLOWED_FILE_TYPES.includes(f.type) || f.type.startsWith("video/") || f.type.startsWith("audio/"));
      if (valid.length !== e.target.files.length) toast.error("Some file types not allowed");
      setFiles((prev) => [...prev, ...valid]);
    }
    if (e.target) e.target.value = "";
  };

  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Version</DialogTitle>
          <DialogDescription>Upload files for this deliverable version.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Files</Label>
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-foreground/30 transition-colors"
            >
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to browse or drag files here</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Files, images, video, audio (max 50MB each)</p>
              <input ref={fileRef} type="file" multiple accept={ACCEPTED_EXTENSIONS} onChange={handleAddFiles} className="hidden" />
            </div>
            {files.length > 0 && (
              <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted text-sm">
                    <File className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate text-foreground">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(f.size)}</span>
                    <button onClick={() => removeFile(i)} className="p-0.5 hover:bg-accent rounded text-muted-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Version Notes</Label>
            <Textarea placeholder="What changed in this version?" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave({ files, notes })} disabled={saving || files.length === 0}>
            {saving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>) : `Upload Version (${files.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Version Preview Modal ───────────────────────────────────────────────────

// ─── Delivery Progress Bar ───────────────────────────────────────────────────

function DeliveryProgressBar({ del: _del }: { del: Deliverable }) {
  const needsPayment = _del.invoiceSettings.requirePaymentToView || _del.invoiceSettings.requirePaymentToDownload;
  const steps: { key: string; label: string; done: boolean; current: boolean }[] = [
    { key: "created", label: "Created", done: _del.versions.length > 0, current: _del.versions.length === 0 },
    { key: "approved", label: "Approved", done: _del.status === "approved" || _del.status === "delivered", current: _del.status !== "approved" && _del.status !== "delivered" && _del.versions.length > 0 },
    { key: "payment", label: "Payment", done: needsPayment ? _del.paymentProof?.status === "approved" : true, current: needsPayment && _del.paymentProof?.status !== "approved" && (_del.status === "approved" || _del.status === "delivered") },
    { key: "delivered", label: "Delivered", done: _del.finalPackageDelivered, current: !_del.finalPackageDelivered && (!needsPayment || _del.paymentProof?.status === "approved") },
    { key: "feedback", label: "Feedback", done: _del.deliveryProgress?.completedSteps?.length > 0, current: _del.finalPackageDelivered && !_del.deliveryProgress?.completedSteps?.length },
  ];

  const currentIdx = steps.findIndex((s) => s.current);

  return (
    <div className="px-3 py-2 border-b border-border/50 bg-muted/5">
      <div className="flex items-center gap-1">
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          const isActive = currentIdx === i || (currentIdx < 0 && s.done);
          const isDone = s.done || (currentIdx >= 0 && i < currentIdx);
          return (
            <div key={s.key} className="flex items-center gap-1 flex-1 min-w-0">
              <div className={cn("flex items-center gap-1", isDone ? "text-success" : isActive ? "text-primary" : "text-muted-foreground/40")}>
                {isDone ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                ) : (
                  <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", isActive ? "bg-primary" : "bg-muted-foreground/20")} />
                )}
                <span className={cn("text-[10px] truncate", isActive && "font-medium")}>{s.label}</span>
              </div>
              {!isLast && <div className={cn("flex-1 h-px mx-1", isDone ? "bg-success/50" : "bg-muted-foreground/10")} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Image Markup Overlay ────────────────────────────────────────────────────

const MARKUP_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

function MarkupOverlay({ markups: _markups, imageRef: _imageRef }: { markups: ImageMarkup[]; imageRef?: React.RefObject<HTMLImageElement | null> }) {
  if (!_markups.length) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {_markups.map((m) => {
        const x = `${m.coordinates.x}%`;
        const y = `${m.coordinates.y}%`;
        const typeIdx = ["annotation", "highlight", "arrow", "shape", "voice_memo", "pen"].indexOf(m.markupType);
        const color = m.content.color || MARKUP_COLORS[typeIdx >= 0 ? typeIdx % MARKUP_COLORS.length : 0];

        switch (m.markupType) {
          case "annotation":
            return (
              <div key={m.id} className="absolute pointer-events-auto group" style={{ left: x, top: y, transform: "translate(-50%, -100%)" }}>
                <div style={{ backgroundColor: color }} className="px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg max-w-[200px] truncate drop-shadow-md">
                  {m.content.text || "Annotation"}
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0" style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `5px solid ${color}` }} />
              </div>
            );

          case "highlight": {
            const w = m.coordinates.width ? `${m.coordinates.width}%` : "10%";
            const h = m.coordinates.height ? `${m.coordinates.height}%` : "10%";
            return (
              <div key={m.id} className="absolute pointer-events-auto group" style={{ left: x, top: y, width: w, height: h, backgroundColor: color, opacity: 0.25, borderRadius: "4px" }} title={m.content.text || ""}>
                {m.content.text && <span className="absolute -top-5 left-0 text-[10px] whitespace-nowrap hidden group-hover:inline" style={{ color }}>{m.content.text}</span>}
              </div>
            );
          }

          case "arrow":
            return (
              <div key={m.id} className="absolute pointer-events-auto" style={{ left: x, top: y }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" className="drop-shadow-md">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            );

          case "shape": {
            const w = m.coordinates.width ? `${m.coordinates.width}%` : "8%";
            const h = m.coordinates.height ? `${m.coordinates.height}%` : "8%";
            const isCircle = m.content.text === "circle" || (!m.coordinates.width && !m.coordinates.height);
            return (
              <div key={m.id} className="absolute pointer-events-auto" style={{ left: x, top: y, width: w, height: h, border: `2px solid ${color}`, borderRadius: isCircle ? "50%" : "4px", backgroundColor: `${color}10` }} title={m.content.text || ""} />
            );
          }

          case "pen": {
            if (!m.coordinates.points?.length && !m.content.path) return null;
            return (
              <svg key={m.id} className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
                {m.coordinates.points?.length ? (
                  <polyline points={m.coordinates.points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={color} strokeWidth={m.content.strokeWidth || 3} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
                ) : (
                  <path d={m.content.path!} fill="none" stroke={color} strokeWidth={m.content.strokeWidth || 3} strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
                )}
              </svg>
            );
          }

          case "voice_memo":
            return (
              <div key={m.id} className="absolute pointer-events-auto group" style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}>
                <div className="p-1.5 rounded-full shadow-md cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: color }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </div>
                {m.content.voiceMemoUrl && (
                  <audio controls className="w-32 h-6 hidden group-hover:block absolute left-full ml-2 top-1/2 -translate-y-1/2" src={m.content.voiceMemoUrl} />
                )}
              </div>
            );

          default:
            return (
              <div key={m.id} className="absolute pointer-events-auto group" style={{ left: x, top: y }}>
                <div className="w-3 h-3 rounded-full border-2 cursor-pointer hover:scale-150 transition-transform" style={{ borderColor: color }} />
              </div>
            );
        }
      })}
    </div>
  );
}

function VersionPreviewModal({
  open, onOpenChange, files, title,
}: {
  open: boolean; onOpenChange: () => void; files: DeliverableFileAttachment[]; title: string;
}) {
  const [activeFile, setActiveFile] = useState<DeliverableFileAttachment | null>(files[0] || null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (open && files.length > 0) setActiveFile(files[0]); }, [open, files]);

  const getDownloadUrl = (f: DeliverableFileAttachment) => f.cloudinaryUrl || f.filePath;

  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  const formatTS = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="truncate">{title}</DialogTitle></DialogHeader>
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No files to preview</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-wrap">
              {files.map((f) => {
                const isActive = f.id === activeFile?.id;
                return (
                  <button key={f.id} onClick={() => setActiveFile(f)}
                    className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap border transition-colors",
                      isActive ? "bg-muted border-border font-medium" : "border-transparent hover:bg-muted/50"
                    )}
                  >
                    {f.mimeType?.startsWith("image/") ? <ImageIcon className="h-3.5 w-3.5" /> :
                     f.mimeType?.startsWith("video/") ? <Video className="h-3.5 w-3.5" /> :
                     <FileText className="h-3.5 w-3.5" />}
                    {f.fileName || f.originalName}
                  </button>
                );
              })}
            </div>
            {activeFile && (
              <div className={cn("bg-muted/30 rounded-lg p-2 flex items-center justify-center min-h-[300px]", (activeFile.imageMarkups?.length || activeFile.videoMoments?.length) ? "relative" : "")}>
                {activeFile.mimeType?.startsWith("image/") ? (
                  <>
                    <img src={getDownloadUrl(activeFile)} alt={activeFile.fileName} className="max-w-full max-h-[60vh] object-contain rounded" />
                    {activeFile.imageMarkups?.length ? (
                      <MarkupOverlay markups={activeFile.imageMarkups} />
                    ) : null}
                  </>
                ) : activeFile.mimeType?.startsWith("video/") ? (
                  <video ref={videoRef} controls className="w-full max-h-[60vh] rounded" src={getDownloadUrl(activeFile)} />
                ) : activeFile.mimeType?.includes("pdf") ? (
                  <iframe src={getDownloadUrl(activeFile)} className="w-full h-[60vh] rounded" title={activeFile.fileName} />
                ) : (
                  <div className="text-center py-12">
                    <File className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">Preview not available for this file type</p>
                    <Button variant="outline" size="sm" asChild>
                      <a href={getDownloadUrl(activeFile)} download={activeFile.fileName} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-1.5" /> Download
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Video moments timeline */}
            {activeFile?.mimeType?.startsWith("video/") && activeFile.videoMoments?.length ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium flex items-center gap-1"><Video className="h-3.5 w-3.5" /> Video Moments</p>
                <div className="flex flex-wrap gap-1.5">
                  {activeFile.videoMoments.map((m) => (
                    <button key={m.id} onClick={() => seekTo(m.timestamp)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] border border-border hover:bg-accent/50 transition-colors group">
                      <span className="font-mono text-primary">{formatTS(m.timestamp)}</span>
                      <span className="text-muted-foreground group-hover:text-foreground truncate max-w-[120px]">{m.comment}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              {activeFile && (
                <Button variant="outline" size="sm" asChild>
                  <a href={getDownloadUrl(activeFile)} download={activeFile.fileName} target="_blank" rel="noopener noreferrer">
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

// ─── Approve/Revision Modal ──────────────────────────────────────────────────

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

// ─── Deliver Final Package Modal ─────────────────────────────────────────────

function DeliverFinalPackageModal({
  open, onOpenChange, onConfirm, saving, deliverableCount,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; onConfirm: () => void; saving: boolean; deliverableCount: number;
}) {
  const [step, setStep] = useState<"confirm" | "success">("confirm");
  useEffect(() => { if (!open) setStep("confirm"); }, [open]);
  const handleConfirm = async () => { await onConfirm(); setStep("success"); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle>Deliver Final Package</DialogTitle>
              <DialogDescription>You are about to deliver {deliverableCount} deliverable{deliverableCount !== 1 ? "s" : ""} to the client as the final package.</DialogDescription>
            </DialogHeader>
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning flex gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>After delivery, the client will be able to view and download all deliverables. They will also go through the delivery flow to provide feedback.</span>
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
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Package Delivered!
              </DialogTitle>
              <DialogDescription>All deliverables have been sent to the client successfully.</DialogDescription>
            </DialogHeader>
            <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
              <Package className="h-10 w-10 mx-auto text-success mb-2" />
              <p className="text-sm font-medium text-success">Final Package Delivered</p>
              <p className="text-xs text-muted-foreground mt-1">The client can now view and download all files and will be guided through the delivery flow.</p>
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

// ─── Payment Proof Section ───────────────────────────────────────────────────

function PaymentProofSection({
  deliverable, workspaceId, userId, isOwner, onUpdate,
}: {
  deliverable: Deliverable; workspaceId: string; userId: string; isOwner: boolean; onUpdate: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showReject, setShowReject] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUploadProof = async () => {
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
        fileName: file.name, filePath: data.cloudinaryUrl || data.filePath, fileSize: file.size,
      });
      toast.success("Payment proof submitted");
      onUpdate();
    } catch { toast.error("Failed to upload payment proof"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const handleApprove = async () => {
    try {
      await approvePaymentProof(deliverable.id, userId);
      toast.success("Payment approved");
      onUpdate();
    } catch { toast.error("Failed to approve payment"); }
  };

  const handleReject = async () => {
    if (!rejectNotes.trim()) { toast.error("Please provide a reason"); return; }
    try {
      await rejectPaymentProof(deliverable.id, userId, rejectNotes);
      toast.success("Payment rejected");
      setShowReject(false);
      onUpdate();
    } catch { toast.error("Failed to reject payment"); }
  };

  const proof = deliverable.paymentProof;
  const needsPayment = deliverable.invoiceSettings.requirePaymentToView || deliverable.invoiceSettings.requirePaymentToDownload;

  if (!needsPayment && !proof) return null;

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <DollarSign className="h-4 w-4" />
        Payment
      </h4>
      {needsPayment && !proof && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">This deliverable requires payment proof before access.</p>
          {!isOwner && (
            <div>
              <input ref={fileRef} type="file" accept="image/*,.pdf" className="text-xs mb-2" onChange={handleUploadProof} />
              <Button size="sm" variant="outline" onClick={handleUploadProof} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload Payment Proof"}
              </Button>
            </div>
          )}
        </div>
      )}
      {proof && (
        <div className="text-xs space-y-2">
          <p>Proof uploaded: {proof.fileName}</p>
          <p className={`font-medium ${proof.status === "approved" ? "text-success" : proof.status === "rejected" ? "text-destructive" : "text-warning"}`}>
            Status: {proof.status}
          </p>
          {isOwner && proof.status === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" variant="default" onClick={handleApprove}><ShieldCheck className="h-3.5 w-3.5 mr-1" /> Approve</Button>
              <Button size="sm" variant="outline" onClick={() => setShowReject(true)} className="text-destructive">Reject</Button>
            </div>
          )}
          {proof.status === "rejected" && proof.reviewNotes && (
            <p className="text-destructive">Reason: {proof.reviewNotes}</p>
          )}
          {showReject && (
            <div className="space-y-2 border-t pt-2 mt-2">
              <Textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} placeholder="Reason for rejection..." rows={2} />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleReject}>Confirm Reject</Button>
                <Button size="sm" variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Comments Section ────────────────────────────────────────────────────────

function CommentsSection({
  deliverable, workspaceId, userId, versionId,
}: {
  deliverable: Deliverable; workspaceId: string; userId: string; versionId?: string;
}) {
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const filteredComments = deliverable.comments.filter(
    (c) => !versionId || c.versionId === versionId
  );

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addComment(deliverable.id, userId, { text: newComment.trim(), versionId });
      setNewComment("");
      toast.success("Comment added");
    } catch { toast.error("Failed to add comment"); }
  };

  const handleAddReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    try {
      await addReply(deliverable.id, commentId, userId, { text: replyText.trim() });
      setReplyText("");
      setReplyTo(null);
    } catch { toast.error("Failed to add reply"); }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Comments {versionId ? "(version-specific)" : ""}
      </h4>
      <div className="flex gap-2">
        <Input value={newComment} onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..." onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }} />
        <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>Send</Button>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {filteredComments.map((c) => (
          <div key={c.id} className="border border-border rounded-lg p-3 text-sm">
            <p>{c.text}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{formatDate(c.createdAt)}</p>
            {c.replies?.map((r) => (
              <div key={r.id} className="ml-4 mt-2 pl-3 border-l-2 border-muted text-xs">
                <p>{r.text}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(r.createdAt)}</p>
              </div>
            ))}
            {replyTo === c.id ? (
              <div className="flex gap-2 mt-2">
                <Input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply..." size={20} className="text-xs h-8"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddReply(c.id); }} />
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { handleAddReply(c.id); }}>Reply</Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setReplyTo(null); setReplyText(""); }}>Cancel</Button>
              </div>
            ) : (
              <button className="text-xs text-muted-foreground hover:text-foreground mt-1" onClick={() => setReplyTo(c.id)}>Reply</button>
            )}
          </div>
        ))}
        {filteredComments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
      </div>
    </div>
  );
}

// ─── Video Moments Panel ─────────────────────────────────────────────────────

function VideoMomentsPanel({
  deliverableId, versionId, file, userId, workspaceId,
}: {
  deliverableId: string; versionId: string; file: DeliverableFileAttachment; userId: string; workspaceId: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [timestamp, setTimestamp] = useState(0);
  const [comment, setComment] = useState("");

  const handleAdd = async () => {
    if (!comment.trim()) return;
    try {
      await addVideoMoment(deliverableId, versionId, file.id, userId, { timestamp, comment: comment.trim() });
      toast.success("Video moment added");
      setShowForm(false);
      setComment("");
      setTimestamp(0);
    } catch { toast.error("Failed to add video moment"); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Video className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">Video Moments ({file.videoMoments?.length || 0})</span>
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setShowForm(!showForm)}>
          + Add Moment
        </Button>
      </div>
      {showForm && (
        <div className="space-y-2 border rounded p-2">
          <div className="flex gap-2 items-center">
            <Label className="text-[10px]">Timestamp (sec)</Label>
            <Input type="number" value={timestamp} onChange={(e) => setTimestamp(Number(e.target.value))} className="h-7 w-20 text-xs" min={0} />
          </div>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment on this moment..." rows={2} className="text-xs" />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd}>Save</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {file.videoMoments?.map((m) => (
        <div key={m.id} className="flex items-start gap-2 text-xs p-2 bg-muted/30 rounded">
          <div className="shrink-0 w-16 text-[10px] text-muted-foreground font-mono">
            {Math.floor(m.timestamp / 60)}:{(m.timestamp % 60).toString().padStart(2, "0")}
          </div>
          <div className="flex-1">
            <p>{m.comment}</p>
            <p className="text-[10px] text-muted-foreground">{formatDate(m.createdAt)} {m.isResolved ? "(resolved)" : ""}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Image Markups Section ───────────────────────────────────────────────────

function ImageMarkupsSection({
  file,
}: {
  file: DeliverableFileAttachment;
}) {
  if (!file.imageMarkups?.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">Markups ({file.imageMarkups.length})</span>
      </div>
      <div className="space-y-1">
        {file.imageMarkups.map((m) => (
          <div key={m.id} className="text-[10px] flex items-center gap-2 p-1.5 bg-muted/20 rounded">
            <span className="capitalize text-muted-foreground">{m.markupType}</span>
            {m.content.text && <span className="truncate">: {m.content.text}</span>}
            <span className="text-muted-foreground">({Math.round(m.coordinates.x)}%, {Math.round(m.coordinates.y)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Payment Gating Toggle ───────────────────────────────────────────────────

function PaymentGateToggle({
  enabled, onChange, label,
}: {
  enabled: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-xs">
      {enabled ? <Lock className="h-3 w-3 text-warning" /> : <Unlock className="h-3 w-3 text-muted-foreground" />}
      <span>{label}</span>
      <input type="checkbox" checked={enabled} onChange={(e) => onChange(e.target.checked)}
        className="ml-auto h-3.5 w-3.5 rounded border-primary text-primary" />
    </label>
  );
}

// ─── Deliverable Version Row ─────────────────────────────────────────────────

function VersionRow({
  version, deliverableId, workspaceId, userId, isOwner, onRefresh, onPreview,
}: {
  version: import("@/types").DeliverableVersion;
  deliverableId: string;
  workspaceId: string;
  userId: string;
  isOwner: boolean;
  onRefresh: () => void;
  onPreview: (versionId: string) => void;
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
    } catch { toast.error("Failed to approve"); }
    finally { setProcessing(false); }
  };

  const handleRequestRevision = async (reason: string) => {
    setProcessing(true);
    try {
      await requestRevision(deliverableId, version.id, userId, reason);
      toast.success("Revision requested");
      setReviewOpen(false);
      onRefresh();
    } catch { toast.error("Failed to request revision"); }
    finally { setProcessing(false); }
  };

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <div className="flex items-center justify-between p-3 pl-10 hover:bg-accent/30 transition-colors">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground">
              Version {version.versionNumber}
              {version.isLatest && <span className="ml-1.5 text-[10px] text-primary font-normal">(latest)</span>}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {formatDate(version.uploadedAt)} · {version.files.length} file{version.files.length !== 1 ? "s" : ""}
              {version.links?.length > 0 && ` · ${version.links.length} link${version.links.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          {version.notes && <p className="text-[10px] text-muted-foreground/70 italic truncate max-w-[200px] hidden md:block">{version.notes}</p>}
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${version.status === "approved" ? "bg-success/10 text-success" : version.status === "revision_requested" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
            {version.status}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreview(version.id)} title="Preview">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {isOwner && version.status === "submitted" && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setReviewOpen(true)} title="Review">
              <ThumbsUp className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {/* Video Moments & Markups for all files in this version */}
      {version.files.some((f) => f.videoMoments?.length > 0 || f.imageMarkups?.length > 0) && (
        <div className="px-10 pb-3 space-y-2">
          {version.files.filter((f) => f.videoMoments?.length > 0).map((f) => (
            <VideoMomentsPanel key={f.id} deliverableId={deliverableId} versionId={version.id} file={f} userId={userId} workspaceId={workspaceId} />
          ))}
          {version.files.filter((f) => f.imageMarkups?.length > 0).map((f) => (
            <ImageMarkupsSection key={f.id} file={f} />
          ))}
        </div>
      )}
      <ReviewVersionModal open={reviewOpen} onOpenChange={setReviewOpen}
        onApprove={handleApprove} onRequestRevision={handleRequestRevision} processing={processing} />
    </div>
  );
}

// ─── Main DeliverablesTab ────────────────────────────────────────────────────

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
  const [showCreate, setShowCreate] = useState(false);
  const [showAddVersion, setShowAddVersion] = useState<string | null>(null);
  const [showVersionPreview, setShowVersionPreview] = useState<{ deliverableId: string; versionId: string } | null>(null);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState<string | null>(null);
  const [videoMomentOpen, setVideoMomentOpen] = useState<string | null>(null);

  const isOwner = true; // TODO: derive from user role / permissions

  const loadDeliverables = useCallback(async () => {
    try {
      const data = await getProjectDeliverables(projectId);
      setDeliverables(data);
    } catch { toast.error("Failed to load deliverables"); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { loadDeliverables(); }, [loadDeliverables]);

  const toggleExpanded = (id: string) => {
    setExpandedDeliverables((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const handleCreateDeliverable = async (data: { title: string; description: string }) => {
    setSaving(true);
    try {
      await createDeliverable(workspaceId, projectId, userId, data);
      toast.success("Deliverable created");
      setShowCreate(false);
      loadDeliverables();
    } catch { toast.error("Failed to create deliverable"); }
    finally { setSaving(false); }
  };

  const handleAddVersion = async (deliverableId: string, data: { files: File[]; notes: string }) => {
    setSavingVersion(true);
    try {
      // Upload files first, then create version record
      const uploadedFiles: DeliverableFileAttachment[] = [];
      for (const file of data.files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", projectId);
        formData.append("workspaceId", workspaceId);
        const headers = await getApiAuthHeaders(workspaceId);
        const res = await fetch("/api/documents/upload", {
          method: "POST", headers: { ...headers, "x-workspace-id": workspaceId }, body: formData,
        });
        if (!res.ok) throw new Error(`Upload failed for ${file.name}`);
        const doc = await res.json();
        const now = tsNow();
        uploadedFiles.push({
          id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          fileName: doc.fileName || file.name,
          originalName: file.name,
          filePath: doc.cloudinaryUrl || doc.filePath || "",
          fileSize: file.size,
          mimeType: file.type,
          uploadedAt: now,
          uploadedBy: userId,
          downloadCount: 0,
          videoMoments: [],
          imageMarkups: [],
        });
      }
      await addDeliverableVersion(deliverableId, userId, { files: uploadedFiles, notes: data.notes, links: [] });
      toast.success("Version uploaded");
      setShowAddVersion(null);
      loadDeliverables();
    } catch (e) { toast.error("Failed to upload version"); }
    finally { setSavingVersion(false); }
  };

  const handleDeliverFinalPackage = async () => {
    setDelivering(true);
    try {
      // Mark all deliverables as delivered
      for (const del of deliverables) {
        await deliverFinalPackage(del.id, userId);
      }
      toast.success("Final package delivered");
      setShowDeliverModal(false);
      onProjectUpdated();
      loadDeliverables();
    } catch { toast.error("Failed to deliver package"); }
    finally { setDelivering(false); }
  };

  const getPreviewFiles = () => {
    if (!showVersionPreview) return [];
    const del = deliverables.find((d) => d.id === showVersionPreview.deliverableId);
    if (!del) return [];
    const v = del.versions.find((v) => v.id === showVersionPreview.versionId);
    return v?.files || [];
  };

  const getPreviewTitle = () => {
    if (!showVersionPreview) return "";
    const del = deliverables.find((d) => d.id === showVersionPreview.deliverableId);
    if (!del) return "";
    const v = del.versions.find((v) => v.id === showVersionPreview.versionId);
    return `${del.title} - Version ${v?.versionNumber || "?"}`;
  };

  const totalFiles = deliverables.reduce((acc, d) => acc + d.versions.reduce((vAcc, v) => vAcc + v.files.length, 0), 0);
  const approvedCount = deliverables.filter((d) => d.status === "approved" || d.status === "delivered").length;
  const allFinalPackageDelivered = deliverables.length > 0 && deliverables.every((d) => d.finalPackageDelivered);

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" /> Create Deliverable
          </Button>
          {!allFinalPackageDelivered && deliverables.length > 0 && (
            <Button variant="default" size="sm" className="gap-1.5" onClick={() => setShowDeliverModal(true)}>
              <Send className="h-3.5 w-3.5" /> Deliver Final Package
            </Button>
          )}
        </div>
      </div>

      {/* ─── Final Package Banner ─── */}
      {allFinalPackageDelivered && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-success/30 bg-success/10">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
          <div>
            <p className="text-sm font-medium text-success">Final Package Delivered</p>
            <p className="text-xs text-muted-foreground">All deliverables have been sent to the client.</p>
          </div>
        </div>
      )}

      {/* ─── Loading ─── */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-16 w-full rounded-lg" />))}</div>
      ) : deliverables.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No deliverables yet</p>
          <p className="text-xs text-muted-foreground/60 mb-4">Create a deliverable and upload files to share with your client.</p>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" /> Create Deliverable
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {deliverables.map((del) => {
            const isExpanded = expandedDeliverables.has(del.id);
            const statusCfg = STATUS_CONFIG[del.status] || STATUS_CONFIG.not_submitted;
            const latestVersion = del.versions[del.versions.length - 1];

            return (
              <div key={del.id} className="border border-border rounded-lg bg-card overflow-hidden">
                {/* Deliverable Header */}
                <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => toggleExpanded(del.id)}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button className="shrink-0 p-0.5 hover:bg-accent rounded">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
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
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
                    {statusCfg.label}
                  </span>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Comments Toggle */}
                    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/50">
                      <button onClick={() => setCommentsOpen(commentsOpen === del.id ? null : del.id)}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                        <MessageSquare className="h-3 w-3" /> {del.comments.length} comments
                      </button>
                      {latestVersion?.files.some(f => f.videoMoments?.length > 0) && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Video className="h-3 w-3" /> {latestVersion.files.reduce((a, f) => a + (f.videoMoments?.length || 0), 0)} moments
                        </span>
                      )}
                    </div>

                    {/* Comments inline */}
                    {commentsOpen === del.id && (
                      <div className="p-3 border-b border-border/50 bg-muted/10">
                        <CommentsSection deliverable={del} workspaceId={workspaceId} userId={userId} />
                      </div>
                    )}

                    {/* Delivery Progress */}
                    <DeliveryProgressBar del={del} />

                    {/* Payment Section */}
                    {del.paymentProof && (
                      <div className="px-3 py-2 border-b border-border/50">
                        <PaymentProofSection deliverable={del} workspaceId={workspaceId} userId={userId} isOwner={isOwner} onUpdate={loadDeliverables} />
                      </div>
                    )}

                    {/* Version List */}
                    {del.versions.map((version) => (
                      <VersionRow key={version.id} version={version} deliverableId={del.id}
                        workspaceId={workspaceId} userId={userId} isOwner={isOwner}
                        onRefresh={loadDeliverables} onPreview={(vid) => setShowVersionPreview({ deliverableId: del.id, versionId: vid })} />
                    ))}
                    {/* Add Version button */}
                    <button onClick={() => setShowAddVersion(del.id)}
                      className="flex items-center gap-2 w-full p-3 pl-10 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors">
                      <Plus className="h-3.5 w-3.5" /> Add Version
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
      <CreateDeliverableModal open={showCreate} onOpenChange={setShowCreate} onSave={handleCreateDeliverable} saving={saving} />
      <AddVersionModal open={!!showAddVersion} onOpenChange={(open) => { if (!open) setShowAddVersion(null); }} onSave={(data) => { if (showAddVersion) handleAddVersion(showAddVersion, data); }} saving={savingVersion} />
      <VersionPreviewModal open={!!showVersionPreview} onOpenChange={() => setShowVersionPreview(null)} files={getPreviewFiles()} title={getPreviewTitle()} />
      <DeliverFinalPackageModal open={showDeliverModal} onOpenChange={setShowDeliverModal} onConfirm={handleDeliverFinalPackage} saving={delivering} deliverableCount={deliverables.length} />
    </div>
  );
}

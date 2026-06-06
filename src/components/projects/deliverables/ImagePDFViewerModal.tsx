"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { ImageMarkup, MarkupType, DeliverableFileAttachment, ThreadedComment } from "@/types";
import {
  addImageMarkup, updateImageMarkup, deleteImageMarkup, addImageMarkupReply,
} from "@/lib/firebase/project-deliverables";

// ─── Constants ──────────────────────────────────────────────────────────────

const MARKUP_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#000000"];
const DEFAULT_COLOR = "#ef4444";
const DEFAULT_STROKE = 3;
const TOOLS: { type: MarkupType; label: string; icon: string }[] = [
  { type: "annotation", label: "Text", icon: "T" },
  { type: "highlight", label: "Highlight", icon: "■" },
  { type: "arrow", label: "Arrow", icon: "→" },
  { type: "pen", label: "Pen", icon: "✏" },
  { type: "shape", label: "Shape", icon: "□" },
  { type: "voice_memo", label: "Voice", icon: "🎤" },
];

// ─── Props ──────────────────────────────────────────────────────────────────

interface ImagePDFViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: DeliverableFileAttachment;
  deliverableId: string;
  versionId: string;
  userId: string;
  isClient?: boolean;
}

// ─── Coordinate helpers ────────────────────────────────────────────────────

function getPercentCoords(
  e: { clientX: number; clientY: number },
  container: HTMLDivElement
): { x: number; y: number } {
  const rect = container.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
    y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
  };
}

function getZoomStyle(zoom: number, pan: { x: number; y: number }): React.CSSProperties {
  return {
    transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
    transformOrigin: "center center",
    transition: "transform 0.1s ease",
  };
}

// ─── Voice Recorder ─────────────────────────────────────────────────────────

function VoiceRecorder({ onSave, onCancel }: { onSave: (url: string) => void; onCancel: () => void }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [uploading, setUploading] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setRecording(true);
    } catch {
      console.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  const uploadAndSave = async () => {
    if (!audioUrl) return;
    setUploading(true);
    try {
      const blob = await fetch(audioUrl).then((r) => r.blob());
      const formData = new FormData();
      formData.append("audio", blob, `voice-${Date.now()}.webm`);

      const res = await fetch("/api/deliverables/upload-voice-memo", {
        method: "POST",
        headers: { Authorization: `Bearer ${await import("@/lib/firebase/client").then((m) => m.auth.currentUser?.getIdToken())}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onSave(data.url);
    } catch (err) {
      console.error("Voice memo upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {!recording && !audioUrl && (
        <Button size="sm" onClick={startRecording} variant="outline">
          🎤 Start Recording
        </Button>
      )}
      {recording && (
        <Button size="sm" onClick={stopRecording} variant="destructive">
          ⬛ Stop
        </Button>
      )}
      {audioUrl && (
        <>
          <audio controls src={audioUrl} className="h-8 w-40" />
          <Button size="sm" onClick={uploadAndSave} disabled={uploading}>
            {uploading ? "Uploading..." : "Save"}
          </Button>
        </>
      )}
      <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
    </div>
  );
}

// ─── Drawing Canvas ─────────────────────────────────────────────────────────

function DrawingCanvas({
  activeTool, activeColor, strokeWidth,
  onDrawComplete, imageContainerRef,
}: {
  activeTool: MarkupType | null;
  activeColor: string;
  strokeWidth: number;
  onDrawComplete: (points: { x: number; y: number }[], path: string) => void;
  imageContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const isDrawing = useRef(false);
  const points = useRef<{ x: number; y: number }[]>([]);
  const pathRef = useRef<SVGPathElement>(null);

  const getPercentFromEvent = useCallback(
    (e: React.MouseEvent) => {
      if (!imageContainerRef.current) return { x: 0, y: 0 };
      return getPercentCoords(e, imageContainerRef.current);
    },
    [imageContainerRef]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== "pen" && activeTool !== "highlight") return;
      isDrawing.current = true;
      const { x, y } = getPercentFromEvent(e);
      points.current = [{ x, y }];
    },
    [activeTool, getPercentFromEvent]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing.current) return;
      const { x, y } = getPercentFromEvent(e);
      points.current.push({ x, y });
      if (pathRef.current) {
        const d = points.current.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
        pathRef.current.setAttribute("d", d);
      }
    },
    [getPercentFromEvent]
  );

  const onMouseUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (points.current.length > 1) {
      const pts = [...points.current];
      const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
      onDrawComplete(pts, d);
    }
    points.current = [];
  }, [onDrawComplete]);

  if (activeTool !== "pen" && activeTool !== "highlight") return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full cursor-crosshair z-10"
      style={{ touchAction: "none" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <path
        ref={pathRef}
        fill="none"
        stroke={activeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={activeTool === "highlight" ? 0.3 : 0.8}
      />
    </svg>
  );
}

// ─── Main Markup Overlay SVG ───────────────────────────────────────────────

function MarkupSVGOverlay({
  markups, onDelete,
}: {
  markups: ImageMarkup[];
  onDelete: (id: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {markups.map((m) => {
        const isHovered = hoveredId === m.id;
        const color = m.content.color || DEFAULT_COLOR;

        return (
          <React.Fragment key={m.id}>
            {/* Annotation */}
            {m.markupType === "annotation" && (
              <div
                className="absolute pointer-events-auto group"
                style={{ left: `${m.coordinates.x}%`, top: `${m.coordinates.y}%`, transform: "translate(-50%, -100%)" }}
                onMouseEnter={() => setHoveredId(m.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div
                  className="px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg max-w-[200px] truncate drop-shadow-md"
                  style={{ backgroundColor: color }}
                >
                  {m.content.text || "Annotation"}
                </div>
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                  style={{
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderTop: `5px solid ${color}`,
                  }}
                />
                {isHovered && (
                  <button
                    className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center"
                    onClick={(e) => { e.stopPropagation(); onDelete(m.id); }}
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {/* Highlight */}
            {m.markupType === "highlight" && (
              <div
                className="absolute pointer-events-auto group rounded"
                style={{
                  left: `${m.coordinates.x}%`, top: `${m.coordinates.y}%`,
                  width: `${m.coordinates.width || 15}%`, height: `${m.coordinates.height || 10}%`,
                  backgroundColor: color, opacity: 0.25,
                }}
                onMouseEnter={() => setHoveredId(m.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {isHovered && (
                  <button
                    className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center z-20"
                    onClick={() => onDelete(m.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {/* Arrow */}
            {m.markupType === "arrow" && (
              <div
                className="absolute pointer-events-auto"
                style={{ left: `${m.coordinates.x}%`, top: `${m.coordinates.y}%` }}
                onMouseEnter={() => setHoveredId(m.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" className="drop-shadow-md">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                {isHovered && (
                  <button
                    className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center"
                    onClick={() => onDelete(m.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {/* Shape */}
            {m.markupType === "shape" && (
              <div
                className="absolute pointer-events-auto"
                style={{
                  left: `${m.coordinates.x}%`, top: `${m.coordinates.y}%`,
                  width: `${m.coordinates.width || 8}%`, height: `${m.coordinates.height || 8}%`,
                  border: `2px solid ${color}`,
                  borderRadius: m.content.text === "circle" ? "50%" : "4px",
                  backgroundColor: `${color}15`,
                }}
                onMouseEnter={() => setHoveredId(m.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {isHovered && (
                  <button
                    className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center z-20"
                    onClick={() => onDelete(m.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            )}

            {/* Pen stroke */}
            {m.markupType === "pen" && m.content.path && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ overflow: "visible" }}
              >
                <path
                  d={m.content.path}
                  fill="none"
                  stroke={color}
                  strokeWidth={m.content.strokeWidth || 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.8}
                />
              </svg>
            )}

            {/* Voice memo */}
            {m.markupType === "voice_memo" && (
              <div
                className="absolute pointer-events-auto group"
                style={{ left: `${m.coordinates.x}%`, top: `${m.coordinates.y}%`, transform: "translate(-50%, -50%)" }}
                onMouseEnter={() => setHoveredId(m.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="p-1.5 rounded-full shadow-md cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: color }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                </div>
                {m.content.voiceMemoUrl && (
                  <div className="hidden group-hover:block absolute left-full ml-2 top-1/2 -translate-y-1/2 z-30">
                    <audio controls src={m.content.voiceMemoUrl} className="h-8 w-40" />
                  </div>
                )}
                {isHovered && (
                  <button
                    className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center z-20"
                    onClick={() => onDelete(m.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Comments Panel ─────────────────────────────────────────────────────────

function CommentsPanel({
  comments, onAddComment, userId,
}: {
  comments: ThreadedComment[];
  onAddComment: (text: string) => void;
  userId: string;
}) {
  const [newComment, setNewComment] = useState("");

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment("");
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-medium px-3 py-2 border-b">Comments</h3>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {comments.length === 0 && (
          <p className="text-xs text-gray-400 text-center pt-4">No comments yet</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="text-xs space-y-1">
            <div className="flex items-center gap-1">
              <span className="font-medium">{c.createdBy.slice(0, 8)}</span>
              <span className="text-gray-400">
                {c.createdAt?.toDate?.().toLocaleString() || ""}
              </span>
            </div>
            <p className="text-gray-700 dark:text-gray-300">{c.text}</p>
            {c.replies?.map((r) => (
              <div key={r.id} className="ml-3 mt-1 p-1.5 bg-gray-50 dark:bg-gray-800 rounded">
                <p className="text-gray-600 dark:text-gray-400">{r.text}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="p-2 border-t flex gap-1">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[32px] text-xs resize-none"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
        />
        <Button size="sm" onClick={handleSubmit} className="self-end">Send</Button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ImagePDFViewerModal({
  open, onOpenChange, file, deliverableId, versionId, userId, isClient,
}: ImagePDFViewerModalProps) {
  // ─── State ──────────────────────────────────────────────────────────────
  const [markups, setMarkups] = useState<ImageMarkup[]>(file.imageMarkups || []);
  const [activeTool, setActiveTool] = useState<MarkupType | null>(null);
  const [activeColor, setActiveColor] = useState(DEFAULT_COLOR);
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [annotationText, setAnnotationText] = useState("");
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [placingPoint, setPlacingPoint] = useState<{ x: number; y: number } | null>(null);
  const [showMarkups, setShowMarkups] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // ─── Derived ─────────────────────────────────────────────────────────────
  const isImage = file.mimeType.startsWith("image/");
  const isPDF = file.mimeType === "application/pdf";
  const fileUrl = file.cloudinaryUrl || file.filePath;

  // ─── Sync markups when file changes ──────────────────────────────────────
  useEffect(() => {
    setMarkups(file.imageMarkups || []);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setActiveTool(null);
  }, [file]);

  // ─── Tool handlers ──────────────────────────────────────────────────────

  const handleToolSelect = (tool: MarkupType) => {
    setActiveTool(activeTool === tool ? null : tool);
    setShowAnnotationInput(false);
    setShowVoiceRecorder(false);
    setPlacingPoint(null);
  };

  const handleImageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool || !imageContainerRef.current) return;
    if (activeTool === "pen" || activeTool === "highlight") return; // handled by DrawingCanvas

    const { x, y } = getPercentCoords(e, imageContainerRef.current);

    if (activeTool === "voice_memo") {
      setPlacingPoint({ x, y });
      setShowVoiceRecorder(true);
      return;
    }

    if (activeTool === "annotation") {
      setPlacingPoint({ x, y });
      setShowAnnotationInput(true);
      return;
    }

    // Arrow, Shape - place immediately
    const markup: Omit<ImageMarkup, "id" | "createdAt" | "createdBy" | "conversation"> = {
      markupType: activeTool,
      coordinates: {
        x, y,
        width: activeTool === "shape" ? 8 : undefined,
        height: activeTool === "shape" ? 8 : undefined,
      },
      content: {
        color: activeColor,
        strokeWidth,
        text: activeTool === "shape" ? "rectangle" : undefined,
      },
    };

    try {
      await addImageMarkup(deliverableId, versionId, file.id || file.fileName, userId, markup);
      // Refresh to get the new markup
      const { getDeliverable } = await import("@/lib/firebase/project-deliverables");
      const del = await getDeliverable(deliverableId);
      if (del) {
        const v = del.versions.find((v) => v.id === versionId);
        if (v) {
          const f = v.files.find((f) => f.id === file.id || f.fileName === file.fileName);
          if (f) setMarkups(f.imageMarkups || []);
        }
      }
    } catch (err) {
      console.error("Failed to add markup:", err);
    }
  };

  const handleSaveAnnotation = async () => {
    if (!placingPoint || !annotationText.trim()) return;
    try {
      await addImageMarkup(deliverableId, versionId, file.id || file.fileName, userId, {
        markupType: "annotation",
        coordinates: { x: placingPoint.x, y: placingPoint.y },
        content: { text: annotationText.trim(), color: activeColor },
      });
      setShowAnnotationInput(false);
      setAnnotationText("");
      setPlacingPoint(null);
      setActiveTool(null);
      // Refresh
      const { getDeliverable } = await import("@/lib/firebase/project-deliverables");
      const del = await getDeliverable(deliverableId);
      if (del) {
        const v = del.versions.find((v) => v.id === versionId);
        if (v) {
          const f = v.files.find((f) => f.id === file.id || f.fileName === file.fileName);
          if (f) setMarkups(f.imageMarkups || []);
        }
      }
    } catch (err) {
      console.error("Failed to save annotation:", err);
    }
  };

  const handleSaveVoiceMemo = async (voiceMemoUrl: string) => {
    if (!placingPoint) return;
    try {
      await addImageMarkup(deliverableId, versionId, file.id || file.fileName, userId, {
        markupType: "voice_memo",
        coordinates: { x: placingPoint.x, y: placingPoint.y },
        content: { voiceMemoUrl, color: activeColor },
      });
      setShowVoiceRecorder(false);
      setPlacingPoint(null);
      setActiveTool(null);
      // Refresh
      const { getDeliverable } = await import("@/lib/firebase/project-deliverables");
      const del = await getDeliverable(deliverableId);
      if (del) {
        const v = del.versions.find((v) => v.id === versionId);
        if (v) {
          const f = v.files.find((f) => f.id === file.id || f.fileName === file.fileName);
          if (f) setMarkups(f.imageMarkups || []);
        }
      }
    } catch (err) {
      console.error("Failed to save voice memo:", err);
    }
  };

  const handleDeleteMarkup = async (markupId: string) => {
    try {
      await deleteImageMarkup(deliverableId, versionId, file.id || file.fileName, markupId);
      setMarkups((prev) => prev.filter((m) => m.id !== markupId));
    } catch (err) {
      console.error("Failed to delete markup:", err);
    }
  };

  const handleDrawComplete = async (points: { x: number; y: number }[], path: string) => {
    if (!activeTool) return;
    try {
      await addImageMarkup(deliverableId, versionId, file.id || file.fileName, userId, {
        markupType: activeTool,
        coordinates: {
          x: points[0].x,
          y: points[0].y,
          points,
        },
        content: { path, color: activeColor, strokeWidth },
      });
      // Refresh
      const { getDeliverable } = await import("@/lib/firebase/project-deliverables");
      const del = await getDeliverable(deliverableId);
      if (del) {
        const v = del.versions.find((v) => v.id === versionId);
        if (v) {
          const f = v.files.find((f) => f.id === file.id || f.fileName === file.fileName);
          if (f) setMarkups(f.imageMarkups || []);
        }
      }
    } catch (err) {
      console.error("Failed to save drawing:", err);
    }
  };

  const clearAllMarkups = async () => {
    for (const m of markups) {
      await deleteImageMarkup(deliverableId, versionId, file.id || file.fileName, m.id);
    }
    setMarkups([]);
  };

  // ─── Pan / Zoom ──────────────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.1, Math.min(10, z * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 gap-0">
        <DialogHeader className="px-4 py-2 border-b flex flex-row items-center justify-between">
          <DialogTitle className="text-sm truncate max-w-[300px]">
            {file.originalName || file.fileName}
          </DialogTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setZoom((z) => z * 1.2)}>🔍+</Button>
            <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.max(0.1, z / 1.2))}>🔍−</Button>
            <Button variant="ghost" size="sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>↺</Button>
            <Separator orientation="vertical" className="h-4 mx-1" />
            <Button variant="ghost" size="sm" onClick={() => setShowMarkups(!showMarkups)}>
              {showMarkups ? "Hide" : "Show"} Markups
            </Button>
            {markups.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllMarkups} className="text-red-500">
                Clear All
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex h-[calc(95vh-48px)]">
          {/* Left: Toolbar */}
          <div className="w-12 border-r flex flex-col items-center py-2 gap-1 bg-gray-50 dark:bg-gray-900">
            {TOOLS.map((tool) => (
              <button
                key={tool.type}
                onClick={() => handleToolSelect(tool.type)}
                className={`w-8 h-8 flex items-center justify-center rounded text-xs transition-colors ${
                  activeTool === tool.type
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
            <Separator className="my-1 w-6" />
            {/* Color picker */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="w-6 h-6 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: activeColor }}
                  title="Color"
                />
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="grid grid-cols-4 gap-1">
                  {MARKUP_COLORS.map((c) => (
                    <button
                      key={c}
                      className={`w-8 h-8 rounded-full border-2 ${activeColor === c ? "border-gray-800" : "border-gray-200"}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setActiveColor(c)}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {/* Stroke width */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-8 h-8 flex items-center justify-center text-[10px] hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Stroke">
                  {strokeWidth}px
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-2">
                <Input
                  type="range"
                  min={1}
                  max={20}
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                />
                <span className="text-xs text-gray-500">{strokeWidth}px</span>
              </PopoverContent>
            </Popover>
          </div>

          {/* Center: Image Viewer */}
          <div className="flex-1 relative overflow-hidden bg-gray-100 dark:bg-gray-800">
            {isImage && fileUrl && (
              <div
                ref={imageContainerRef}
                className="w-full h-full flex items-center justify-center cursor-crosshair overflow-hidden"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={handleImageClick}
                style={{ cursor: activeTool ? "crosshair" : isDragging ? "grabbing" : "default" }}
              >
                <div style={getZoomStyle(zoom, pan)} className="relative">
                  <img
                    ref={imgRef}
                    src={fileUrl}
                    alt={file.originalName || "Preview"}
                    className="max-w-full max-h-[80vh] object-contain select-none"
                    draggable={false}
                  />
                  {showMarkups && (
                    <MarkupSVGOverlay markups={markups} onDelete={handleDeleteMarkup} />
                  )}
                  <DrawingCanvas
                    activeTool={activeTool}
                    activeColor={activeColor}
                    strokeWidth={strokeWidth}
                    onDrawComplete={handleDrawComplete}
                    imageContainerRef={imageContainerRef}
                  />
                </div>
              </div>
            )}

            {isPDF && fileUrl && (
              <iframe
                src={fileUrl}
                className="w-full h-full"
                title="PDF Viewer"
              />
            )}

            {/* Annotation input overlay */}
            {showAnnotationInput && placingPoint && (
              <div
                className="absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border p-2"
                style={{
                  left: `${placingPoint.x}%`,
                  top: `${placingPoint.y}%`,
                  transform: "translate(-50%, -110%)",
                }}
              >
                <Textarea
                  value={annotationText}
                  onChange={(e) => setAnnotationText(e.target.value)}
                  placeholder="Type your comment..."
                  className="w-48 min-h-[60px] text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveAnnotation(); }
                    if (e.key === "Escape") { setShowAnnotationInput(false); setAnnotationText(""); setPlacingPoint(null); }
                  }}
                />
                <div className="flex gap-1 mt-1 justify-end">
                  <Button size="sm" onClick={handleSaveAnnotation}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowAnnotationInput(false); setAnnotationText(""); setPlacingPoint(null); }}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Voice recorder overlay */}
            {showVoiceRecorder && (
              <div
                className="absolute z-50"
                style={{
                  left: `${placingPoint?.x || 50}%`,
                  top: `${placingPoint?.y || 50}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <VoiceRecorder
                  onSave={handleSaveVoiceMemo}
                  onCancel={() => { setShowVoiceRecorder(false); setPlacingPoint(null); }}
                />
              </div>
            )}
          </div>

          {/* Right: Comments */}
          <div className="w-72 border-l bg-white dark:bg-gray-900 flex flex-col">
            <CommentsPanel
              comments={markups.flatMap((m) => m.conversation || [])}
              onAddComment={async (text) => {
                if (markups.length > 0) {
                  await addImageMarkupReply(
                    deliverableId, versionId, file.id || file.fileName,
                    markups[markups.length - 1].id, userId, { text }
                  );
                }
              }}
              userId={userId}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

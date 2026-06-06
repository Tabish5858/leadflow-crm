"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { VideoMoment, DeliverableFileAttachment, ThreadedComment } from "@/types";
import {
  addVideoMoment, updateVideoMoment, deleteVideoMoment, addVideoMomentReply, toggleVideoMomentResolution,
} from "@/lib/firebase/project-deliverables";

// ─── Props ──────────────────────────────────────────────────────────────────

interface VideoViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: DeliverableFileAttachment;
  deliverableId: string;
  versionId: string;
  userId: string;
  isClient?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function VideoViewerModal({
  open, onOpenChange, file, deliverableId, versionId, userId, isClient,
}: VideoViewerModalProps) {
  // ─── State ──────────────────────────────────────────────────────────────
  const [moments, setMoments] = useState<VideoMoment[]>(file.videoMoments || []);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showAddMoment, setShowAddMoment] = useState(false);
  const [momentTitle, setMomentTitle] = useState("");
  const [momentComment, setMomentComment] = useState("");
  const [editingMomentId, setEditingMomentId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [activeMomentId, setActiveMomentId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // ─── Derived ─────────────────────────────────────────────────────────────
  const isVideo = file.mimeType.startsWith("video/");
  const isAudio = file.mimeType.startsWith("audio/");
  const fileUrl = file.cloudinaryUrl || file.filePath;

  // ─── Sync ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMoments(file.videoMoments || []);
  }, [file]);

  // ─── Time update handler ─────────────────────────────────────────────────
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // ─── Seek to moment ──────────────────────────────────────────────────────
  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  // ─── Add moment ──────────────────────────────────────────────────────────
  const handleAddMoment = async () => {
    if (!momentComment.trim()) return;

    try {
      await addVideoMoment(deliverableId, versionId, file.id || file.fileName, userId, {
        timestamp: currentTime,
        comment: momentComment.trim(),
        title: momentTitle.trim() || undefined,
      });
      setMomentTitle("");
      setMomentComment("");
      setShowAddMoment(false);

      // Refresh moments
      const { getDeliverable } = await import("@/lib/firebase/project-deliverables");
      const del = await getDeliverable(deliverableId);
      if (del) {
        const v = del.versions.find((v) => v.id === versionId);
        if (v) {
          const f = v.files.find((f) => f.id === file.id || f.fileName === file.fileName);
          if (f) setMoments(f.videoMoments || []);
        }
      }
    } catch (err) {
      console.error("Failed to add moment:", err);
    }
  };

  // ─── Delete moment ─────────────────────────────────────────────────────
  const handleDeleteMoment = async (momentId: string) => {
    try {
      await deleteVideoMoment(deliverableId, versionId, file.id || file.fileName, momentId);
      setMoments((prev) => prev.filter((m) => m.id !== momentId));
    } catch (err) {
      console.error("Failed to delete moment:", err);
    }
  };

  // ─── Toggle resolve ─────────────────────────────────────────────────────
  const handleToggleResolve = async (momentId: string, isResolved: boolean) => {
    try {
      await toggleVideoMomentResolution(deliverableId, versionId, file.id || file.fileName, momentId, !isResolved);
      setMoments((prev) =>
        prev.map((m) => (m.id === momentId ? { ...m, isResolved: !isResolved } : m))
      );
    } catch (err) {
      console.error("Failed to toggle resolution:", err);
    }
  };

  // ─── Reply to moment ────────────────────────────────────────────────────
  const handleReply = async (momentId: string) => {
    const text = replyText[momentId]?.trim();
    if (!text) return;

    try {
      await addVideoMomentReply(deliverableId, versionId, file.id || file.fileName, momentId, userId, { text });
      setReplyText((prev) => ({ ...prev, [momentId]: "" }));

      // Refresh
      const { getDeliverable } = await import("@/lib/firebase/project-deliverables");
      const del = await getDeliverable(deliverableId);
      if (del) {
        const v = del.versions.find((v) => v.id === versionId);
        if (v) {
          const f = v.files.find((f) => f.id === file.id || f.fileName === file.fileName);
          if (f) setMoments(f.videoMoments || []);
        }
      }
    } catch (err) {
      console.error("Failed to add reply:", err);
    }
  };

  // ─── Timeline click ────────────────────────────────────────────────────
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const time = ratio * duration;
      seekTo(time);
    },
    [duration]
  );

  // ─── Render timeline markers ─────────────────────────────────────────────
  const renderTimelineMarkers = () => {
    if (!duration || moments.length === 0) return null;
    return moments.map((m) => {
      const pos = (m.timestamp / duration) * 100;
      return (
        <div
          key={m.id}
          className="absolute top-0 w-2 h-full cursor-pointer z-10 group"
          style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
          onClick={() => seekTo(m.timestamp)}
          title={`${m.title || "Moment"} at ${formatTimestamp(m.timestamp)}`}
        >
          <div
            className={`w-2 h-2 rounded-full mx-auto mt-0.5 ${
              m.isResolved ? "bg-green-500" : "bg-yellow-400"
            }`}
          />
          <div className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1 py-0.5 rounded whitespace-nowrap z-20">
            {formatTimestamp(m.timestamp)} - {m.title || m.comment.slice(0, 30)}
          </div>
        </div>
      );
    });
  };

  // ─── Render moment card ─────────────────────────────────────────────────
  const renderMoment = (m: VideoMoment) => (
    <div
      key={m.id}
      className={`p-2 rounded-lg text-xs border cursor-pointer transition-colors ${
        activeMomentId === m.id
          ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
      } ${m.isResolved ? "opacity-60" : ""}`}
      onClick={() => { setActiveMomentId(m.id); seekTo(m.timestamp); }}
    >
      <div className="flex items-center justify-between mb-1">
        <button
          className="text-[10px] font-mono bg-gray-800 text-white px-1.5 py-0.5 rounded"
          onClick={(e) => { e.stopPropagation(); seekTo(m.timestamp); }}
        >
          {formatTimestamp(m.timestamp)}
        </button>
        <div className="flex gap-1">
          <button
            className={`text-[10px] px-1 rounded ${m.isResolved ? "text-green-600 bg-green-50" : "text-gray-400"}`}
            onClick={(e) => { e.stopPropagation(); handleToggleResolve(m.id, m.isResolved); }}
          >
            {m.isResolved ? "✓ Resolved" : "○ Resolve"}
          </button>
          {m.createdBy === userId && (
            <button
              className="text-[10px] text-red-400 hover:text-red-600"
              onClick={(e) => { e.stopPropagation(); handleDeleteMoment(m.id); }}
            >
              ×
            </button>
          )}
        </div>
      </div>
      {m.title && <p className="font-medium text-gray-900 dark:text-gray-100 mb-0.5">{m.title}</p>}
      <p className="text-gray-600 dark:text-gray-400 mb-1">{m.comment}</p>

      {/* Conversation */}
      {m.conversation?.map((reply) => (
        <div key={reply.id} className="ml-2 mt-1 p-1.5 bg-gray-50 dark:bg-gray-800 rounded">
          <p className="text-gray-600 dark:text-gray-400">{reply.text}</p>
          {reply.voiceMemoUrl && (
            <audio controls src={reply.voiceMemoUrl} className="h-6 w-32 mt-1" />
          )}
        </div>
      ))}

      {/* Reply input */}
      <div className="flex gap-1 mt-1">
        <input
          value={replyText[m.id] || ""}
          onChange={(e) => setReplyText((prev) => ({ ...prev, [m.id]: e.target.value }))}
          placeholder="Reply..."
          className="flex-1 text-[10px] border rounded px-1 py-0.5 bg-transparent"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleReply(m.id); } }}
        />
        <button
          className="text-[10px] text-blue-500"
          onClick={() => handleReply(m.id)}
        >
          Reply
        </button>
      </div>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 gap-0">
        <DialogHeader className="px-4 py-2 border-b flex flex-row items-center justify-between">
          <DialogTitle className="text-sm truncate max-w-[300px]">
            {file.originalName || file.fileName}
          </DialogTitle>
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "Show Sidebar" : "Hide Sidebar"}
          </Button>
        </DialogHeader>

        <div className="flex h-[calc(95vh-48px)]">
          {/* Left: Moments sidebar */}
          <div
            className={`${
              collapsed ? "w-12" : "w-72"
            } border-r bg-gray-50 dark:bg-gray-900 flex flex-col transition-all duration-200`}
          >
            <div className="p-2 border-b flex items-center justify-between">
              <span className="text-xs font-medium">
                {collapsed ? `${moments.length}` : `Moments (${moments.length})`}
              </span>
              {!collapsed && (
                <Button size="sm" variant="ghost" onClick={() => setShowAddMoment(true)} className="text-xs">
                  + Add
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {collapsed ? (
                <div className="flex flex-col items-center gap-2">
                  {moments.map((m) => (
                    <button
                      key={m.id}
                      className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700 text-[9px] font-mono flex items-center justify-center hover:bg-gray-300"
                      onClick={() => seekTo(m.timestamp)}
                      title={`${formatTimestamp(m.timestamp)} - ${m.title || m.comment}`}
                    >
                      {formatTimestamp(m.timestamp)}
                    </button>
                  ))}
                </div>
              ) : moments.length === 0 ? (
                <p className="text-xs text-gray-400 text-center pt-4">No moments yet</p>
              ) : (
                moments.map(renderMoment)
              )}
            </div>
          </div>

          {/* Center: Media Player */}
          <div className="flex-1 flex flex-col bg-black">
            <div className="flex-1 flex items-center justify-center">
              {fileUrl && (isVideo || isAudio) && (
                <video
                  ref={videoRef}
                  src={fileUrl}
                  className="max-w-full max-h-[70vh]"
                  controls
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                />
              )}
            </div>

            {/* Timeline with markers */}
            <div className="px-4 pb-3">
              <div
                ref={progressRef}
                className="relative h-6 bg-gray-700 rounded cursor-pointer flex items-center"
                onClick={handleTimelineClick}
              >
                {/* Progress */}
                <div
                  className="absolute left-0 top-0 h-full bg-blue-500 rounded-l"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
                {/* Current time dot */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow z-10"
                  style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%`, marginLeft: "-6px" }}
                />
                {/* Moment markers */}
                {renderTimelineMarkers()}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>{formatTimestamp(currentTime)}</span>
                <span>{formatTimestamp(duration)}</span>
              </div>

              {/* Add moment overlay */}
              {showAddMoment && (
                <div className="mt-2 p-2 bg-gray-800 rounded-lg">
                  <p className="text-[10px] text-gray-400 mb-1">
                    Adding moment at {formatTimestamp(currentTime)}
                  </p>
                  <input
                    value={momentTitle}
                    onChange={(e) => setMomentTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="w-full text-xs bg-gray-700 rounded px-2 py-1 mb-1 text-white placeholder-gray-400"
                  />
                  <Textarea
                    value={momentComment}
                    onChange={(e) => setMomentComment(e.target.value)}
                    placeholder="Describe what needs feedback..."
                    className="w-full text-xs bg-gray-700 rounded px-2 py-1 mb-1 text-white placeholder-gray-400 min-h-[60px]"
                  />
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" onClick={handleAddMoment}>Save Moment</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddMoment(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: General Comments */}
          {!collapsed && (
            <div className="w-72 border-l bg-white dark:bg-gray-900 flex flex-col">
              <div className="p-2 border-b">
                <span className="text-xs font-medium">General Comments</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                <p className="text-xs text-gray-400 text-center pt-4">
                  Use moments (left sidebar) to add timestamped feedback
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

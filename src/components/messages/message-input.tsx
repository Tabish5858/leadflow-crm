"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, Loader2, Paperclip, X, File, Reply, Mic } from "lucide-react";
import { VoiceRecorder } from "./voice-recorder";

interface MessageInputProps {
  onSend: (body: string, attachment?: {
    type: "image" | "document" | "voice";
    url: string;
    name: string;
    size: number;
    mimeType: string;
    duration?: number;
  }, replyTo?: string, replyPreview?: string) => Promise<void>;
  placeholder?: string;
  uploading?: boolean;
  onFileSelect?: (file: File) => void;
  pendingFile?: File | null;
  onClearFile?: () => void;
  replyTo?: string | null;
  replyPreview?: string | null;
  onCancelReply?: () => void;
  onVoiceRecording?: (blob: Blob, duration: number) => Promise<{ type: "voice"; url: string; name: string; size: number; mimeType: string; duration?: number }>;
}

export function MessageInput({
  onSend,
  placeholder = "Type a message...",
  uploading = false,
  pendingFile,
  onClearFile,
  replyTo,
  replyPreview,
  onCancelReply,
  onVoiceRecording,
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [recording, setRecording] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await onSend(trimmed, undefined, replyTo || undefined, replyPreview || undefined);
      setValue("");
      inputRef.current?.focus();
    } catch {
      // Error handled by parent via toast
    } finally {
      setSending(false);
    }
  };

  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleVoiceRecordingComplete = useCallback(
    async (blob: Blob, duration: number) => {
      if (!onVoiceRecording) return;
      setRecording(false);
      setShowVoiceRecorder(false);
      try {
        const attachment = await onVoiceRecording(blob, duration);
        await onSend(`Voice message (${Math.round(duration)}s)`, attachment, replyTo || undefined, replyPreview || undefined);
      } catch {
        // Error handled by parent
      }
    },
    [onVoiceRecording, onSend, replyTo, replyPreview]
  );

  const handleCancelVoice = useCallback(() => {
    setShowVoiceRecorder(false);
    setRecording(false);
  }, []);

  const isLoading = sending || uploading;

  return (
    <div className="space-y-2">
      {/* Reply preview banner */}
      {replyTo && replyPreview && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 border-l-2 border-primary px-3 py-2">
          <Reply className="h-3.5 w-3.5 shrink-0 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-primary">Replying to message</p>
            <p className="text-xs text-muted-foreground truncate">{replyPreview}</p>
          </div>
          {onCancelReply && (
            <button onClick={onCancelReply} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Pending file preview */}
      {pendingFile && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-xs">
          <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate text-muted-foreground">{pendingFile.name}</span>
          <span className="text-[10px] text-muted-foreground">
            {(pendingFile.size / 1024).toFixed(0)} KB
          </span>
          {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
          {!uploading && onClearFile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={onClearFile} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Remove file</p></TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Voice recorder */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onRecordingComplete={handleVoiceRecordingComplete}
          onCancel={handleCancelVoice}
        />
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        {/* File upload button */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const event = new CustomEvent("message-file-selected", { detail: file });
              window.dispatchEvent(event);
            }
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={handleFileClick}
          disabled={isLoading || recording}
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        {/* Voice recorder toggle */}
        {onVoiceRecording && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`shrink-0 ${recording ? "text-red-500" : ""}`}
            onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
            disabled={isLoading}
            title="Record voice message"
          >
            <Mic className="h-4 w-4" />
          </Button>
        )}

        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={pendingFile ? "Add a caption (optional)..." : placeholder}
          className="flex-1"
          disabled={isLoading || recording}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button
          type="submit"
          disabled={(!value.trim() && !pendingFile) || isLoading || recording}
          size="icon"
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}

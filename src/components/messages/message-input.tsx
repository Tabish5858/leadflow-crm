"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Paperclip, X, File } from "lucide-react";

interface MessageInputProps {
  onSend: (body: string, attachment?: {
    type: "image" | "document";
    url: string;
    name: string;
    size: number;
    mimeType: string;
  }) => Promise<void>;
  placeholder?: string;
  uploading?: boolean;
  onFileSelect?: (file: File) => void;
  pendingFile?: File | null;
  onClearFile?: () => void;
}

export function MessageInput({
  onSend,
  placeholder = "Type a message...",
  uploading = false,
  pendingFile,
  onClearFile,
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await onSend(trimmed);
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

  const isLoading = sending || uploading;

  return (
    <div className="space-y-2">
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
            <button onClick={onClearFile} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
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
              // Pass file up to parent for upload + send
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
          disabled={isLoading}
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={pendingFile ? "Add a caption (optional)..." : placeholder}
          className="flex-1"
          disabled={isLoading}
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
          disabled={(!value.trim() && !pendingFile) || isLoading}
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

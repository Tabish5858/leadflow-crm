"use client";

import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export type InlineEditType = "text" | "number" | "name" | "date" | "email" | "url" | "checkbox";

export interface InlineEditCellProps {
  type: InlineEditType;
  /** For simple types (text, number, date, email, url) */
  value?: string | number | null;
  /** For name type */
  firstName?: string;
  lastName?: string;
  /** For checkbox type */
  checked?: boolean;
  /** Called with the new value. For "name" type, value is { firstName, lastName }. */
  onSave: (value: unknown) => Promise<void>;
  /** Placeholder shown when value is empty */
  placeholder?: string;
  /** Custom display text (overrides default display of `value`) */
  displayValue?: string;
  className?: string;
}

export function InlineEditCell({
  type,
  value,
  firstName,
  lastName,
  checked,
  onSave,
  placeholder = "—",
  displayValue,
  className,
}: InlineEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Start editing ────────────────────────────────────────────────────
  const startEditing = useCallback(() => {
    if (type === "checkbox") return;
    setEditing(true);
    if (type === "name") {
      setEditFirstName(firstName || "");
      setEditLastName(lastName || "");
    } else {
      setEditValue(value != null ? String(value) : "");
    }
  }, [type, value, firstName, lastName]);

  // ─── Save ─────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (type === "name") {
        await onSave({
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
        });
      } else {
        const trimmed = editValue.trim();
        if (type === "number") {
          await onSave(trimmed ? Number(trimmed) : null);
        } else {
          await onSave(trimmed || null);
        }
      }
      setEditing(false);
    } catch {
      // Stay in edit mode on error — user can retry or Escape to cancel
    } finally {
      setSaving(false);
    }
  }, [saving, type, editValue, editFirstName, editLastName, onSave]);

  // ─── Keyboard handlers ────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        setEditing(false);
      }
    },
    [handleSave]
  );

  // ─── Blur: save only if focus leaves the container entirely ───────────
  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (containerRef.current?.contains(e.relatedTarget as Node)) return;
      handleSave();
    },
    [handleSave]
  );

  // ─── Checkbox toggle ──────────────────────────────────────────────────
  const handleCheckChange = useCallback(
    async (val: boolean) => {
      setSaving(true);
      try {
        await onSave(val);
      } finally {
        setSaving(false);
      }
    },
    [onSave]
  );

  // ─── Render: display mode ─────────────────────────────────────────────
  if (!editing) {
    if (type === "name") {
      const displayName = [firstName, lastName].filter(Boolean).join(" ") || placeholder;
      return (
        <span
          onClick={startEditing}
          onKeyDown={(e) => { if (e.key === "Enter") startEditing(); }}
          className={cn(
            "cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors",
            !firstName && !lastName && "text-muted-foreground/50",
            className
          )}
          role="button"
          tabIndex={0}
        >
          {displayName}
        </span>
      );
    }
    if (type === "checkbox") {
      return (
        <span className={cn("inline-flex", className)}>
          <Checkbox checked={checked} onCheckedChange={handleCheckChange} disabled={saving} />
        </span>
      );
    }
    const displayText = displayValue ?? (value != null && value !== "" ? String(value) : null);

    if (!displayText) {
      return (
        <span
          onClick={startEditing}
          onKeyDown={(e) => { if (e.key === "Enter") startEditing(); }}
          className={cn(
            "cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors text-muted-foreground/50",
            className
          )}
          role="button"
          tabIndex={0}
        >
          {placeholder}
        </span>
      );
    }

    // URL type — show truncated link + external + copy
    if (type === "url") {
      const href = displayText.startsWith("http") ? displayText : `https://${displayText}`;
      return (
        <span className={cn("inline-flex items-center gap-1 max-w-[200px] group", className)}>
          <span
            onClick={startEditing}
            onKeyDown={(e) => { if (e.key === "Enter") startEditing(); }}
            className="cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors truncate flex-1 min-w-0"
            role="button"
            tabIndex={0}
            title={displayText}
          >
            {displayText}
          </span>
          <span className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
            >
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(displayText);
                toast.success("Copied to clipboard");
              }}
              className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
            >
              <Copy className="h-3 w-3 text-muted-foreground" />
            </button>
          </span>
        </span>
      );
    }

    return (
      <span className={cn("inline-flex items-center gap-1 group max-w-[200px]", className)}>
        <span
          onClick={startEditing}
          onKeyDown={(e) => { if (e.key === "Enter") startEditing(); }}
          className="cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors truncate flex-1 min-w-0"
          role="button"
          tabIndex={0}
          title={displayText}
        >
          {displayText}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(displayText);
            toast.success("Copied to clipboard");
          }}
          className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
        >
          <Copy className="h-3 w-3 text-muted-foreground" />
        </button>
      </span>
    );
  }

  // ─── Render: edit mode ────────────────────────────────────────────────
  if (type === "name") {
    return (
      <div ref={containerRef} className={cn("flex gap-1.5 min-w-[200px]", className)} onBlur={handleBlur}>
        <Input
          value={editFirstName}
          onChange={(e) => setEditFirstName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="First name"
          className="h-7 text-xs px-2 py-0 flex-1"
          disabled={saving}
          autoFocus
        />
        <Input
          value={editLastName}
          onChange={(e) => setEditLastName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Last name"
          className="h-7 text-xs px-2 py-0 flex-1"
          disabled={saving}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} onBlur={handleBlur} className={className}>
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        type={
          type === "number" ? "number" :
          type === "email" ? "email" :
          type === "url" ? "url" :
          type === "date" ? "date" :
          "text"
        }
        placeholder={placeholder}
        className="h-7 text-xs px-2 py-0"
        disabled={saving}
        autoFocus
      />
    </div>
  );
}

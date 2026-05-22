"use client";

import { cn } from "@/lib/utils";
import { X, Video, CheckCircle, AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

// ─── Variant styles ─────────────────────────────────────────────────

const variantStyles = {
  default:
    "bg-background text-foreground border-border",
  success:
    "border-l-4 border-l-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  error:
    "border-l-4 border-l-red-500 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200",
  warning:
    "border-l-4 border-l-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  info:
    "border-l-4 border-l-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
};

const iconMap = {
  default: null,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

// ─── Props ──────────────────────────────────────────────────────────

interface RichToastProps {
  variant?: keyof typeof variantStyles;
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Optional action rendered as a link-style button. */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Called when the user taps the close button. */
  onClose?: () => void;
  /** Spinner in place of the icon (e.g. for "Saving..." state). */
  loading?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────

export function RichToast({
  variant = "default",
  icon,
  title,
  description,
  action,
  onClose,
  loading,
}: RichToastProps) {
  const IconComponent = iconMap[variant];

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-background p-4 shadow-elevated",
        variantStyles[variant],
      )}
    >
      {/* Icon */}
      {(icon || IconComponent || loading) && (
        <div className="mt-0.5 shrink-0">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : icon ? (
            icon
          ) : IconComponent ? (
            <IconComponent className="h-5 w-5" />
          ) : null}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        {description && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="mt-1.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Close */}
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 rounded-md p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ─── Presets ────────────────────────────────────────────────────────

/** Example: for use with sonner's `toast.custom()`. */
export function MeetingLinkToast({
  meetUrl,
  onClose,
}: {
  meetUrl: string;
  onClose?: () => void;
}) {
  return (
    <RichToast
      variant="success"
      icon={<Video className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
      title="Meeting link sent"
      description={`${meetUrl}`}
      action={{
        label: "Join meeting",
        onClick: () => window.open(meetUrl, "_blank"),
      }}
      onClose={onClose}
    />
  );
}

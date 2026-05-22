/**
 * App-wide toast utility.
 *
 * Centralizes all toast notifications so we have consistent styling,
 * duration, and behavior across the entire app.
 *
 * Usage:
 *   import { toast } from "@/lib/toast";
 *   toast.success("Workspace updated");
 *   toast.error("Failed to save", "The server returned an error");
 *   toast.meetingLink("https://meet.google.com/abc-defg-hij");
 *
 * Under the hood it wraps sonner's toast — so sonner's Toaster must be
 * mounted in the root layout (it already is, via @/components/ui/sonner).
 */

import type React from "react";
import { toast as sonnerToast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────

export interface ToastOptions {
  /** Duration in ms. Defaults to 4000. */
  duration?: number;
  /** Optional description shown below the title. */
  description?: string;
  /** Action button (e.g. Undo, View, Dismiss). */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Callback when toast is dismissed. */
  onDismiss?: () => void;
  /** Whether to show the close button. Inherits from Toaster default. */
  closeButton?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────

function normalize(options: string | ToastOptions): {
  title: string;
  opts: ToastOptions;
} {
  if (typeof options === "string") {
    return { title: options, opts: {} };
  }
  return { title: options.description || "", opts: options };
}

// ─── Public API ─────────────────────────────────────────────────────

export const toast = {
  /** Green success toast. */
  success(message: string, options?: ToastOptions) {
    return sonnerToast.success(message, {
      duration: options?.duration ?? 4000,
      description: options?.description,
      action: options?.action,
      onDismiss: options?.onDismiss,
      closeButton: options?.closeButton,
    });
  },

  /** Red error toast. */
  error(message: string, options?: ToastOptions) {
    return sonnerToast.error(message, {
      duration: options?.duration ?? 6000,
      description: options?.description,
      action: options?.action,
      onDismiss: options?.onDismiss,
      closeButton: options?.closeButton,
    });
  },

  /** Blue info toast. */
  info(message: string, options?: ToastOptions) {
    return sonnerToast.info(message, {
      duration: options?.duration ?? 4000,
      description: options?.description,
      action: options?.action,
      onDismiss: options?.onDismiss,
      closeButton: options?.closeButton,
    });
  },

  /** Yellow/orange warning toast. */
  warning(message: string, options?: ToastOptions) {
    return sonnerToast.warning(message, {
      duration: options?.duration ?? 5000,
      description: options?.description,
      action: options?.action,
      onDismiss: options?.onDismiss,
      closeButton: options?.closeButton,
    });
  },

  /**
   * Rich meeting-link toast with a video icon.
   * Shown after a Google Meet link is created and sent.
   */
  meetingLink(meetUrl?: string) {
    sonnerToast.success("Meeting link sent", {
      description: meetUrl
        ? `📹 ${meetUrl}`
        : "A Google Meet link was sent to the conversation",
      duration: 5000,
      action: meetUrl
        ? {
            label: "Join",
            onClick: () => window.open(meetUrl, "_blank"),
          }
        : undefined,
      closeButton: true,
    });
  },

  /**
   * Low-priority toast that auto-dismisses quickly.
   * Use for non-critical confirmations (e.g. "Draft saved").
   */
  subtle(message: string, options?: ToastOptions) {
    return sonnerToast(message, {
      duration: options?.duration ?? 2000,
      description: options?.description,
    });
  },

  /**
   * Renders a fully custom React node as toast content.
   * Use when the built-in variants don't fit.
   *
   * Example:
   *   toast.custom(
   *     <div className="flex items-center gap-2">
   *       <span className="text-lg">🎉</span>
   *       <span className="text-sm font-medium">Custom content</span>
   *     </div>
   *   );
   */
  custom(
    render: (id: string | number) => React.ReactElement,
    options?: { duration?: number },
  ) {
    return sonnerToast.custom(render, { duration: options?.duration ?? 4000 });
  },

  /** Dismiss a specific toast by its id, or all toasts. */
  dismiss(id?: string | number) {
    sonnerToast.dismiss(id);
  },
};

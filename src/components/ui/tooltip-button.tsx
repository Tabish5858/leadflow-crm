"use client";

import type { ComponentType, SVGProps } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";

export interface TooltipButtonProps extends ButtonProps {
  /** Tooltip text shown on hover. */
  tooltip: string;
  /** Optional keyboard shortcut hint shown in the tooltip. */
  shortcut?: string;
  /** Side of the tooltip relative to the button. */
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * Icon button with a branded tooltip.
 *
 * Wraps shadcn's `<Button size="icon">` with a `<Tooltip>` so every
 * icon-only action has a clear label on hover.
 *
 * Usage:
 * ```tsx
 * <TooltipButton tooltip="Send Google Meet link" onClick={...}>
 *   <Video className="h-4 w-4" />
 * </TooltipButton>
 * ```
 *
 * For a labelled icon + text button, use `<Button>` directly.
 */
export function TooltipButton({
  tooltip,
  shortcut,
  side = "top",
  children,
  ...buttonProps
}: TooltipButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" {...buttonProps}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side}>
        <p>
          {tooltip}
          {shortcut && (
            <span className="ml-2 text-[10px] text-muted-foreground">
              {shortcut}
            </span>
          )}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

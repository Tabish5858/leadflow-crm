"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

// Re-export sonner's toast so existing imports keep working.
export { toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      richColors
      expand
      visibleToasts={5}
      gap={8}
      closeButton
      toastOptions={{
        duration: 4000,
        className:
          "group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-elevated group-[.toaster]:rounded-lg group-[.toaster]:text-sm",
      }}
      {...props}
    />
  );
}

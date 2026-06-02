"use client";

import { Button } from "@/components/ui/button";
import { EyeOff, ExternalLink } from "lucide-react";
import { useClientPreview } from "@/lib/hooks/use-client-preview";
import { useRouter } from "next/navigation";

export function ClientPreviewBanner() {
  const { isPreviewing, previewClientName, exitPreview } = useClientPreview();
  const router = useRouter();

  if (!isPreviewing) return null;

  return (
    <div className="sticky top-0 z-[60] flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800/30 dark:bg-amber-950/50 dark:text-amber-200">
      <div className="flex items-center gap-2">
        <EyeOff className="h-4 w-4" />
        <span className="font-medium">Previewing as Client</span>
        <span className="text-amber-700 dark:text-amber-400">
          - {previewClientName || "Client"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30 text-xs h-7"
          onClick={() => window.open("/client/dashboard", "_blank")}
        >
          <ExternalLink className="mr-1 h-3 w-3" />
          Open in New Tab
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200 h-7 text-xs"
          onClick={() => {
            exitPreview();
            router.push("/dashboard/clients");
          }}
        >
          <EyeOff className="mr-1 h-3 w-3" />
          Exit Preview
        </Button>
      </div>
    </div>
  );
}

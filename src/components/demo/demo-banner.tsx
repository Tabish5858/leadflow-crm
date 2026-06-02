"use client";

import { Button } from "@/components/ui/button";
import { useDemoMode } from "@/lib/demo/demo-context";
import { ExternalLink, LogOut, AlertTriangle } from "lucide-react";

export function DemoBanner() {
  const { isDemoMode, exitDemo } = useDemoMode();

  if (!isDemoMode) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">
            You are in demo mode — data is not saved. Deploy your own instance to
            keep your data.
          </span>
          <span className="sm:hidden">
            Demo mode — data not saved.
          </span>
          <a
            href="https://github.com/Tabish5858/leadflow"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400 underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-300"
          >
            GitHub
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={exitDemo}
          className="shrink-0 gap-1.5 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10"
        >
          <LogOut className="h-3.5 w-3.5" />
          Exit Demo
        </Button>
      </div>
    </div>
  );
}

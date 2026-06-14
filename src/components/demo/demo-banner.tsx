"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useDemoMode } from "@/lib/demo/demo-context";
import { BookOpen, ExternalLink, LogOut, AlertTriangle, Users, LayoutDashboard } from "lucide-react";

export function DemoBanner() {
  const { isDemoMode, exitDemo } = useDemoMode();
  const router = useRouter();
  const pathname = usePathname();
  const isClientDemo = pathname?.startsWith("/client");

  if (!isDemoMode) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-500/10 border-b border-amber-500/20 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-2.5">
        {/* Left: icon + message + GitHub link */}
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 sm:text-sm sm:gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="truncate sm:hidden">
            {isClientDemo ? "Client demo" : "Demo mode - data not saved."}
          </span>
          <span className="hidden sm:inline">
            {isClientDemo
              ? "Client demo mode - data is not saved."
              : "You are in demo mode - data is not saved. Deploy your own instance to keep your data."
            }
          </span>
          <a
            href="https://github.com/Tabish5858/Leadflow-CRM"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400 underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-300 shrink-0"
          >
            <span className="hidden sm:inline">GitHub</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400 underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-300 shrink-0"
          >
            <BookOpen className="h-3 w-3" />
            <span className="hidden sm:inline">Docs</span>
          </Link>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isClientDemo ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="shrink-0 gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300 h-7 sm:h-8 px-1.5 sm:px-2.5"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Back to Admin</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/client/dashboard")}
              className="shrink-0 gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300 h-7 sm:h-8 px-1.5 sm:px-2.5"
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Client Demo</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={exitDemo}
            className="shrink-0 gap-1 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10 h-7 sm:h-8 px-1.5 sm:px-2.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exit Demo</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

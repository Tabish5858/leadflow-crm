"use client";

import { cn } from "@/lib/utils";
import { useMemo } from "react";

export type ProjectTabId = "overview" | "tasks" | "milestones" | "notes" | "time" | "files" | "settings";

interface ProjectTab {
  id: ProjectTabId;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

interface ProjectTabsProps {
  tabs: ProjectTab[];
  activeTab: ProjectTabId;
  onTabChange: (tab: ProjectTabId) => void;
  className?: string;
}

export function ProjectTabs({ tabs, activeTab, onTabChange, className }: ProjectTabsProps) {
  // Track tab order for keyboard nav
  const tabIds = useMemo(() => tabs.map((t) => t.id), [tabs]);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % tabIds.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
    }
    if (nextIndex !== null) {
      e.preventDefault();
      onTabChange(tabIds[nextIndex]);
    }
  };

  return (
    <div
      className={cn(
        "flex border-b border-border overflow-x-auto scrollbar-none",
        className
      )}
      role="tablist"
      aria-orientation="horizontal"
    >
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={tab.disabled}
            tabIndex={isActive ? 0 : -1}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              tab.disabled && "opacity-40 cursor-not-allowed",
              !tab.disabled && "cursor-pointer hover:text-foreground",
              isActive
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            {tab.icon && <span className="h-4 w-4 shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.badge}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}

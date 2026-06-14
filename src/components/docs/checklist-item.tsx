"use client";

import { useEffect, useState, useCallback } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const PREFIX = "lf-docs";

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lf-checklist-update"));
  }
}

// ─── Single checklist item ─────────────────────────────────────
export function ChecklistItem({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setChecked(localStorage.getItem(`${PREFIX}-${id}`) === "true");
  }, [id]);

  const toggle = useCallback(() => {
    const next = !checked;
    setChecked(next);
    localStorage.setItem(`${PREFIX}-${id}`, String(next));
    notify();
  }, [checked, id]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 cursor-pointer select-none group",
        className,
      )}
      onClick={toggle}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
    >
      {/* Checkbox box */}
      <div
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all duration-150",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-neutral-700 bg-transparent group-hover:border-neutral-400",
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </div>

      {/* Label */}
      <span
        className={cn(
          "text-sm transition-all duration-150",
          checked
            ? "text-neutral-500 line-through"
            : "text-neutral-200",
        )}
      >
        {children}
      </span>
    </div>
  );
}

// ─── Checklist progress bar ────────────────────────────────────
export function ChecklistProgress({
  items,
}: {
  items: { id: string; label: string }[];
}) {
  const [mounted, setMounted] = useState(false);
  const [done, setDone] = useState(0);

  const countDone = useCallback(() => {
    return items.filter(
      (item) => localStorage.getItem(`${PREFIX}-${item.id}`) === "true",
    ).length;
  }, [items]);

  useEffect(() => {
    setMounted(true);
    setDone(countDone());

    const handler = () => setDone(countDone());
    window.addEventListener("lf-checklist-update", handler);
    return () => window.removeEventListener("lf-checklist-update", handler);
  }, [countDone]);

  if (!mounted) return null;

  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="not-prose rounded-lg border border-neutral-800 bg-white/[2%] p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-200">
          Setup Progress
        </span>
        <span className="text-neutral-400 tabular-nums">
          {done}/{total} completed
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {pct === 100 && (
        <p className="mt-2 text-xs text-primary">All setup steps complete!</p>
      )}
    </div>
  );
}

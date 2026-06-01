"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { completeChecklistStep, getChecklistProgress } from "@/lib/firebase/client-portal";
import type { ClientPortalSettings, ClientChecklistProgress } from "@/types";
import { CheckCircle2, Circle, ListChecks, PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface ChecklistCardProps {
  settings: ClientPortalSettings;
  workspaceId: string;
  userId: string;
}

export function ChecklistCard({
  settings,
  workspaceId,
  userId,
}: ChecklistCardProps) {
  const checklist = settings.checklist;
  const [progress, setProgress] = useState<ClientChecklistProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId || !userId) return;
    getChecklistProgress(workspaceId, userId)
      .then(setProgress)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, userId]);

  if (!checklist.enabled || checklist.steps.length === 0) return null;

  const totalSteps = checklist.steps.length;
  const completedIds = progress?.completedStepIds ?? [];
  const completedCount = completedIds.length;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const allDone = completedCount >= totalSteps;

  const handleComplete = async (stepId: string) => {
    try {
      await completeChecklistStep(workspaceId, userId, stepId);
      setProgress((prev) =>
        prev
          ? { ...prev, completedStepIds: [...prev.completedStepIds, stepId] }
          : prev
      );
    } catch {
      // Silently fail
    }
  };

  if (allDone) return null;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-2 w-full rounded-full mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-primary" />
            Getting Started
          </CardTitle>
          <span className="text-xs font-medium text-muted-foreground">
            {completedCount}/{totalSteps}
          </span>
        </div>
        <CardDescription>
          Complete these steps to get the most out of your portal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress bar */}
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {checklist.steps
            .sort((a, b) => a.order - b.order)
            .map((step) => {
              const isDone = completedIds.includes(step.id);
              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                    isDone
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                      : "hover:bg-muted/30"
                  }`}
                >
                  <button
                    onClick={() => !isDone && handleComplete(step.id)}
                    disabled={isDone}
                    className="mt-0.5 shrink-0"
                    aria-label={isDone ? "Completed" : "Mark as complete"}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/40 hover:text-primary transition-colors" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        isDone ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {step.title}
                    </p>
                    {step.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    )}
                  </div>
                  {step.videoUrl && (
                    <a
                      href={step.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                      title="Watch tutorial"
                    >
                      <PlayCircle className="h-4 w-4" />
                    </a>
                  )}
                  {step.actionLabel && step.actionUrl && !isDone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-7 text-xs"
                      asChild
                    >
                      <a href={step.actionUrl}>{step.actionLabel}</a>
                    </Button>
                  )}
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { RequireModuleAccess } from "@/components/shared/require-module-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { useHeaderActions } from "@/contexts/header-actions-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { useLeadStore } from "@/lib/stores/leadStore";
import { useTimeTrackingStore } from "@/lib/stores/timeTrackingStore";
import { toast } from "@/lib/toast";
import { formatDate, formatDuration } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";
import {
  Clock,
  Play,
  Plus,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function TimeTrackerPage() {
  const { user, activeWorkspace } = useWorkspace();
  const { setHeaderActions } = useHeaderActions();
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualEntry, setManualEntry] = useState({
    leadId: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    hours: "",
    minutes: "",
    billable: false,
  });

  const {
    timer,
    entries,
    loading,
    totalSeconds,
    startTimer,
    stopTimer,
    resetTimer,
    setTimerDescription,
    setTimerBillable,
    initialize,
    addManualEntry,
    deleteEntry,
  } = useTimeTrackingStore();

  const { leads } = useLeadStore();

  useEffect(() => {
    if (!activeWorkspace) return;
    initialize(activeWorkspace.id);
  }, [activeWorkspace?.id, initialize, activeWorkspace]);

  // Timer tick
  const [displayElapsed, setDisplayElapsed] = useState(0);
  useEffect(() => {
    if (!timer.isRunning || !timer.startTime) {
      setDisplayElapsed(timer.elapsed);
      return;
    }
    const interval = setInterval(() => {
      setDisplayElapsed(Math.floor((Date.now() - timer.startTime!) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer.isRunning, timer.startTime, timer.elapsed]);

  const handleStopTimer = async () => {
    if (!user || !activeWorkspace) return;
    const id = await stopTimer(activeWorkspace.id, user.id);
    if (id) {
      toast.success("Time entry saved");
    } else {
      toast.error("Failed to save time entry");
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeWorkspace || !manualEntry.description) {
      toast.error("Description is required");
      return;
    }

    const hours = parseInt(manualEntry.hours) || 0;
    const minutes = parseInt(manualEntry.minutes) || 0;
    const duration = hours * 3600 + minutes * 60;

    if (duration === 0) {
      toast.error("Duration must be greater than 0");
      return;
    }

    const date = new Date(manualEntry.date);
    const startTime = Timestamp.fromDate(date);
    const endTime = Timestamp.fromDate(
      new Date(date.getTime() + duration * 1000)
    );

    await addManualEntry(activeWorkspace.id, user.id, {
      leadId: manualEntry.leadId || null,
      description: manualEntry.description,
      startTime,
      endTime,
      duration,
      billable: manualEntry.billable,
      hourlyRate: null,
    });

    setManualEntry({
      leadId: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      hours: "",
      minutes: "",
      billable: false,
    });
    setShowManualForm(false);
    toast.success("Time entry added");
  };

  const handleDeleteEntry = async (id: string) => {
    await deleteEntry(id);
    toast.success("Entry deleted");
  };

  // Group entries by date
  const groupedEntries: Record<string, typeof entries> = {};
  for (const entry of entries) {
    const dateStr =
      entry.startTime?.toDate().toLocaleDateString() || "Unknown";
    if (!groupedEntries[dateStr]) groupedEntries[dateStr] = [];
    groupedEntries[dateStr].push(entry);
  }

  useEffect(() => {
    if (loading) {
      setHeaderActions(null);
      return;
    }
    setHeaderActions(
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          Total: {formatDuration(totalSeconds)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowManualForm(!showManualForm)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Manual Entry
        </Button>
      </div>
    );
    return () => setHeaderActions(null);
  }, [loading, setHeaderActions, showManualForm, totalSeconds]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <RequireModuleAccess moduleId="time_tracker">
      <div className="space-y-6">
        {/* Timer Card */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Timer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="timer-lead">Lead (optional)</Label>
                <Select
                  value={timer.leadId || ""}
                  onValueChange={(v) =>
                    startTimer(v || undefined, timer.description)
                  }
                  disabled={timer.isRunning}
                >
                  <SelectTrigger id="timer-lead">
                    <SelectValue placeholder="Select a lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.firstName} {lead.lastName}
                        {lead.company ? ` - ${lead.company}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="timer-desc">Description</Label>
                <Input
                  id="timer-desc"
                  placeholder="What are you working on?"
                  value={timer.description}
                  onChange={(e) => setTimerDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="timer-billable"
                    checked={timer.billable}
                    onCheckedChange={(c) => setTimerBillable(!!c)}
                  />
                  <Label htmlFor="timer-billable" className="text-sm">
                    Billable
                  </Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="min-w-[100px] text-center">
                  <span
                    className={cn(
                      "text-3xl font-mono font-bold tabular-nums",
                      timer.isRunning && "text-primary"
                    )}
                  >
                    {String(Math.floor(displayElapsed / 3600)).padStart(2, "0")}:
                    {String(Math.floor((displayElapsed % 3600) / 60)).padStart(
                      2,
                      "0"
                    )}
                    :{String(displayElapsed % 60).padStart(2, "0")}
                  </span>
                </div>
                {!timer.isRunning ? (
                  <TooltipButton
                    tooltip="Start timer"
                    className="h-10 w-10 bg-success hover:bg-success/90"
                    onClick={() =>
                      startTimer(timer.leadId || undefined, timer.description)
                    }
                  >
                    <Play className="h-4 w-4" />
                  </TooltipButton>
                ) : (
                  <TooltipButton
                    tooltip="Stop timer"
                    variant="destructive"
                    className="h-10 w-10"
                    onClick={handleStopTimer}
                  >
                    <Square className="h-4 w-4" />
                  </TooltipButton>
                )}
                {!timer.isRunning && timer.elapsed > 0 && (
                  <TooltipButton
                    tooltip="Reset timer"
                    variant="outline"
                    className="h-10 w-10"
                    onClick={resetTimer}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </TooltipButton>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Entry Form */}
        {showManualForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Time Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Lead (optional)</Label>
                    <Select
                      value={manualEntry.leadId}
                      onValueChange={(v) =>
                        setManualEntry({ ...manualEntry, leadId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a lead" />
                      </SelectTrigger>
                      <SelectContent>
                        {leads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.firstName} {lead.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={manualEntry.date}
                      onChange={(e) =>
                        setManualEntry({ ...manualEntry, date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="What did you work on?"
                    value={manualEntry.description}
                    onChange={(e) =>
                      setManualEntry({
                        ...manualEntry,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex gap-4">
                  <div className="space-y-2">
                    <Label>Hours</Label>
                    <Input
                      type="number"
                      min="0"
                      value={manualEntry.hours}
                      onChange={(e) =>
                        setManualEntry({ ...manualEntry, hours: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minutes</Label>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={manualEntry.minutes}
                      onChange={(e) =>
                        setManualEntry({
                          ...manualEntry,
                          minutes: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="manual-billable"
                    checked={manualEntry.billable}
                    onCheckedChange={(c) =>
                      setManualEntry({ ...manualEntry, billable: !!c })
                    }
                  />
                  <Label htmlFor="manual-billable">Billable</Label>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowManualForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save Entry</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Time Entries */}
        <div className="space-y-4">
          {Object.keys(groupedEntries).length === 0 ? (
            <EmptyState
              icon={<Clock className="h-6 w-6" />}
              title="No time entries"
              description="Start the timer or add a manual entry to track your time."
            />
          ) : (
            Object.entries(groupedEntries).map(([date, dayEntries]) => {
              const dayTotal = dayEntries.reduce((s, e) => s + e.duration, 0);
              return (
                <Card key={date}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                    <CardTitle className="text-sm font-medium">{date}</CardTitle>
                    <span className="text-sm font-mono text-muted-foreground">
                      {formatDuration(dayTotal)}
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {dayEntries.map((entry) => {
                      const lead = leads.find((l) => l.id === entry.leadId);
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {entry.description}
                            </p>
                            {lead && (
                              <p className="text-xs text-muted-foreground">
                                {lead.firstName} {lead.lastName}
                                {lead.company ? ` - ${lead.company}` : ""}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {formatDate(entry.startTime?.toDate())} ·{" "}
                              {entry.startTime
                                ?.toDate()
                                .toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-mono font-medium">
                                {formatDuration(entry.duration)}
                              </p>
                              {entry.billable && (
                                <span className="text-xs font-medium text-success">
                                  Billable
                                </span>
                              )}
                            </div>
                            <TooltipButton
                              tooltip="Delete entry"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleDeleteEntry(entry.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </TooltipButton>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </RequireModuleAccess>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

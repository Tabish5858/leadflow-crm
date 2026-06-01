"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ModuleGuard } from "@/components/client/module-guard";
import { useClientUser } from "@/contexts/client-user-context";
import { db } from "@/lib/firebase/client";
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, Timestamp, where } from "firebase/firestore";
import {
  Clock,
  Loader2,
  Plus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";


import {
  ErrorState,
  PageHeader,
  SkeletonList,
} from "@/components/client/module-layout";

interface TimeEntryItem {
  id: string;
  description: string;
  startTime: Date;
  duration: number;
  billable: boolean;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ClientTimeTrackerPage() {
  const { clientWorkspaceId, uid } = useClientUser();
  const [entries, setEntries] = useState<TimeEntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("");
  const [billable, setBillable] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const fetchEntries = async () => {
    if (!clientWorkspaceId || !uid) return;
    setLoading(true);
    try {
      const ref = collection(db, "timeEntries");
      const q = query(
        ref,
        where("workspaceId", "==", clientWorkspaceId),
        where("userId", "==", uid),
        orderBy("startTime", "desc"),
        limit(50)
      );
      const snap = await getDocs(q);
      setEntries(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            description: data.description || "",
            startTime: (data.startTime as Timestamp)?.toDate() ?? new Date(),
            duration: data.duration || 0,
            billable: data.billable ?? true,
          };
        })
      );
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchEntries();
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientWorkspaceId, uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !hours.trim() || submitting) return;

    const durationMinutes = Math.round(parseFloat(hours) * 60);
    if (isNaN(durationMinutes) || durationMinutes <= 0) return;

    setSubmitting(true);

    const tempId = `temp_${Date.now()}`;
    const selectedDate = new Date(date + "T09:00:00");
    const tempEntry: TimeEntryItem = {
      id: tempId,
      description: description.trim(),
      startTime: selectedDate,
      duration: durationMinutes,
      billable,
    };
    setEntries((prev) => [tempEntry, ...prev]);
    setDescription("");
    setHours("");
    setShowForm(false);

    try {
      const ref = collection(db, "timeEntries");
      const docRef = await addDoc(ref, {
        workspaceId: clientWorkspaceId,
        leadId: null,
        taskId: null,
        userId: uid,
        description: description.trim(),
        startTime: Timestamp.fromDate(selectedDate),
        endTime: null,
        duration: durationMinutes,
        billable,
        hourlyRate: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setEntries((prev) =>
        prev.map((e) =>
          e.id === tempId ? { ...e, id: docRef.id } : e
        )
      );
    } catch {
      setEntries((prev) => prev.filter((e) => e.id !== tempId));
    } finally {
      setSubmitting(false);
    }
  };

  const totalHours = entries.reduce((sum, e) => sum + e.duration, 0);
  const billableHours = entries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + e.duration, 0);

  if (error) {
    return (
      <div>
        <PageHeader title="Time Tracker" description="Log and view your hours" />
        <ErrorState
          message={error.message}
          onRetry={fetchEntries}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Time Tracker"
        description={
          loading
            ? "Loading..."
            : `${formatDuration(totalHours)} total · ${formatDuration(billableHours)} billable`
        }
        actions={
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            Log Time
          </Button>
        }
      />

      {showForm && (
        <Card ref={formRef} className="mb-6 border-primary/30">
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea
                    id="desc"
                    placeholder="What did you work on?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="hours">Hours</Label>
                    <Input
                      id="hours"
                      type="number"
                      step="0.25"
                      min="0.25"
                      max="24"
                      placeholder="e.g. 2.5"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Label htmlFor="billable">Billable</Label>
                    <Switch
                      id="billable"
                      checked={billable}
                      onCheckedChange={setBillable}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Entry
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!loading && entries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
              <p className="text-2xl font-bold">{formatDuration(totalHours)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Billable</p>
              <p className="text-2xl font-bold text-green-600">
                {formatDuration(billableHours)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Entries</p>
              <p className="text-2xl font-bold">{entries.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <SkeletonList count={5} height="h-16" />
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">No time entries yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Log your first time entry to get started.
            </p>
            <Button
              variant="outline"
              className="mt-4 gap-2"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4" />
              Log Time
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {entry.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(entry.startTime)}
                    {entry.billable && (
                      <Badge
                        variant="outline"
                        className="ml-2 text-[10px] px-1.5 py-0 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                      >
                        Billable
                      </Badge>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-bold">
                    {formatDuration(entry.duration)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClientTimeTrackerPageWrapper() {
  return (
    <ModuleGuard moduleKey="time_tracking">
      <ClientTimeTrackerPage />
    </ModuleGuard>
  );
}

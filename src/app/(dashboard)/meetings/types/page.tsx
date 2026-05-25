"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { MeetingTypeDialog } from "@/components/meetings/meeting-type-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Copy,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface MeetingTypeCard {
  id: string;
  name: string;
  duration: number;
  bufferTime: number;
  bufferBefore?: number;
  bufferAfter?: number;
  minimumNotice?: number;
  dailyLimit?: number;
  videoTool: "google_meet" | "none";
  description: string;
  bookingToken?: string;
  slug?: string;
  availability?: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

const BOOKING_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function MeetingTypesPage() {
  const { user, activeWorkspace, loading: wsLoading } = useWorkspace();
  const { canAccess } = usePermissions();

  const [types, setTypes] = useState<MeetingTypeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MeetingTypeCard | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadTypes = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { getMeetingTypes } = await import(
        "@/lib/firebase/meeting-types"
      );
      const data = await getMeetingTypes(activeWorkspace.id);
      setTypes(data as MeetingTypeCard[]);
    } catch {
      setError("Failed to load meeting types");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/meetings/types/${id}`, {
        method: "DELETE",
        headers: {
          "x-user-id": user?.id || "",
          "x-workspace-id": activeWorkspace?.id || "",
        },
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
        return;
      }
      setTypes((prev) => prev.filter((t) => t.id !== id));
      toast.success("Meeting type deleted");
    } catch {
      toast.error("Failed to delete meeting type");
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = (type: MeetingTypeCard) => {
    setEditingType(type);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Reset editingType when dialog closes
      setTimeout(() => setEditingType(null), 100);
    }
  };

  const copyBookingLink = (type: MeetingTypeCard) => {
    const url = type.slug
      ? `${BOOKING_BASE_URL}/schedule/${type.slug}`
      : `${BOOKING_BASE_URL}/b/${type.bookingToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Booking link copied to clipboard");
  };

  if (wsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccess("meetings")) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Meeting Types
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Templates for recurring meeting types and booking pages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={loadTypes}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => { setEditingType(null); setDialogOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Type
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 gap-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={loadTypes}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && types.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">No meeting types yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create templates for recurring meetings like Discovery Calls,
                Demos, or Follow-ups
              </p>
            </div>
            <Button onClick={() => { setEditingType(null); setDialogOpen(true); }}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Meeting Type
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && types.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((type) => {
            const bookingUrl = type.slug
              ? `${BOOKING_BASE_URL}/schedule/${type.slug}`
              : type.bookingToken
              ? `${BOOKING_BASE_URL}/b/${type.bookingToken}`
              : null;

            return (
              <Card key={type.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">{type.name}</CardTitle>
                      {type.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {type.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(type)}
                        title="Edit meeting type"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        disabled={deleting === type.id}
                        onClick={() => handleDelete(type.id)}
                        title="Delete meeting type"
                      >
                        {deleting === type.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {type.duration} min
                    </Badge>
                    {(type.bufferBefore ?? type.bufferTime) > 0 && (
                      <Badge variant="outline">
                        {(type.bufferBefore ?? type.bufferTime)}min buffer
                      </Badge>
                    )}
                    {(type.bufferAfter ?? 0) > 0 && (
                      <Badge variant="outline">
                        {type.bufferAfter}min after
                      </Badge>
                    )}
                    {type.minimumNotice ? (
                      <Badge variant="outline">
                        {type.minimumNotice >= 1440
                          ? `${Math.floor(type.minimumNotice / 1440)}d notice`
                          : type.minimumNotice >= 60
                          ? `${Math.floor(type.minimumNotice / 60)}h notice`
                          : `${type.minimumNotice}min notice`}
                      </Badge>
                    ) : null}
                    <Badge variant="outline">
                      {type.videoTool === "google_meet"
                        ? "Google Meet"
                        : "In-person"}
                    </Badge>
                  </div>

                  {/* Availability info */}
                  {type.availability && (
                    <div className="text-xs text-muted-foreground">
                      {type.availability.daysOfWeek.length === 5
                        ? "Weekdays"
                        : type.availability.daysOfWeek
                            .map((d) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d])
                            .join(", ")}{" "}
                      &middot; {type.availability.startTime}-
                      {type.availability.endTime}
                    </div>
                  )}

                  {/* Booking URL + Copy */}
                  {bookingUrl && (
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <Input
                          value={bookingUrl}
                          readOnly
                          className="text-xs font-mono h-8 bg-muted/30"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0"
                        onClick={() => copyBookingLink(type)}
                        title="Copy booking link"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {user && activeWorkspace && (
        <MeetingTypeDialog
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          userId={user.id}
          workspaceId={activeWorkspace.id}
          onSaved={loadTypes}
          editingType={editingType}
        />
      )}
    </div>
  );
}

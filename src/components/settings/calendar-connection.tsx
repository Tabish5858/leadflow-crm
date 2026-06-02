"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/contexts/workspace-context";
import { getApiAuthHeaders } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "@/lib/toast";

interface CalendarConnectionProps {
  onConnect?: () => void;
}

interface CalendarInfo {
  id: string;
  name: string;
  primary: boolean;
}

export function CalendarConnection({ onConnect }: CalendarConnectionProps) {
  const { user, activeWorkspace } = useWorkspace();
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [targetCalendarId, setTargetCalendarId] = useState<string>("primary");
  const [savingCalendars, setSavingCalendars] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Check if current user is workspace owner
  useEffect(() => {
    if (!activeWorkspace || !user) return;
    setIsOwner(activeWorkspace.ownerId === user.id);
  }, [activeWorkspace, user]);

  // Fetch calendar settings
  useEffect(() => {
    if (!user || !activeWorkspace) return;

    (async () => {
      try {
        const headers = await getApiAuthHeaders(activeWorkspace.id);
        const res = await fetch(`/api/calendar/settings`, { headers });
        const data = await res.json();

        if (data.connected) {
          setConnected(true);
          setEmail(data.email || null);
          setCalendars(data.calendars || []);
          setSelectedCalendarIds(data.selectedCalendarIds || []);
          setTargetCalendarId(data.targetCalendarId || "primary");
        } else {
          setConnected(false);
          setEmail(null);
        }
      } catch {
        setConnected(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, activeWorkspace]);

  // Handle OAuth callback query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_connected") === "true") {
      setConnected(true);
      toast.success("Google Calendar connected successfully");
      window.history.replaceState({}, "", "/settings");
      onConnect?.();
    }
    if (params.get("calendar_error")) {
      const error = params.get("calendar_error");
      const errorMessages: Record<string, string> = {
        access_denied: "Calendar access was denied",
        invalid_request: "Invalid OAuth request",
        invalid_state: "OAuth state mismatch - please try again",
        token_exchange_failed: "Failed to exchange authorization code",
        email_mismatch:
          "Connected Google account email doesn't match your workspace owner email",
        unknown: "Failed to connect Google Calendar",
      };
      toast.error(errorMessages[error || ""] || "Failed to connect");
      window.history.replaceState({}, "", "/settings");
    }
  }, [onConnect]);

  const handleConnect = async () => {
    if (!user || !activeWorkspace) return;
    try {
      const headers = await getApiAuthHeaders(activeWorkspace.id);
      const res = await fetch(
        `/api/auth/google?workspaceId=${activeWorkspace.id}&redirectTo=/settings`,
        { headers }
      );

      if (res.redirected) {
        // Fallback: if server sent a redirect directly
        window.location.href = res.url;
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to connect");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to get authorization URL");
      }
    } catch {
      toast.error("Failed to connect Google Calendar");
    }
  };

  const handleDisconnect = async () => {
    if (!user || !activeWorkspace) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/calendar/events", {
        method: "DELETE",
        headers: await getApiAuthHeaders(activeWorkspace.id),
      });

      if (res.ok) {
        setConnected(false);
        setEmail(null);
        setCalendars([]);
        setSelectedCalendarIds([]);
        toast.success("Google Calendar disconnected");
      } else {
        toast.error("Failed to disconnect");
      }
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleToggleCalendar = async (calendarId: string, checked: boolean) => {
    const updated = checked
      ? [...selectedCalendarIds, calendarId]
      : selectedCalendarIds.filter((id) => id !== calendarId);

    // Optimistic update
    setSelectedCalendarIds(updated);
    setSavingCalendars(true);

    try {
      const headers = await getApiAuthHeaders(activeWorkspace!.id);
      const res = await fetch("/api/calendar/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ selectedCalendarIds: updated }),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }

      toast.success("Calendar preferences saved");
    } catch {
      // Revert on failure - restore pre-optimistic value
      setSelectedCalendarIds(selectedCalendarIds);
      toast.error("Failed to save calendar preferences");
    } finally {
      setSavingCalendars(false);
    }
  };

  const handleRefreshCalendars = async () => {
    if (!activeWorkspace || refreshing) return;
    setRefreshing(true);
    try {
      const headers = await getApiAuthHeaders(activeWorkspace.id);
      // Force refresh by passing ?refresh=true
      const res = await fetch(`/api/calendar/settings?refresh=true`, { headers });
      const data = await res.json();
      if (data.calendars) {
        setCalendars(data.calendars);
        setSelectedCalendarIds(data.selectedCalendarIds || []);
        setTargetCalendarId(data.targetCalendarId || "primary");
        toast.success("Calendar list refreshed");
      }
    } catch {
      toast.error("Failed to refresh calendars");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Connect your Google Calendar to sync follow-ups and meetings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking connection status...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Connect your Google Calendar to sync follow-ups and meetings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ─── Not owner warning ─── */}
        {!isOwner && !connected && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Only the workspace owner can connect Google Calendar. Contact your
              workspace owner to set this up.
            </span>
          </div>
        )}

        {/* ─── Not connected ─── */}
        {!connected && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Not connected. Connect your Google Calendar account to create
              events from follow-ups and view upcoming meetings on your
              dashboard.
            </p>
            {isOwner && (
              <Button onClick={handleConnect} size="sm">
                <Calendar className="mr-2 h-4 w-4" />
                Connect Google Calendar
              </Button>
            )}
          </div>
        )}

        {/* ─── Connected state ─── */}
        {connected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Connected</p>
                <p className="text-xs text-muted-foreground">
                  {email || "Google Calendar"}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            </div>

            {/* Calendar selection */}
            {calendars.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Check for conflicts on
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleRefreshCalendars}
                    disabled={refreshing || savingCalendars}
                  >
                    <RefreshCw
                      className={`mr-1 h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
                    />
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>
                <div className="space-y-1.5 rounded-lg border p-3">
                  {calendars.map((cal) => (
                    <label
                      key={cal.id}
                      className="flex items-center gap-2 rounded p-1 text-sm hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedCalendarIds.includes(cal.id)}
                        onCheckedChange={(checked) =>
                          handleToggleCalendar(cal.id, checked === true)
                        }
                      />
                      <span className="flex-1 truncate">{cal.name}</span>
                      {cal.primary && (
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          Primary
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Target calendar selector */}
            {isOwner && calendars.length > 0 && (
              <div className="space-y-2 rounded-lg border p-3">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <CalendarPlus className="h-4 w-4" />
                  Create events in
                </Label>
                <p className="text-xs text-muted-foreground">
                  All Google Meet links and follow-up events are created in this
                  calendar.
                </p>
                <div className="space-y-1.5">
                  {calendars.map((cal) => (
                    <label
                      key={`target-${cal.id}`}
                      className="flex items-center gap-2 rounded p-1 text-sm hover:bg-muted/50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="targetCalendar"
                        value={cal.id}
                        checked={targetCalendarId === cal.id}
                        onChange={async () => {
                          setTargetCalendarId(cal.id);
                          setSavingCalendars(true);
                          try {
                            const headers = await getApiAuthHeaders(
                              activeWorkspace!.id
                            );
                            const res = await fetch("/api/calendar/settings", {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                                ...headers,
                              },
                              body: JSON.stringify({ targetCalendarId: cal.id }),
                            });
                            if (!res.ok) throw new Error("Failed to save");
                            toast.success(
                              `Events will be created in "${cal.name}"`
                            );
                          } catch {
                            setTargetCalendarId(targetCalendarId);
                            toast.error("Failed to save target calendar");
                          } finally {
                            setSavingCalendars(false);
                          }
                        }}
                        className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="flex-1 truncate">{cal.name}</span>
                      {cal.primary && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5"
                        >
                          Primary
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
import { Calendar, CheckCircle2, Loader2, LogOut } from "lucide-react";
import { toast } from "@/lib/toast";

interface CalendarConnectionProps {
  onConnect?: () => void;
}

export function CalendarConnection({ onConnect }: CalendarConnectionProps) {
  const { user, activeWorkspace } = useWorkspace();
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!user || !activeWorkspace) return;

    (async () => {
      try {
        const headers = await getApiAuthHeaders(activeWorkspace.id);
        const res = await fetch(`/api/calendar/events?maxResults=5`, { headers });
        const data = await res.json();
        if (data.error && data.error.includes("not connected")) {
          setConnected(false);
          setEmail(null);
        } else {
          setConnected(true);
        }
      } catch {
        setConnected(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, activeWorkspace]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_connected") === "true") {
      setConnected(true);
      toast.success("Google Calendar connected successfully");
      window.history.replaceState({}, "", "/settings");
      onConnect?.();
    }
    if (params.get("calendar_error")) {
      toast.error("Failed to connect Google Calendar");
      window.history.replaceState({}, "", "/settings");
    }
  }, [onConnect]);

  const handleConnect = () => {
    if (!user) return;
    window.location.href = `/api/auth/google?userId=${user.id}`;
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
          <CardDescription>Connect your Google Calendar to sync follow-ups and meetings.</CardDescription>
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
        {connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Connected</p>
                <p className="text-xs text-muted-foreground">{email || "Google Calendar"}</p>
              </div>
              <Badge variant="secondary" className="text-xs">Active</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Not connected. Connect your Google Calendar account to create events from follow-ups and view upcoming meetings on your dashboard.
            </p>
            <Button onClick={handleConnect} size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Connect Google Calendar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

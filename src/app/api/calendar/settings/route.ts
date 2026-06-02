import { NextRequest, NextResponse } from "next/server";
import {
  getWorkspaceCalendarConfig,
  updateWorkspaceCalendarConfig,
  getGoogleCalendars,
} from "@/lib/calendar";
import { withAuth } from "@/lib/api/middleware";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * GET /api/calendar/settings
 * Returns workspace Google Calendar config + list of connected calendars.
 * Allows any workspace member to read.
 */
export async function GET(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const config = await getWorkspaceCalendarConfig(ctx.workspaceId);

      const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";
      let calendars = config.connectedCalendars || [];

      // Fetch live calendars if forced or if cache is empty
      let updatedSelectedIds = config.selectedCalendarIds || [];
      if (config.connected && (forceRefresh || calendars.length === 0)) {
        try {
          calendars = await getGoogleCalendars(ctx.workspaceId);
          if (calendars.length > 0) {
            // Merge: keep existing selections for calendars that still exist,
            // and add new calendars as selected by default.
            const existingIds = new Set(config.selectedCalendarIds || []);
            const currentCalendarIds = new Set(calendars.map((c) => c.id));
            const preserved = (config.selectedCalendarIds || []).filter((id) =>
              currentCalendarIds.has(id)
            );
            const added = calendars
              .filter((c) => !existingIds.has(c.id))
              .map((c) => c.id);
            updatedSelectedIds = [...preserved, ...added];

            await updateWorkspaceCalendarConfig(ctx.workspaceId, {
              connectedCalendars: calendars,
              selectedCalendarIds: updatedSelectedIds,
            });
          }
        } catch (err) {
          console.error("Failed to fetch live calendars:", err);
        }
      }

      return NextResponse.json({
        connected: config.connected,
        email: config.email,
        calendars,
        selectedCalendarIds: updatedSelectedIds,
        targetCalendarId: config.targetCalendarId || "primary",
      });
    } catch (error) {
      console.error("Failed to get calendar settings:", error);
      return NextResponse.json(
        { error: "Failed to load calendar settings" },
        { status: 500 }
      );
    }
  });
}

/**
 * PATCH /api/calendar/settings
 * Updates selected calendar IDs for conflict checking.
 * Only workspace owner can update.
 */
export async function PATCH(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      // Only owner can change calendar settings
      const wsSnap = await getAdminDb().collection("workspaces").doc(ctx.workspaceId).get();
      if (!wsSnap.exists) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
      }
      const wsData = wsSnap.data()!;
      if (wsData.ownerId !== ctx.userId) {
        return NextResponse.json(
          { error: "Only the workspace owner can update calendar settings" },
          { status: 403 }
        );
      }

      const body = await req.json();
      const { selectedCalendarIds, targetCalendarId } = body;

      // Validate - must have at least one recognized field
      if (selectedCalendarIds !== undefined && !Array.isArray(selectedCalendarIds)) {
        return NextResponse.json(
          { error: "selectedCalendarIds must be an array of strings" },
          { status: 400 }
        );
      }

      if (targetCalendarId !== undefined && typeof targetCalendarId !== "string") {
        return NextResponse.json(
          { error: "targetCalendarId must be a string" },
          { status: 400 }
        );
      }

      // Fetch current config to preserve all existing fields
      const config = await getWorkspaceCalendarConfig(ctx.workspaceId);

      const updates: Record<string, unknown> = {
        connected: config.connected,
        email: config.email,
        connectedCalendars: config.connectedCalendars,
        selectedCalendarIds: selectedCalendarIds ?? config.selectedCalendarIds,
      };

      if (targetCalendarId !== undefined) {
        updates.targetCalendarId = targetCalendarId;
      }

      await updateWorkspaceCalendarConfig(ctx.workspaceId, updates);

      return NextResponse.json({
        success: true,
        selectedCalendarIds: updates.selectedCalendarIds,
        targetCalendarId: updates.targetCalendarId ?? config.targetCalendarId ?? "primary",
      });
    } catch (error) {
      console.error("Failed to update calendar settings:", error);
      return NextResponse.json(
        { error: "Failed to update calendar settings" },
        { status: 500 }
      );
    }
  });
}

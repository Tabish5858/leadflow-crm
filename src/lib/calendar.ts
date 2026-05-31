import "server-only";
import { google, calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import type { Lead, WorkspaceGoogleCalendarConfig, GoogleCalendarInfo } from "@/types";

/* ─── Path helpers ─────────────────────────────────────────── */

function tokensDocPath(workspaceId: string) {
  return getAdminDb()
    .collection("workspaces").doc(workspaceId)
    .collection("google_calendar").doc("tokens");
}

function configDocPath(workspaceId: string) {
  return getAdminDb()
    .collection("workspaces").doc(workspaceId)
    .collection("google_calendar").doc("config");
}

/* ─── Token document shape ─────────────────────────────────── */

export interface CalendarTokenDoc {
  workspaceId: string;
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  email: string;
  connectedAt: Timestamp;
}

/* ─── OAuth helpers ────────────────────────────────────────── */

function getOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();
  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/calendar.readonly",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state,
    prompt: "consent",
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/* ─── Workspace-level token auth ───────────────────────────── */

export async function getGoogleAuth(workspaceId: string): Promise<{ client: OAuth2Client; email: string } | null> {
  const tokenDoc = await tokensDocPath(workspaceId).get();

  if (!tokenDoc.exists) {
    return null;
  }

  const data = tokenDoc.data() as CalendarTokenDoc;
  const oauth2Client = getOAuth2Client();

  oauth2Client.setCredentials({
    access_token: data.accessToken,
    refresh_token: data.refreshToken,
    expiry_date: data.expiryDate,
  });

  // Persist token refreshes back to Firestore so serverless cold starts
  // don't read stale (expired) tokens. Google may rotate refresh tokens.
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      try {
        const updateData: Record<string, unknown> = {
          accessToken: tokens.access_token,
          expiryDate: tokens.expiry_date ?? 0,
        };
        if (tokens.refresh_token) {
          updateData.refreshToken = tokens.refresh_token;
        }
        await tokensDocPath(workspaceId).update(updateData);
      } catch (err) {
        console.error("Failed to persist refreshed Google tokens:", err);
      }
    }
  });

  return { client: oauth2Client, email: data.email };
}

export async function saveCalendarTokens(
  workspaceId: string,
  tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null },
  email: string
): Promise<void> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);

  const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token as string);

  const docData: CalendarTokenDoc = {
    workspaceId,
    accessToken: tokens.access_token || "",
    refreshToken: tokens.refresh_token || "",
    expiryDate: tokens.expiry_date || 0,
    email: tokenInfo.email || email,
    connectedAt: Timestamp.now(),
  };

  await tokensDocPath(workspaceId).set(docData);

  // Also update workspace doc with connected status + email
  await updateWorkspaceCalendarConfig(workspaceId, {
    connected: true,
    email: tokenInfo.email || email,
  });
}

export async function disconnectCalendar(workspaceId: string): Promise<void> {
  await tokensDocPath(workspaceId).delete();

  // Reset workspace config
  await configDocPath(workspaceId).set({
    connected: false,
    email: null,
    connectedCalendars: [],
    selectedCalendarIds: [],
    targetCalendarId: "primary",
  });

  // Also clear inline on workspace doc
  try {
    await getAdminDb().collection("workspaces").doc(workspaceId).update({
      "googleCalendar.connected": false,
      "googleCalendar.email": null,
      "googleCalendar.connectedCalendars": [],
      "googleCalendar.selectedCalendarIds": [],
      "googleCalendar.targetCalendarId": "primary",
    });
  } catch {
    // Workspace doc might not have the field yet
  }
}

export async function getCalendarConnectionStatus(workspaceId: string): Promise<{ connected: boolean; email: string | null }> {
  const tokenDoc = await tokensDocPath(workspaceId).get();

  if (!tokenDoc.exists) {
    return { connected: false, email: null };
  }

  const data = tokenDoc.data() as CalendarTokenDoc;
  return { connected: true, email: data.email };
}

/* ─── Workspace calendar config ────────────────────────────── */

export async function getWorkspaceCalendarConfig(workspaceId: string): Promise<WorkspaceGoogleCalendarConfig> {
  const configDoc = await configDocPath(workspaceId).get();
  if (configDoc.exists) {
    return configDoc.data() as WorkspaceGoogleCalendarConfig;
  }

  // Fall back to checking workspace doc inline
  try {
    const wsSnap = await getAdminDb().collection("workspaces").doc(workspaceId).get();
    const wsData = wsSnap.data();
    if (wsData?.googleCalendar) {
      return wsData.googleCalendar as WorkspaceGoogleCalendarConfig;
    }
  } catch {
    // ignore
  }

  // Check if tokens exist but config doesn't (migration state)
  const tokenStatus = await getCalendarConnectionStatus(workspaceId);
  if (tokenStatus.connected) {
    return {
      connected: true,
      email: tokenStatus.email,
      connectedCalendars: [],
      selectedCalendarIds: [],
    };
  }

  return {
    connected: false,
    email: null,
    connectedCalendars: [],
    selectedCalendarIds: [],
  };
}

export async function updateWorkspaceCalendarConfig(
  workspaceId: string,
  updates: Partial<WorkspaceGoogleCalendarConfig>
): Promise<void> {
  // Update subcollection doc
  await configDocPath(workspaceId).set(updates, { merge: true });

  // Also update inline on workspace doc for easy reading
  try {
    await getAdminDb().collection("workspaces").doc(workspaceId).set(
      { googleCalendar: updates },
      { merge: true }
    );
  } catch {
    // non-critical
  }
}

/* ─── List Google Calendars (for conflict selection) ───────── */

export async function getGoogleCalendars(workspaceId: string): Promise<GoogleCalendarInfo[]> {
  const auth = await getGoogleAuth(workspaceId);
  if (!auth) return [];

  const calendar = google.calendar({ version: "v3", auth: auth.client });
  const res = await calendar.calendarList.list({ showHidden: true });

  return (res.data.items || []).map((c) => ({
    id: c.id || "",
    name: c.summary || c.id || "",
    primary: c.primary || false,
  }));
}

/* ─── Check Google Calendar for conflicts ──────────────────── */

export async function checkGoogleCalendarConflicts(
  workspaceId: string,
  startDate: Date,
  endDate: Date,
  calendarIds?: string[]
): Promise<{ hasConflict: boolean; conflictingEvents: { id: string; summary: string; start: string }[] }> {
  const auth = await getGoogleAuth(workspaceId);
  if (!auth) return { hasConflict: false, conflictingEvents: [] };

  // Use selected calendar IDs, or default to ["primary"]
  const config = await getWorkspaceCalendarConfig(workspaceId);
  const calIds = [...(calendarIds || config.selectedCalendarIds)];

  if (calIds.length === 0) {
    calIds.push("primary");
  }

  const calendar = google.calendar({ version: "v3", auth: auth.client });
  const conflictingEvents: { id: string; summary: string; start: string }[] = [];

  for (const calId of calIds) {
    try {
      const res = await calendar.events.list({
        calendarId: calId,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        maxResults: 50,
      });

      for (const event of res.data.items || []) {
        // Skip all-day events
        if (event.start?.date && !event.start?.dateTime) continue;

        const eventStart = event.start?.dateTime ? new Date(event.start.dateTime) : null;
        const eventEnd = event.end?.dateTime ? new Date(event.end.dateTime) : null;

        if (!eventStart || !eventEnd) continue;

        // Check overlap: new start < existing end AND new end > existing start
        if (startDate < eventEnd && endDate > eventStart) {
          conflictingEvents.push({
            id: event.id || "",
            summary: event.summary || "(no title)",
            start: eventStart.toISOString(),
          });
        }
      }
    } catch (err) {
      console.error(`Failed to check calendar ${calId} for conflicts:`, err);
    }
  }

  return { hasConflict: conflictingEvents.length > 0, conflictingEvents };
}

/* ─── Lead follow-up event ─────────────────────────────────── */

export async function createCalendarEvent(
  workspaceId: string,
  lead: Lead,
  followUpDate: Date
): Promise<calendar_v3.Schema$Event> {
  const authData = await getGoogleAuth(workspaceId);
  if (!authData) {
    throw new Error("Google Calendar not connected");
  }

  const calendar = google.calendar({ version: "v3", auth: authData.client });

  // Read target calendar from workspace config
  const config = await getWorkspaceCalendarConfig(workspaceId);
  const targetCalendarId = config.targetCalendarId || "primary";

  const startDate = new Date(followUpDate);
  const endDate = new Date(followUpDate);
  endDate.setHours(endDate.getHours() + 1);

  const eventBody: calendar_v3.Schema$Event = {
    summary: `Follow-up: ${lead.firstName} ${lead.lastName}`,
    description: [
      `Lead: ${lead.firstName} ${lead.lastName}`,
      lead.company ? `Company: ${lead.company}` : null,
      lead.email ? `Email: ${lead.email}` : null,
      lead.phone ? `Phone: ${lead.phone}` : null,
      lead.value ? `Deal Value: ${lead.currency} ${lead.value}` : null,
      `Status: ${lead.status}`,
      lead.notes ? `Notes: ${lead.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    start: {
      dateTime: startDate.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: "UTC",
    },
    attendees: lead.email ? [{ email: lead.email, displayName: `${lead.firstName} ${lead.lastName}` }] : [],
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 30 },
        { method: "popup", minutes: 10 },
      ],
    },
  };

  const response = await calendar.events.insert({
    calendarId: targetCalendarId,
    requestBody: eventBody,
  });

  return response.data;
}

export async function getUpcomingEvents(
  workspaceId: string,
  maxResults = 5
): Promise<calendar_v3.Schema$Event[]> {
  const authData = await getGoogleAuth(workspaceId);
  if (!authData) {
    throw new Error("Google Calendar not connected");
  }

  const calendar = google.calendar({ version: "v3", auth: authData.client });

  // Read target calendar from workspace config
  const config = await getWorkspaceCalendarConfig(workspaceId);
  const targetCalendarId = config.targetCalendarId || "primary";

  const now = new Date();
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 30);

  const response = await calendar.events.list({
    calendarId: targetCalendarId,
    timeMin: now.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  return response.data.items || [];
}

/* ── Google Meet via Calendar API ──────────────────────────── */

export interface CreateMeetResult {
  meetLink: string;
  calendarEventId: string;
  calendarEventUrl: string;
}

export async function createGoogleMeetEvent(
  workspaceId: string,
  attendees: { email: string; name?: string }[],
  options?: { title?: string; startTime?: Date; durationMinutes?: number; description?: string }
): Promise<CreateMeetResult> {
  const authData = await getGoogleAuth(workspaceId);
  if (!authData) {
    throw new Error("Google Calendar not connected. Please connect in Settings.");
  }

  const calendar = google.calendar({ version: "v3", auth: authData.client });

  const duration = options?.durationMinutes ?? 30;
  const startTime = options?.startTime ?? new Date();
  const endTime = new Date(startTime.getTime() + duration * 60000);
  const names = attendees.map((a) => a.name || a.email).join(", ");
  const summary = options?.title || `Meeting with ${names || "Lead"}`;

  // Read target calendar from workspace config
  const config = await getWorkspaceCalendarConfig(workspaceId);
  const targetCalendarId = config.targetCalendarId || "primary";

  const eventBody: calendar_v3.Schema$Event = {
    summary,
    description: options?.description || "",
    start: {
      dateTime: startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    },
    attendees: attendees.map((a) => ({
      email: a.email,
      displayName: a.name || "",
    })),
    conferenceData: {
      createRequest: {
        requestId: `lf-meet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const response = await calendar.events.insert({
    calendarId: targetCalendarId,
    conferenceDataVersion: 1,
    requestBody: eventBody,
  });

  return {
    meetLink: response.data.hangoutLink || "",
    calendarEventId: response.data.id || "",
    calendarEventUrl: response.data.htmlLink || "",
  };
}

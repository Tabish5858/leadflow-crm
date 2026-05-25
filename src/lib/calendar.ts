import { google, calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import type { Lead } from "@/types";

const CALENDAR_TOKENS_COLLECTION = "calendar_tokens";

export interface CalendarTokenDoc {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  email: string;
  connectedAt: Timestamp;
}

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

export async function getGoogleAuth(userId: string): Promise<{ client: OAuth2Client; email: string } | null> {
  const tokenDoc = await getAdminDb()
    .collection("users").doc(userId)
    .collection(CALENDAR_TOKENS_COLLECTION).doc("primary")
    .get();

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

  return { client: oauth2Client, email: data.email };
}

export async function saveCalendarTokens(userId: string, tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null }, email: string): Promise<void> {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);

  const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token as string);

  const docData: CalendarTokenDoc = {
    userId,
    accessToken: tokens.access_token || "",
    refreshToken: tokens.refresh_token || "",
    expiryDate: tokens.expiry_date || 0,
    email: tokenInfo.email || email,
    connectedAt: Timestamp.now(),
  };

  await getAdminDb()
    .collection("users").doc(userId)
    .collection(CALENDAR_TOKENS_COLLECTION).doc("primary")
    .set(docData);
}

export async function disconnectCalendar(userId: string): Promise<void> {
  await getAdminDb()
    .collection("users").doc(userId)
    .collection(CALENDAR_TOKENS_COLLECTION).doc("primary")
    .delete();
}

export async function getCalendarConnectionStatus(userId: string): Promise<{ connected: boolean; email: string | null }> {
  const tokenDoc = await getAdminDb()
    .collection("users").doc(userId)
    .collection(CALENDAR_TOKENS_COLLECTION).doc("primary")
    .get();

  if (!tokenDoc.exists) {
    return { connected: false, email: null };
  }

  const data = tokenDoc.data() as CalendarTokenDoc;
  return { connected: true, email: data.email };
}

export async function createCalendarEvent(
  userId: string,
  lead: Lead,
  followUpDate: Date
): Promise<calendar_v3.Schema$Event> {
  const authData = await getGoogleAuth(userId);

  if (!authData) {
    throw new Error("Google Calendar not connected");
  }

  const calendar = google.calendar({ version: "v3", auth: authData.client });

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
    calendarId: "primary",
    requestBody: eventBody,
  });

  return response.data;
}

export async function getUpcomingEvents(
  userId: string,
  maxResults = 5
): Promise<calendar_v3.Schema$Event[]> {
  const authData = await getGoogleAuth(userId);

  if (!authData) {
    throw new Error("Google Calendar not connected");
  }

  const calendar = google.calendar({ version: "v3", auth: authData.client });

  const now = new Date();
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 30);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: timeMax.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  return response.data.items || [];
}

/* ── Google Meet via Calendar API (adapted from GigBase) ─────────── */

export interface CreateMeetResult {
  meetLink: string;
  calendarEventId: string;
  calendarEventUrl: string;
}

/**
 * Creates an instant Google Calendar event WITH a Google Meet conference.
 * Adapted from GigBase's instantMeetingController.js and googleCalenderEvent.js.
 *
 * Key: conferenceDataVersion: 1 + conferenceSolutionKey: { type: "hangoutsMeet" }
 * returns the actual Google Meet hangoutLink (not a static URL).
 */
export async function createGoogleMeetEvent(
  userId: string,
  attendees: { email: string; name?: string }[],
  options?: { title?: string; durationMinutes?: number; description?: string }
): Promise<CreateMeetResult> {
  const authData = await getGoogleAuth(userId);

  if (!authData) {
    throw new Error("Google Calendar not connected. Please connect in Settings.");
  }

  const calendar = google.calendar({ version: "v3", auth: authData.client });

  const duration = options?.durationMinutes ?? 30;
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + duration * 60000);

  const names = attendees.map((a) => a.name || a.email).join(", ");
  const summary = options?.title || `Meeting with ${names || "Lead"}`;

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
    calendarId: "primary",
    conferenceDataVersion: 1,
    requestBody: eventBody,
  });

  return {
    meetLink: response.data.hangoutLink || "",
    calendarEventId: response.data.id || "",
    calendarEventUrl: response.data.htmlLink || "",
  };
}

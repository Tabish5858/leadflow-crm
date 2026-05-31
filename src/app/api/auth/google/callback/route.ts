import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { exchangeCodeForTokens, saveCalendarTokens, getGoogleCalendars, updateWorkspaceCalendarConfig } from "@/lib/calendar";
import { getAdminDb } from "@/lib/firebase/admin";
import { cookies } from "next/headers";

function decryptState(state: string): { workspaceId: string; redirectTo: string } | null {
  try {
    // Format: prefix.base64encoded (added by the initiate route)
    const dotIndex = state.indexOf(".");
    if (dotIndex === -1) return null;
    const encoded = state.substring(dotIndex + 1);
    const decoded = JSON.parse(Buffer.from(encoded, "base64").toString());
    if (!decoded.workspaceId) return null;
    return { workspaceId: decoded.workspaceId, redirectTo: decoded.redirectTo || "/settings" };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const error = req.nextUrl.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL("/settings?calendar_error=access_denied", req.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings?calendar_error=invalid_request", req.url)
      );
    }

    const cookieStore = await cookies();
    const storedState = cookieStore.get("calendar_oauth_state");

    if (!storedState || storedState.value !== state) {
      return NextResponse.redirect(
        new URL("/settings?calendar_error=invalid_state", req.url)
      );
    }

    cookieStore.delete("calendar_oauth_state");

    const parsed = decryptState(state);
    if (!parsed) {
      return NextResponse.redirect(
        new URL("/settings?calendar_error=invalid_state", req.url)
      );
    }

    const { workspaceId, redirectTo } = parsed;

    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL(`${redirectTo}?calendar_error=token_exchange_failed`, req.url)
      );
    }

    // Verify the connected Google account email matches the workspace owner's email
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: tokens.access_token });
    const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);

    if (tokenInfo.email) {
      const wsSnap = await getAdminDb().collection("workspaces").doc(workspaceId).get();
      if (wsSnap.exists) {
        const wsData = wsSnap.data()!;
        const ownerUid = wsData.ownerId;

        // Get the workspace owner's Firebase profile email
        const ownerDoc = await getAdminDb().collection("users").doc(ownerUid).get();
        if (ownerDoc.exists) {
          const ownerData = ownerDoc.data()!;
          const ownerEmail = ownerData.email || ownerData.primaryEmail || "";

          if (ownerEmail && tokenInfo.email !== ownerEmail) {
            console.warn(
              `OAuth email mismatch: token=${tokenInfo.email}, owner=${ownerEmail} (workspace=${workspaceId})`
            );
            return NextResponse.redirect(
              new URL(`${redirectTo}?calendar_error=email_mismatch`, req.url)
            );
          }
        }
      }
    }

    // Save tokens at workspace level
    await saveCalendarTokens(workspaceId, tokens, tokenInfo.email || "");

    // After connecting, fetch the user's calendars and save them as the initial config
    try {
      const calendars = await getGoogleCalendars(workspaceId);
      if (calendars.length > 0) {
        // Select all calendars by default (user can deselect later)
        await updateWorkspaceCalendarConfig(workspaceId, {
          connected: true,
          email: tokenInfo.email || "",
          connectedCalendars: calendars,
          selectedCalendarIds: calendars.map((c) => c.id),
        });
      }
    } catch (err) {
      // Non-critical: calendar list sync failed, user can refresh manually
      console.error("Failed to sync initial calendar list:", err);
    }

    return NextResponse.redirect(
      new URL(`${redirectTo}?calendar_connected=true`, req.url)
    );
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/settings?calendar_error=unknown", req.url)
    );
  }
}

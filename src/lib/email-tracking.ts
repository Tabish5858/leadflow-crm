import { collection, addDoc, getDocs, query, where, Timestamp, type QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const EMAIL_EVENTS_COLLECTION = "email_events";

export type TrackingEventType = "open" | "click";

export interface EmailEvent {
  id: string;
  emailId: string;
  leadId: string;
  workspaceId: string;
  type: TrackingEventType;
  url?: string;
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
}

export async function logEmailEvent(data: {
  emailId: string;
  leadId: string;
  workspaceId: string;
  type: TrackingEventType;
  url?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, EMAIL_EVENTS_COLLECTION), {
    ...data,
    timestamp: Timestamp.now(),
  });
  return docRef.id;
}

export async function getEmailEvents(emailId: string): Promise<EmailEvent[]> {
  const q = query(
    collection(db, EMAIL_EVENTS_COLLECTION),
    where("emailId", "==", emailId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EmailEvent));
}

export async function getEmailEventsForLead(leadId: string, workspaceId?: string): Promise<EmailEvent[]> {
  const constraints: QueryConstraint[] = [where("leadId", "==", leadId)];
  if (workspaceId) constraints.push(where("workspaceId", "==", workspaceId));
  const q = query(collection(db, EMAIL_EVENTS_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EmailEvent));
}

const TRACKING_PIXEL_GIF = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function getTrackingPixelGif(): string {
  return Buffer.from(TRACKING_PIXEL_GIF, "base64").toString("binary");
}

export function getTrackingPixelGifBase64(): string {
  return `data:image/gif;base64,${TRACKING_PIXEL_GIF}`;
}

export function addTrackingPixel(html: string, emailId: string, baseUrl: string): string {
  const pixelUrl = `${baseUrl}/api/email/track/open/${emailId}`;
  const pixelHtml = `<img src="${pixelUrl}" alt="" width="1" height="1" style="display:none;width:1px;height:1px;" />`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixelHtml}</body>`);
  }

  return `${html}${pixelHtml}`;
}

const DANGEROUS_SCHEMES = /^(javascript|data|file|vbscript|blob):/i;

export function rewriteLinks(html: string, emailId: string, baseUrl: string): string {
  const trackerUrl = `${baseUrl}/api/email/track/click/${emailId}`;

  return html.replace(
    /(href\s*=\s*["'])([^"']+)["']/gi,
    (match, prefix, url) => {
      // Skip already-tracked links
      if (url.includes("/api/email/track/")) return match;
      // Only rewrite http/https links - skip dangerous schemes
      if (!url.match(/^https?:\/\//i)) return match;
      const encodedUrl = encodeURIComponent(url);
      return `${prefix}${trackerUrl}?url=${encodedUrl}"`;
    }
  );
}

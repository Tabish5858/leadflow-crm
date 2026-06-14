import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Google Calendar Setup · Calendar Sync & Meet",
  description:
    "Step-by-step guide to enable the Google Calendar API, configure the OAuth consent screen, create OAuth 2.0 credentials, and connect Google Meet for LeadFlow CRM.",
  openGraph: {
    title: "Google Calendar Setup · Calendar Sync & Meet",
    description:
      "Configure Google Calendar and Meet integration for LeadFlow CRM: Google Cloud project, OAuth consent, and credentials.",
    url: "https://crm.tabishbinishfaq.dev/docs/google-calendar-setup",
    type: "article",
  },
};

function Callout({ type, children }: { type: "tip" | "warning" | "info"; children: React.ReactNode }) {
  const colors = {
    tip: "border-primary/20 bg-white/[3%]",
    warning: "border-amber-500/20 bg-white/[3%]",
    info: "border-blue-500/20 bg-white/[3%]",
  };
  return (
    <div className={`not-prose my-6 flex items-start gap-3 rounded-lg border p-4 ${colors[type]}`}>
      <span className="mt-0.5 shrink-0 text-base">{type === "tip" ? "💡" : type === "warning" ? "⚠️" : "ℹ️"}</span>
      <div className="text-sm text-neutral-300 [&_strong]:text-white [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2">{children}</div>
    </div>
  );
}

export default function GoogleCalendarSetupPage() {
  return (
    <div>
      <h1>Google Calendar Setup</h1>
      <p className="lead">
        Google Calendar integration powers meeting scheduling, calendar sync, and Google Meet
        creation in LeadFlow. The Google Calendar API is free to use within standard quota limits.
      </p>

      <hr />

      <h2>Step-by-Step Guide</h2>
      <p>Follow this walkthrough to create a Google Cloud project, set up OAuth, and enable the Calendar API:</p>

      <div className="not-prose my-6 overflow-hidden rounded-lg border border-neutral-800 bg-black">
        <iframe
          src="https://scribehow.com/embed/How_To_Set_Up_A_Google_Cloud_Project_OAuth_And_Enable_Google_Calendar_API__VxpuaeP2S_SvtzNlnnjiTg"
          className="w-full"
          style={{ height: "600px" }}
          allow="fullscreen"
        />
      </div>

      <hr />

      <h2>Configuration Values</h2>
      <p>After setup, collect these values:</p>

      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>GOOGLE_CLIENT_ID</code></td>
            <td>Credentials → OAuth 2.0 Client ID</td>
          </tr>
          <tr>
            <td><code>GOOGLE_CLIENT_SECRET</code></td>
            <td>Credentials → OAuth 2.0 Client Secret</td>
          </tr>
          <tr>
            <td><code>GOOGLE_REDIRECT_URI</code></td>
            <td><code>https://yourdomain.com/api/auth/google/callback</code></td>
          </tr>
        </tbody>
      </table>

      <Callout type="warning">
        <strong>Redirect URI must match:</strong> The redirect URI in your OAuth credentials must exactly match the callback URL in your LeadFlow deployment, including the domain.
      </Callout>

      <hr />

      <p>
        Next, configure{" "}
        <Link href="/docs/env-variables">environment variables</Link>.
      </p>
    </div>
  );
}

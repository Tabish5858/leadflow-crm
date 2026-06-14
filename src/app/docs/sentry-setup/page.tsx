import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sentry Setup · Error Tracking & Performance",
  description:
    "Step-by-step guide to create a Sentry project, configure error tracking, and set up your DSN for LeadFlow CRM runtime error monitoring.",
  openGraph: {
    title: "Sentry Setup · Error Tracking & Performance",
    description:
      "Configure Sentry for error tracking in LeadFlow CRM: project creation, API token, and DSN setup.",
    url: "https://crm.tabishbinishfaq.dev/docs/sentry-setup",
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

export default function SentrySetupPage() {
  return (
    <div>
      <h1>Sentry Setup</h1>
      <p className="lead">
        Sentry captures runtime errors, performance traces, and crash reports in LeadFlow.
        It is optional — skip this if you do not need error monitoring.
      </p>

      <Callout type="info">
        <strong>Free tier:</strong> Sentry offers 5,000 error events and 5,000 performance transactions per month on the free Developer plan. No credit card required.
      </Callout>

      <hr />

      <h2>Step-by-Step Guide</h2>
      <p>Follow this walkthrough to create a Sentry project and generate your DSN:</p>

      <div className="not-prose my-6 overflow-hidden rounded-lg border border-neutral-800 bg-black">
        <iframe
          src="https://scribehow.com/embed/How_to_Create_a_Sentry_Project_and_API_Token__1tvYHq9rQk6dis32hOiSsg"
          className="w-full"
          style={{ height: "600px" }}
          allow="fullscreen"
        />
      </div>

      <hr />

      <h2>Configuration Values</h2>
      <p>After setup, collect this value:</p>

      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Required</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>SENTRY_DSN</code></td>
            <td>No</td>
            <td>Project Settings → Client Keys (DSN)</td>
          </tr>
        </tbody>
      </table>

      <pre>
        <code>{`# Sentry (optional — omit to disable error tracking)
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@xxxxxx.ingest.us.sentry.io/xxxxxx`}</code>
      </pre>

      <Callout type="tip">
        <strong>Source maps:</strong> For readable stack traces, configure source map uploading in your <code>.sentryclirc</code> or Vercel integration. Sentry automatically uploads source maps during Vercel builds when the integration is enabled.
      </Callout>

      <hr />

      <p>
        Done with services? Configure your{" "}
        <Link href="/docs/env-variables">environment variables</Link>.
      </p>
    </div>
  );
}

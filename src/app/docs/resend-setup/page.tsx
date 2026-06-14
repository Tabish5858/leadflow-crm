import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resend Setup · Transactional Email",
  description:
    "Step-by-step guide to create a Resend account, verify your sending domain, and create an API key for LeadFlow CRM transactional email — with Brevo as a free fallback option.",
  openGraph: {
    title: "Resend Setup · Transactional Email",
    description:
      "Configure Resend for transactional email in LeadFlow CRM: account creation, domain verification, and API key setup.",
    url: "https://crm.tabishbinishfaq.dev/docs/resend-setup",
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

export default function ResendSetupPage() {
  return (
    <div>
      <h1>Resend Setup</h1>
      <p className="lead">
        Resend powers transactional emails in LeadFlow — workspace invitations, password resets,
        invoice notifications, and contract signing links. The free tier includes 3,000 emails per month.
      </p>

      <Callout type="tip">
        <strong>Free tier:</strong> 3,000 emails/month, 100 emails/day — enough for most freelancers and small teams. No credit card required.
      </Callout>

      <hr />

      <h2>Step-by-Step Guide</h2>
      <p>Follow this walkthrough to verify your domain and create an API key:</p>

      <div className="not-prose my-6 overflow-hidden rounded-lg border border-neutral-800 bg-black">
        <iframe
          src="https://scribehow.com/embed/How_to_Configure_Domains_and_API_Keys_in_Resend__Ydn0FQZ1ROClgPnkaEYrnQ"
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
            <td><code>RESEND_API_KEY</code></td>
            <td>Resend Dashboard → API Keys (required)</td>
          </tr>
          <tr>
            <td><code>BREVO_API_KEY</code></td>
            <td>Brevo Dashboard → API Keys (fallback, optional)</td>
          </tr>
        </tbody>
      </table>

      <Callout type="info">
        <strong>Brevo fallback:</strong> Brevo offers 300 free emails/day. If you prefer Brevo over Resend, set <code>BREVO_API_KEY</code> and leave <code>RESEND_API_KEY</code> empty. LeadFlow falls back automatically.
      </Callout>

      <hr />

      <p>
        Next, configure{" "}
        <Link href="/docs/google-calendar-setup">Google Calendar</Link>.
      </p>
    </div>
  );
}

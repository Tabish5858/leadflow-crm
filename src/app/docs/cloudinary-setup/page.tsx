import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cloudinary Setup · File & Document Storage",
  description:
    "Step-by-step guide to create a Cloudinary account, get API keys, and configure upload presets for LeadFlow CRM document and file storage.",
  openGraph: {
    title: "Cloudinary Setup · File & Document Storage",
    description:
      "Configure Cloudinary for document and file storage in LeadFlow CRM.",
    url: "https://crm.tabishbinishfaq.dev/docs/cloudinary-setup",
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

export default function CloudinarySetupPage() {
  return (
    <div>
      <h1>Cloudinary Setup</h1>
      <p className="lead">
        Cloudinary powers document uploads in LeadFlow — invoices, contracts, project files,
        and client documents. The free tier includes 25 GB of storage and 25 GB of bandwidth.
      </p>

      <hr />

      <h2>Step-by-Step Guide</h2>
      <p>Follow this walkthrough to create an account and configure your API settings:</p>

      <div className="not-prose my-6 overflow-hidden rounded-lg border border-neutral-800 bg-black">
        <iframe
          src="https://scribehow.com/embed/How_to_Configure_Cloudinary_Security_and_API_Settings__flpjNZ-lQSKGOLhykfAyMw"
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
            <td><code>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code></td>
            <td>Account Details → Cloud Name</td>
          </tr>
          <tr>
            <td><code>CLOUDINARY_CLOUD_NAME</code></td>
            <td>Same as above</td>
          </tr>
          <tr>
            <td><code>CLOUDINARY_API_KEY</code></td>
            <td>Account Details → API Key</td>
          </tr>
          <tr>
            <td><code>CLOUDINARY_API_SECRET</code></td>
            <td>Account Details → API Secret</td>
          </tr>
          <tr>
            <td><code>CLOUDINARY_UPLOAD_PRESET</code></td>
            <td>Settings → Upload → Upload presets (optional)</td>
          </tr>
        </tbody>
      </table>

      <Callout type="tip">
        <strong>Upload preset:</strong> Creating an unsigned upload preset allows the browser to upload files directly to Cloudinary without exposing your API Secret.
      </Callout>

      <hr />

      <p>
        Next, configure{" "}
        <Link href="/docs/resend-setup">Resend for transactional email</Link>.
      </p>
    </div>
  );
}

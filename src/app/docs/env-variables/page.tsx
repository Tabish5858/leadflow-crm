import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Environment Variables · Complete Reference",
  description:
    "Complete reference for all environment variables in LeadFlow CRM: Firebase, Cloudinary, Resend, Google Calendar, and general configuration. Includes step-by-step setup instructions.",
  openGraph: {
    title: "Environment Variables · Complete Reference",
    description:
      "Complete reference for all LeadFlow CRM environment variables.",
    url: "https://crm.tabishbinishfaq.dev/docs/env-variables",
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

export default function EnvVariablesPage() {
  return (
    <div>
      <h1>Environment Variables</h1>
      <p className="lead">
        Complete reference for all environment variables in LeadFlow CRM.
        These values connect your instance to Firebase, Cloudinary, Resend, Google Calendar,
        and other services.
      </p>

      <Callout type="tip">
        <strong>Quick start:</strong> Copy <code>.env.example</code> to <code>.env.local</code> and fill in your values.
        The example file includes all required variables with placeholder descriptions.
      </Callout>

      <pre>
        <code>{`cp .env.example .env.local`}</code>
      </pre>

      <hr />

      <h2>Firebase Configuration</h2>

      <p>
        These values come from your Firebase project. See the{" "}
        <a href="/docs/firebase-setup">Firebase Setup Guide</a> for detailed instructions.
      </p>

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
            <td><code>NEXT_PUBLIC_FIREBASE_API_KEY</code></td>
            <td>Yes</td>
            <td>Firebase Console → Project Settings → Web API Key</td>
          </tr>
          <tr>
            <td><code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code></td>
            <td>Yes</td>
            <td>Firebase Console → Project Settings → Auth domain</td>
          </tr>
          <tr>
            <td><code>NEXT_PUBLIC_FIREBASE_PROJECT_ID</code></td>
            <td>Yes</td>
            <td>Firebase Console → Project Settings → Project ID</td>
          </tr>
          <tr>
            <td><code>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</code></td>
            <td>Yes</td>
            <td>Firebase Console → Project Settings → Storage bucket</td>
          </tr>
          <tr>
            <td><code>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</code></td>
            <td>Yes</td>
            <td>Firebase Console → Project Settings → Sender ID</td>
          </tr>
          <tr>
            <td><code>NEXT_PUBLIC_FIREBASE_APP_ID</code></td>
            <td>Yes</td>
            <td>Firebase Console → Project Settings → App ID</td>
          </tr>
          <tr>
            <td><code>FIREBASE_ADMIN_CLIENT_EMAIL</code></td>
            <td>Yes</td>
            <td>Firebase Console → Service Accounts → Private key → <code>client_email</code></td>
          </tr>
          <tr>
            <td><code>FIREBASE_ADMIN_PRIVATE_KEY</code></td>
            <td>Yes</td>
            <td>Firebase Console → Service Accounts → Private key → <code>private_key</code></td>
          </tr>
        </tbody>
      </table>

      <pre>
        <code>{`# Firebase Client SDK (public · used in browser)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123...

# Firebase Admin SDK (server-only · keep secure)
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n..."`}</code>
      </pre>

      <Callout type="warning">
        <strong>Private key formatting:</strong> The <code>FIREBASE_ADMIN_PRIVATE_KEY</code>
        contains newlines. In <code>.env.local</code>, wrap the value in double quotes and
        replace actual newlines with <code>\n</code>:
        <pre><code>FIREBASE_ADMIN_PRIVATE_KEY=&quot;-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n&quot;</code></pre>
        In Vercel, paste the value directly (the UI handles newlines automatically).
      </Callout>

      <hr />

      <h2>Cloudinary Configuration</h2>

      <p>
        See the <a href="/docs/cloudinary-setup">Cloudinary Setup Guide</a> for detailed instructions.
      </p>

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
            <td><code>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code></td>
            <td>Yes</td>
            <td>Cloudinary Console → Account Details</td>
          </tr>
          <tr>
            <td><code>CLOUDINARY_CLOUD_NAME</code></td>
            <td>Yes</td>
            <td>Same as above</td>
          </tr>
          <tr>
            <td><code>CLOUDINARY_API_KEY</code></td>
            <td>Yes</td>
            <td>Cloudinary Console → Account Details</td>
          </tr>
          <tr>
            <td><code>CLOUDINARY_API_SECRET</code></td>
            <td>Yes</td>
            <td>Cloudinary Console → Account Details</td>
          </tr>
          <tr>
            <td><code>CLOUDINARY_UPLOAD_PRESET</code></td>
            <td>No</td>
            <td>Cloudinary Settings → Upload → Upload presets</td>
          </tr>
        </tbody>
      </table>

      <pre>
        <code>{`# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abc123def456
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
# CLOUDINARY_UPLOAD_PRESET=leadflow_uploads  # optional`}</code>
      </pre>

      <hr />

      <h2>Resend (Email) Configuration</h2>

      <p>
        See the <a href="/docs/resend-setup">Resend Setup Guide</a> for detailed instructions.
      </p>

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
            <td><code>RESEND_API_KEY</code></td>
            <td>Yes (or BREVO_API_KEY)</td>
            <td>Resend Dashboard → API Keys</td>
          </tr>
          <tr>
            <td><code>BREVO_API_KEY</code></td>
            <td>Yes (or RESEND_API_KEY)</td>
            <td>Brevo Dashboard → API Keys</td>
          </tr>
        </tbody>
      </table>

      <pre>
        <code>{`# Resend (primary email provider)
RESEND_API_KEY=re_xxxxxxxxxxxx

# OR Brevo (fallback)
# BREVO_API_KEY=your_brevo_api_key`}</code>
      </pre>

      <hr />

      <h2>Google Calendar Configuration</h2>

      <p>
        See the <a href="/docs/google-calendar-setup">Google Calendar Setup Guide</a> for detailed instructions.
      </p>

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
            <td><code>GOOGLE_CLIENT_ID</code></td>
            <td>Yes</td>
            <td>Google Cloud → Credentials → OAuth 2.0 Client ID</td>
          </tr>
          <tr>
            <td><code>GOOGLE_CLIENT_SECRET</code></td>
            <td>Yes</td>
            <td>Google Cloud → Credentials → OAuth 2.0 Client Secret</td>
          </tr>
          <tr>
            <td><code>GOOGLE_REDIRECT_URI</code></td>
            <td>Yes</td>
            <td>Your app URL + <code>/api/auth/google/callback</code></td>
          </tr>
        </tbody>
      </table>

      <pre>
        <code>{`# Google Calendar
GOOGLE_CLIENT_ID=123456789-xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://crm.yourdomain.com/api/auth/google/callback`}</code>
      </pre>

      <hr />

      <h2>Sentry (Error Tracking)</h2>

      <p>
        Sentry captures runtime errors and performance data. It is optional — omit <code>SENTRY_DSN</code> to disable error tracking entirely.
        See the <a href="/docs/sentry-setup">Sentry Setup Guide</a> for detailed instructions.
      </p>

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
            <td>Sentry Dashboard → Project Settings → DSN</td>
          </tr>
        </tbody>
      </table>

      <pre>
        <code>{`# Sentry (optional)
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@xxxxxx.ingest.us.sentry.io/xxxxxx`}</code>
      </pre>

      <Callout type="info">
        <strong>Performance monitoring:</strong> Sentry also provides tracing for API route performance. Enable it in your <code>sentry.client.config.ts</code> and <code>sentry.server.config.ts</code> files.
      </Callout>

      <hr />

      <h2>General Configuration</h2>

      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>NEXT_PUBLIC_APP_URL</code></td>
            <td>Yes</td>
            <td>Your app&apos;s public URL (e.g. <code>https://crm.yourdomain.com</code>) · used for OAuth redirects, invite links, and canonical URLs. No trailing slash.</td>
          </tr>
          <tr>
            <td><code>NEXT_PUBLIC_GA_MEASUREMENT_ID</code></td>
            <td>No</td>
            <td>Google Analytics 4 measurement ID (e.g. <code>G-XXXXXXXXXX</code>). Optional · omitting it disables analytics.</td>
          </tr>
          <tr>
            <td><code>SENTRY_DSN</code></td>
            <td>No</td>
            <td>Sentry error tracking DSN. Optional · omitting it disables Sentry.</td>
          </tr>
        </tbody>
      </table>

      <pre>
        <code>{`# General
NEXT_PUBLIC_APP_URL=https://crm.yourdomain.com
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX  # optional
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@xxxxxx.ingest.us.sentry.io/xxxxxx  # optional`}</code>
      </pre>

      <hr />

      <h2>Complete <code>.env.local</code> Example</h2>

      <pre>
        <code>{`# ─── General ──────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://crm.yourdomain.com

# ─── Firebase · Client SDK ──────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123...

# ─── Firebase · Admin SDK (server-only) ─────────────
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ─── Cloudinary ────────────────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abc123def456
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name

# ─── Email (Resend primary, Brevo fallback) ────────
RESEND_API_KEY=re_xxxxxxxxxxxx
# BREVO_API_KEY=your_brevo_api_key

# ─── Google Calendar ───────────────────────────────
GOOGLE_CLIENT_ID=123456789-xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://crm.yourdomain.com/api/auth/google/callback

# ─── Optional ─────────────────────────────────────
# NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
# SENTRY_DSN=https://xxx@xxx.ingest.us.sentry.io/xxx`}</code>
      </pre>

      <hr />

      <h2>Deploying to Vercel</h2>

      <p>
        When deploying to Vercel, add all environment variables in the Vercel project dashboard:
      </p>

      <ol>
        <li>Go to your Vercel project → <strong>Settings</strong> → <strong>Environment Variables</strong>.</li>
        <li>Add each variable from the lists above.</li>
        <li>
          For <code>FIREBASE_ADMIN_PRIVATE_KEY</code>, paste the key value directly (Vercel handles newlines).
        </li>
        <li>Select the appropriate environments (Production, Preview, Development).</li>
        <li>Click <strong>Save</strong>.</li>
      </ol>

      <div className="not-prose rounded-lg border border-dashed border-neutral-800 bg-white/[3%] p-8 text-center text-sm text-neutral-400">
        <p className="font-medium text-neutral-300">Screenshot: Vercel Environment Variables</p>
        <p className="mt-1 text-xs text-neutral-500">Show the Vercel Environment Variables settings page with several variables added (Firebase, Cloudinary, Resend, Google). Highlight the key-value pairs and environment selectors.</p>
      </div>

      <Callout type="tip">
        After adding variables, redeploy your app from the Vercel dashboard or push a new commit
        to trigger a deployment. Environment variables take effect after the build completes.
      </Callout>

      <hr />

      <h2>Verification</h2>

      <p>
        After configuring all variables, start the development server:
      </p>

      <pre>
        <code>{`npm run dev`}</code>
      </pre>

      <p>
        If all variables are configured correctly:
      </p>

      <ul>
        <li>The landing page loads without errors</li>
        <li>Firebase Authentication works (sign up / sign in)</li>
        <li>Firestore reads/writes succeed</li>
        <li>Cloudinary uploads work in the Documents section</li>
        <li>Emails are sent via Resend</li>
        <li>Google Calendar OAuth flow completes</li>
      </ul>

      <p>
        Ready to deploy? See the{" "}
        <a href="/docs/deploy">Deploy to Vercel guide</a>.
      </p>
    </div>
  );
}

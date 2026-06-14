import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Firebase Setup · Auth, Firestore & Storage",
  description:
    "Step-by-step guide to create a Firebase project, enable Authentication providers, create a Firestore database, deploy security rules and indexes, enable Storage, and retrieve configuration values for LeadFlow CRM.",
  openGraph: {
    title: "Firebase Setup · Auth, Firestore & Storage",
    description:
      "Complete Firebase configuration guide for LeadFlow CRM: project creation, authentication, database, and storage.",
    url: "https://crm.tabishbinishfaq.dev/docs/firebase-setup",
    type: "article",
  },
};

function Callout({
  type,
  children,
}: {
  type: "tip" | "warning" | "info";
  children: React.ReactNode;
}) {
  const icons = { tip: "💡", warning: "⚠️", info: "ℹ️" };
  const colors = {
    tip: "border-primary/20 bg-white/[3%]",
    warning: "border-amber-500/20 bg-white/[3%]",
    info: "border-blue-500/20 bg-white/[3%]",
  };
  return (
    <div className={`not-prose my-6 flex items-start gap-3 rounded-lg border p-4 ${colors[type]}`}>
      <span className="mt-0.5 shrink-0 text-base">{icons[type]}</span>
      <div className="text-sm text-neutral-300 [&_strong]:text-white [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2">
        {children}
      </div>
    </div>
  );
}

export default function FirebaseSetupPage() {
  return (
    <div>
      <h1>Firebase Setup</h1>
      <p className="lead">
        Create a Firebase project, enable authentication, set up Firestore, deploy security rules, and configure Firebase Storage.
      </p>

      <Callout type="tip">
        <strong>Free tier:</strong> Firebase Spark plan includes 50,000 reads/day, 20,000 writes/day, and 1 GB of storage — enough for solo freelancers and small teams. No credit card required.
      </Callout>

      <hr />

      <h2>Step-by-Step Guide</h2>
      <p>Follow this interactive walkthrough to set up your Firebase project:</p>

      <div className="not-prose my-6 overflow-hidden rounded-lg border border-neutral-800 bg-black">
        <iframe
          src="https://scribehow.com/embed/Setting_Up_A_New_Firebase_Project_With_Database_And_Auth__KGTDT1dGSzG01u7AzrkzlQ"
          className="w-full"
          style={{ height: "600px" }}
          allow="fullscreen"
        />
      </div>

      <Callout type="info">
        <strong>Authorized domains:</strong> If you are using a custom domain with Vercel, add it to the <strong>Authorized domains</strong> list in Authentication &gt; Settings. Firebase needs this to allow sign-in redirects from your domain.
      </Callout>

      <hr />

      <h2>Configuration Values</h2>
      <p>After setup, collect these values for your environment variables:</p>

      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>NEXT_PUBLIC_FIREBASE_API_KEY</code></td>
            <td>Project Settings → Web API Key</td>
          </tr>
          <tr>
            <td><code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code></td>
            <td>Project Settings → Auth domain</td>
          </tr>
          <tr>
            <td><code>NEXT_PUBLIC_FIREBASE_PROJECT_ID</code></td>
            <td>Project Settings → Project ID</td>
          </tr>
          <tr>
            <td><code>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</code></td>
            <td>Project Settings → Storage bucket</td>
          </tr>
          <tr>
            <td><code>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</code></td>
            <td>Project Settings → Sender ID</td>
          </tr>
          <tr>
            <td><code>NEXT_PUBLIC_FIREBASE_APP_ID</code></td>
            <td>Project Settings → App ID</td>
          </tr>
          <tr>
            <td><code>FIREBASE_ADMIN_CLIENT_EMAIL</code></td>
            <td>Service Accounts → Private key → <code>client_email</code></td>
          </tr>
          <tr>
            <td><code>FIREBASE_ADMIN_PRIVATE_KEY</code></td>
            <td>Service Accounts → Private key → <code>private_key</code></td>
          </tr>
        </tbody>
      </table>

      <Callout type="warning">
        <strong>Secure the private key:</strong> The Admin SDK private key grants full access to your Firebase project. Never commit it to version control. Add it as a Vercel environment variable or GitHub Actions secret.
      </Callout>

      <hr />

      <h2>Verification</h2>
      <p>After configuration, confirm these work:</p>

      <ul>
        <li>Authentication — sign up and sign in work</li>
        <li>Firestore — reads and writes succeed</li>
        <li>Security rules — workspace isolation enforced</li>
        <li>Storage — file uploads work (fallback)</li>
      </ul>

      <p>
        Next, configure{" "}
        <Link href="/docs/cloudinary-setup">Cloudinary for file storage</Link>.
      </p>
    </div>
  );
}

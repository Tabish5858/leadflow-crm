import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deploy to Vercel · Self-Host LeadFlow CRM",
  description:
    "Step-by-step guide to deploy LeadFlow CRM on Vercel, configure environment variables, set up a custom domain, and verify your deployment. Self-hosting on any Node.js server alternative included.",
  openGraph: {
    title: "Deploy to Vercel · Self-Host LeadFlow CRM",
    description:
      "Deploy LeadFlow CRM on Vercel in 5 minutes: import from GitHub, configure environment variables, deploy, and verify.",
    url: "https://crm.tabishbinishfaq.dev/docs/deploy",
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

export default function DeployPage() {
  return (
    <div>
      <h1>Deploy to Vercel</h1>
      <p className="lead">
        Deploy your LeadFlow instance to Vercel in under 5 minutes. Vercel provides
        automatic HTTPS, a global CDN, continuous deployment from Git, and a generous
        free tier (100 GB bandwidth, 100k function invocations per month).
      </p>

      <Callout type="info">
        <strong>Prerequisites:</strong> Before deploying, complete the service setup guides:
        <a href="/docs/firebase-setup">Firebase</a>,{" "}
        <a href="/docs/cloudinary-setup">Cloudinary</a>,{" "}
        <a href="/docs/resend-setup">Resend</a>,{" "}
        <a href="/docs/google-calendar-setup">Google Calendar</a>, and{" "}
        <a href="/docs/env-variables">environment variables</a>.
      </Callout>

      <hr />

      <h2>Prerequisite: Push Your Fork to GitHub</h2>

      <p>
        If you haven&apos;t already, push your forked repository to GitHub:
      </p>

      <pre>
        <code>{`# If you cloned your fork locally and made changes
git push origin main`}</code>
      </pre>

      <p>
        Your repository should contain all the LeadFlow source code with your
        configuration changes committed.
      </p>

      <hr />

      <h2>Step-by-Step Deployment Guide</h2>
      <p>Follow this interactive walkthrough to deploy LeadFlow CRM on Vercel — covers importing from GitHub, configuring environment variables, and deploying:</p>

      <div className="not-prose my-6 overflow-hidden rounded-lg border border-neutral-800 bg-black">
        <iframe
          src="https://scribehow.com/embed/Deploy_on_Vercel__UWaF5DsOTjyScz5BA8YnLQ"
          className="w-full"
          style={{ height: "600px" }}
          allow="fullscreen"
        />
      </div>

      <Callout type="warning">
        <strong>Build fails?</strong> The most common causes are missing environment variables,
        especially <code>NEXT_PUBLIC_FIREBASE_*</code> and <code>FIREBASE_ADMIN_PRIVATE_KEY</code>.
        Check the build logs in Vercel for the specific error.
      </Callout>

      <hr />

      <h2>Set Up a Custom Domain (Optional)</h2>
      <p>Follow this walkthrough to add and configure a custom domain for your Vercel deployment:</p>

      <div className="not-prose my-6 overflow-hidden rounded-lg border border-neutral-800 bg-black">
        <iframe
          src="https://scribehow.com/embed/How_to_Add_and_Edit_Custom_Domain__hnzSw1ZMTOaELuv1ZH3Nyg"
          className="w-full"
          style={{ height: "600px" }}
          allow="fullscreen"
        />
      </div>

      <Callout type="tip">
        After adding a custom domain, update <code>NEXT_PUBLIC_APP_URL</code> in your
        Vercel environment variables to match your new domain, then redeploy.
      </Callout>

      <hr />

      <h2>Continuous Deployment</h2>

      <p>
        Vercel automatically deploys every time you push to your GitHub repository&apos;s
        default branch. The workflow is:
      </p>

      <ol>
        <li>Make changes locally</li>
        <li>Commit and push to GitHub: <code>git push origin main</code></li>
        <li>Vercel detects the push, builds, and deploys automatically</li>
        <li>Your site updates in under 2 minutes</li>
      </ol>

      <p>
        You can also create <strong>Preview Deployments</strong> for pull requests ·
        Vercel automatically deploys each PR to a unique preview URL for testing.
      </p>

      <hr />

      <h2>Alternative: Self-Host on Any Node.js Server</h2>

      <p>
        If you prefer to self-host rather than use Vercel, LeadFlow runs on any Node.js server:
      </p>

      <pre>
        <code>{`# Clone your fork on the server
git clone https://github.com/Tabish5858/Leadflow-CRM.git
cd Leadflow-CRM

# Install dependencies
npm install

# Create and configure .env file
cp .env.example .env
# Edit .env with your service credentials

# Build for production
npm run build

# Start the server
npm start`}</code>
      </pre>

      <p>
        The production server runs on <code>http://localhost:3000</code> by default.
        Use a reverse proxy (nginx, Caddy) with automatic HTTPS in front of it.
      </p>

      <Callout type="info">
        <strong>Requirements:</strong> Node.js 22+ and npm 10+. LeadFlow stores all data
        in Firebase, so no database setup is needed on the server.
      </Callout>

      <hr />

      <h2>Verify the Deployment</h2>

      <p>
        After deploying, verify everything works:
      </p>

      <ul>
        <li><strong>Landing page loads</strong> · Visit your deployment URL</li>
        <li><strong>Authentication works</strong> · Register a new account or sign in</li>
        <li><strong>Demo mode loads</strong> · Click &ldquo;Try Demo&rdquo; on the landing page</li>
        <li><strong>Firestore operations work</strong> · Create a test lead or project</li>
        <li><strong>Documents upload</strong> · Upload a file in the Documents section</li>
        <li><strong>Emails send</strong> · Check the Resend dashboard for sent emails</li>
      </ul>

      <p>
        If something isn&apos;t working, check the Vercel deployment logs or the
        browser console for error messages.
      </p>

      <hr />

      <h2>Next Steps</h2>

      <ul>
        <li>
          <a href="/docs/architecture">Explore the architecture</a> · understand how the
          modules, data layer, and services fit together.
        </li>
        <li>
          Review the <a href="https://github.com/Tabish5858/Leadflow-CRM/blob/main/CONTRIBUTING.md">contributing guide</a>{" "}
          if you want to customize or extend the platform.
        </li>
      </ul>
    </div>
  );
}

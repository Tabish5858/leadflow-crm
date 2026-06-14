import { CheckCircle, Github, Terminal } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Getting Started · Fork, Clone & Install",
  description:
    "Prerequisites and step-by-step instructions to fork the LeadFlow CRM repository, clone it locally, and install dependencies.",
  openGraph: {
    title: "Getting Started · Fork, Clone & Install",
    description: "Set up your LeadFlow CRM development environment in under 5 minutes.",
    url: "https://crm.tabishbinishfaq.dev/docs/getting-started",
    type: "article",
  },
};

export default function GettingStartedPage() {
  return (
    <div>
      <h1>Getting Started</h1>
      <p className="lead">
        Fork the repository, clone it to your machine, and install dependencies.
        This takes about 2 minutes.
      </p>

      <hr />

      <h2>Prerequisites</h2>

      <p>Before you begin, make sure you have the following installed:</p>

      <ul>
        <li>
          <strong>Node.js 22+</strong> · Download from{" "}
          <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer">nodejs.org</a>
          . Verify with <code>node --version</code>.
        </li>
        <li>
          <strong>npm 10+</strong> · Bundled with Node.js. Verify with <code>npm --version</code>.
        </li>
        <li>
          <strong>Git</strong> · Download from{" "}
          <a href="https://git-scm.com" target="_blank" rel="noopener noreferrer">git-scm.com</a>
          . Verify with <code>git --version</code>.
        </li>
        <li>
          <strong>A GitHub account</strong> ·{" "}
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">Sign up free</a>
          {" "}if you don&apos;t have one.
        </li>
      </ul>

      <div className="not-prose my-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-white/[3%] p-4">
        <span className="mt-0.5 shrink-0 text-base">💡</span>
        <div className="text-sm text-neutral-300 [&_strong]:text-white">
          <strong>Free tier:</strong> LeadFlow runs on the Firebase Spark free plan. You don&apos;t need
          a paid Firebase subscription to get started.
        </div>
      </div>

      <hr />

      <h2>Step 1: Fork the Repository</h2>

      <p>
        Forking creates a copy of the LeadFlow repository under your GitHub account.
        This lets you deploy and customize your own instance.
      </p>

      <ol>
        <li>
          Navigate to{" "}
          <a href="https://github.com/Tabish5858/Leadflow-CRM" target="_blank" rel="noopener noreferrer">
            github.com/Tabish5858/Leadflow-CRM
          </a>
        </li>
        <li>Click the <strong>Fork</strong> button in the top-right corner</li>
        <li>Select your GitHub account as the destination</li>
        <li>Click <strong>Create fork</strong></li>
      </ol>

      {/* Fork screenshot — place your fork-screenshot.png in /public/docs/ */}
      <div className="not-prose my-6 overflow-hidden rounded-lg border border-neutral-800 bg-black">
        <img
          src="/docs/forkimage.png"
          alt="GitHub Fork button in the top-right corner of the repository page"
          className="w-full"
        />
      </div>

      <hr />

      <h2>Step 2: Clone Your Fork</h2>

      <p>
        Open a terminal and clone the forked repository to your local machine:
      </p>

      <pre>
        <code>{`git clone https://github.com/Tabish5858/Leadflow-CRM.git
cd Leadflow-CRM`}</code>
      </pre>

      <blockquote>
        Replace <code>Tabish5858</code> with your actual GitHub username.
      </blockquote>

      <hr />

      <h2>Step 3: Install Dependencies</h2>

      <p>
        Install all required npm packages:
      </p>

      <pre>
        <code>{`npm install`}</code>
      </pre>

      <p>
        This installs Next.js, React, Firebase SDK, and all other dependencies
        defined in <code>package.json</code>. It typically takes 30–60 seconds.
      </p>

      <hr />

      <h2>Step 4: Verify the Installation</h2>

      <p>
        Start the development server to confirm everything works:
      </p>

      <pre>
        <code>{`npm run dev`}</code>
      </pre>

      <p>
        Open <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer">http://localhost:3000</a> in
        your browser. You should see the LeadFlow landing page.
      </p>

      <div className="not-prose flex items-start gap-3 rounded-lg border border-primary/20 bg-white/[3%] p-4">
        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="font-medium text-sm text-white">Installation Complete</p>
          <p className="mt-0.5 text-sm text-neutral-300">
            You now have LeadFlow running locally. Next, configure the services:
            Firebase, Cloudinary, Resend, and Google Calendar.
          </p>
        </div>
      </div>

      <hr />

      <h2>Next Steps</h2>

      <p>
        With the codebase set up locally, proceed to configure the required services:
      </p>

      <ol>
        <li><a href="/docs/firebase-setup">Set up Firebase</a> · authentication, database, and storage</li>
        <li><a href="/docs/cloudinary-setup">Set up Cloudinary</a> · file and document storage</li>
        <li><a href="/docs/resend-setup">Set up Resend</a> · transactional email</li>
        <li><a href="/docs/google-calendar-setup">Set up Google Calendar</a> · calendar sync and meeting creation</li>
        <li><a href="/docs/env-variables">Configure environment variables</a> · wire everything together</li>
      </ol>
    </div>
  );
}

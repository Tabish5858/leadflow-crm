import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink, Github, Globe, Terminal, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Self-Host LeadFlow CRM with Docker | Deploy in 10 Minutes",
  description:
    "Step-by-step guide to self-host LeadFlow CRM on your own VPS using Docker Compose. Requirements, environment variables, Firebase setup, and production tips.",
  openGraph: {
    title: "Self-Host LeadFlow CRM with Docker | Deploy in 10 Minutes",
    description:
      "Step-by-step guide to self-host LeadFlow CRM on your own VPS using Docker Compose. Requirements, environment variables, Firebase setup, and production tips.",
    url: "https://crm.tabishbinishfaq.dev/docs/deploy",
    type: "article",
  },
  keywords: [
    "self-host CRM Docker",
    "Docker CRM deployment",
    "self-hosted CRM",
    "open source CRM Docker",
    "LeadFlow deploy",
    "CRM VPS setup",
    "Docker Compose CRM",
    "self-host LeadFlow",
  ],
};

const steps = [
  {
    title: "Prerequisites",
    content: [
      "A Linux VPS or dedicated server (2 GB RAM minimum, 4 GB recommended)",
      "Docker Engine 24+ and Docker Compose v2+ installed",
      "A domain name pointed to your server (optional but recommended for HTTPS)",
      "A Firebase project with Authentication and Firestore enabled",
    ],
  },
  {
    title: "Clone the Repository",
    code: "git clone https://github.com/Tabish5858/Leadflow-CRM.git\ncd Leadflow-CRM",
    content: [],
  },
  {
    title: "Configure Environment Variables",
    content: [
      "Copy the example environment file and fill in your values:",
    ],
    code: "cp .env.example .env\nnano .env",
    subContent: [
      {
        label: "NEXT_PUBLIC_FIREBASE_API_KEY",
        desc: "From Firebase Project Settings > General > Web API Key",
      },
      {
        label: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
        desc: "Your Firebase auth domain (e.g. your-project.firebaseapp.com)",
      },
      {
        label: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
        desc: "Your Firebase project ID",
      },
      {
        label: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
        desc: "Your Firebase storage bucket URL",
      },
      {
        label: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
        desc: "From Firebase Project Settings",
      },
      {
        label: "NEXT_PUBLIC_FIREBASE_APP_ID",
        desc: "From Firebase Project Settings",
      },
      {
        label: "NEXTAUTH_SECRET",
        desc: "Generate with: openssl rand -base64 32",
      },
      {
        label: "NEXTAUTH_URL",
        desc: "Your public URL (e.g. https://crm.yourdomain.com)",
      },
    ],
  },
  {
    title: "Firebase Setup",
    content: [
      "Go to the Firebase Console and create a new project (or use an existing one).",
      "Enable Email/Password sign-in under Authentication > Sign-in method.",
      "Create a Firestore database in your preferred region.",
      "Set up Firestore security rules to restrict access to authenticated users only.",
      "Copy the web app configuration values from Project Settings > General > Your apps > Web app.",
    ],
  },
  {
    title: "Build and Start with Docker Compose",
    content: [
      "Build the Docker image and start all services:",
    ],
    code: "docker compose build\ndocker compose up -d",
    contentAfter: [
      "This starts LeadFlow, a PostgreSQL database (if configured), and any supporting services.",
      "Your application will be available at http://localhost:3000 (or your configured domain).",
    ],
  },
  {
    title: "Configure Reverse Proxy (Optional)",
    content: [
      "For production, set up a reverse proxy with Caddy or Nginx to handle HTTPS:",
    ],
    code: `# Caddyfile example
crm.yourdomain.com {
    reverse_proxy localhost:3000
}`,
    contentAfter: [
      "Run Caddy with Docker Compose alongside LeadFlow for automatic TLS certificates.",
    ],
  },
  {
    title: "Verify Your Deployment",
    content: [
      "Open your domain in a browser. You should see the LeadFlow login page.",
      "Create your first workspace account and verify that all modules load correctly.",
      "Check the Docker logs to confirm everything is running smoothly:",
    ],
    code: "docker compose logs -f app",
  },
];

export default function DeployPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 right-[-10%] h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 left-[-10%] h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.03)_0%,transparent_50%)]" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-xs shadow-sm">
              LF
            </div>
            <span className="text-base font-bold tracking-tight">LeadFlow</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Primary">
            <Link className="hover:text-foreground transition-colors" href="/docs/architecture">
              Architecture
            </Link>
            <Link className="hover:text-foreground transition-colors" href="/blog">
              Blog
            </Link>
            <a
              href="https://github.com/Tabish5858/Leadflow-CRM"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="default" size="sm" className="gap-1.5">
              <Link href="/">
                <Zap className="h-3.5 w-3.5" />
                Try Demo
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto w-full max-w-4xl px-6 pb-8 pt-16 md:pt-24">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              &larr; Back to home
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/60 px-3.5 py-1 text-xs text-muted-foreground mb-4">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              Deployment guide
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Self-Host LeadFlow with Docker
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg max-w-2xl">
              Deploy LeadFlow CRM on your own infrastructure in under 10 minutes. This guide
              covers everything from VPS requirements to Docker Compose configuration and
              Firebase setup.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Docker Compose
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Self-hosted
              </div>
              <div className="flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-primary" />
                Your data, your server
              </div>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="mx-auto w-full max-w-3xl px-6 pb-16">
          <div className="space-y-10">
            {steps.map((step, i) => (
              <div key={step.title} className="rounded-xl border border-border/40 bg-background/40 p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-4">
                    <h2 className="text-xl font-bold tracking-tight">{step.title}</h2>

                    {step.content.length > 0 && (
                      <ul className="space-y-2">
                        {step.content.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}

                    {"subContent" in step && step.subContent && (
                      <div className="space-y-2">
                        {step.subContent.map((item) => (
                          <div key={item.label} className="rounded-lg border border-border/30 bg-background/60 p-3">
                            <code className="text-xs font-mono text-primary">{item.label}</code>
                            <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {"code" in step && step.code && (
                      <pre className="overflow-x-auto rounded-lg border border-border/30 bg-black/5 p-4 text-xs font-mono leading-relaxed dark:bg-white/5">
                        <code>{step.code}</code>
                      </pre>
                    )}

                    {"contentAfter" in step && step.contentAfter && (
                      <ul className="space-y-2">
                        {step.contentAfter.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional resources */}
          <div className="mt-10 rounded-xl border border-border/40 bg-background/40 p-6">
            <h2 className="text-lg font-bold tracking-tight">Additional Resources</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a
                  href="https://github.com/Tabish5858/Leadflow-CRM"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Star on GitHub
                </a>
              </li>
              <li className="flex items-start gap-2">
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a
                  href="https://github.com/Tabish5858/Leadflow-CRM/blob/main/docker-compose.yml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  View Docker Compose file
                </a>
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-20">
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 via-background to-background p-8 text-center sm:p-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Try LeadFlow Before You Deploy
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm">
              Click one button and explore a fully-loaded workspace with real demo data.
              No account, no credit card, no setup.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="gap-2 text-base h-12 px-6">
                <Link href="/">
                  <Zap className="h-5 w-5" />
                  Launch Live Demo
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2 text-base h-12 px-6">
                <a href="https://github.com/Tabish5858/Leadflow-CRM" target="_blank" rel="noopener noreferrer">
                  <Github className="h-5 w-5" />
                  View on GitHub
                </a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No account needed. Just click and explore.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 text-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-[10px]">
              LF
            </div>
            <span className="font-semibold">LeadFlow</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">Open-source CRM</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <Link href="/docs/architecture" className="hover:text-foreground transition-colors">
              Architecture
            </Link>
            <Link href="/blog" className="hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <a href="mailto:contact@tabishbinishfaq.dev" className="hover:text-foreground transition-colors">
              Contact
            </a>
            <span className="text-muted-foreground/60">MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

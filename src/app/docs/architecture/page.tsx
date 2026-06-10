import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart3, CheckCircle, ExternalLink, Github, Globe, Layers, Lock, Shield, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "LeadFlow Architecture: Next.js 16, Firebase & Docker | Tech Stack",
  description:
    "Explore the LeadFlow CRM tech stack — Next.js 16, React 19, Firebase, Docker, and UniverJS for spreadsheets. Modular design for self-hosting and customization.",
  openGraph: {
    title: "LeadFlow Architecture: Next.js 16, Firebase & Docker | Tech Stack",
    description:
      "Explore the LeadFlow CRM tech stack — Next.js 16, React 19, Firebase, Docker, and UniverJS for spreadsheets. Modular design for self-hosting and customization.",
    url: "https://crm.tabishbinishfaq.dev/docs/architecture",
    type: "article",
  },
  keywords: [
    "Next.js CRM architecture",
    "open source CRM tech stack",
    "CRM system design",
    "Next.js 16 CRM",
    "React 19 CRM",
    "Firebase CRM",
    "Docker CRM deployment",
    "LeadFlow architecture",
    "modular CRM architecture",
  ],
};

const layers = [
  {
    icon: Globe,
    title: "Presentation Layer",
    subtitle: "Next.js 16 + React 19 + Tailwind CSS",
    items: [
      "Server-side rendering (SSR) and static generation (SSG) via Next.js App Router",
      "React 19 with Server Components for optimal performance",
      "Tailwind CSS for utility-first responsive design",
      "Shadcn UI component library for consistent design system",
      "Lucide icons for lightweight, tree-shakeable iconography",
    ],
  },
  {
    icon: Lock,
    title: "Auth & Security Layer",
    subtitle: "Firebase Authentication + NextAuth",
    items: [
      "Email/password authentication with Firebase Auth",
      "Role-based access control (Owner, Admin, Member, Viewer, Client)",
      "Secure session management with NextAuth.js",
      "Audit trail logging for all data mutations",
      "Module-level access controls per workspace",
    ],
  },
  {
    icon: Layers,
    title: "Data Layer",
    subtitle: "Firebase Firestore + Client-side Cache",
    items: [
      "Firestore for real-time data synchronization across clients",
      "Optimistic updates for responsive UI interactions",
      "Firebase Security Rules for row-level access control",
      "Firebase Storage for file and document uploads",
      "Local state management with React hooks and context",
    ],
  },
  {
    icon: BarChart3,
    title: "Spreadsheet & Analytics",
    subtitle: "UniverJS + Custom Analytics Engine",
    items: [
      "UniverJS powers the lead spreadsheet module with Excel-like functionality",
      "Custom analytics engine for pipeline value, conversion rates, and cycle times",
      "Exportable reports for pipeline, invoices, and time tracking data",
      "Real-time collaboration on spreadsheet data",
    ],
  },
  {
    icon: Shield,
    title: "Infrastructure & Deployment",
    subtitle: "Docker + Reverse Proxy",
    items: [
      "Docker Compose for one-command self-hosted deployment",
      "Multi-stage Docker builds for optimized image size",
      "Caddy or Nginx reverse proxy with automatic TLS",
      "Environment-based configuration for dev, staging, and production",
      "Stateless architecture — scale horizontally by adding instances",
    ],
  },
];

export default function ArchitecturePage() {
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
            <Link className="hover:text-foreground transition-colors" href="/docs/deploy">
              Deployment
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
              <Layers className="h-3.5 w-3.5 text-primary" />
              System architecture
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              LeadFlow Architecture &amp; Tech Stack
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg max-w-2xl">
              LeadFlow is built with a modern, modular architecture designed for self-hosting,
              customization, and scale. Here is how the pieces fit together.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Next.js 16 + React 19
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Firebase Native
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Dockerized
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                MIT Licensed
              </div>
            </div>
          </div>
        </section>

        {/* Architecture Overview */}
        <section className="mx-auto w-full max-w-3xl px-6 pb-16">
          {/* Diagram / Summary */}
          <div className="mb-10 rounded-xl border border-border/40 bg-gradient-to-br from-primary/5 via-background to-background p-6 sm:p-8 text-center">
            <h2 className="text-lg font-bold tracking-tight">System Overview</h2>
            <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
              {["Next.js 16 SSR", "React 19", "Firebase Auth", "Firestore DB", "UniverJS Sheets", "Docker"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border/40 bg-background/60 px-3 py-1 font-mono text-muted-foreground"
                  >
                    {item}
                  </span>
                ),
              )}
            </div>
            <p className="mt-4 text-sm text-muted-foreground max-w-xl mx-auto">
              The frontend communicates directly with Firebase services through the Firebase Web SDK.
              No intermediate API server is required. Docker wraps the entire application for
              portable, reproducible deployments.
            </p>
          </div>

          {/* Layers */}
          <div className="space-y-6">
            {layers.map((layer) => (
              <div
                key={layer.title}
                className="rounded-xl border border-border/40 bg-background/40 p-6 sm:p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <layer.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold tracking-tight">{layer.title}</h2>
                    <p className="text-sm text-muted-foreground">{layer.subtitle}</p>
                    <ul className="mt-3 space-y-2">
                      {layer.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Architecture Principles */}
          <div className="mt-10 rounded-xl border border-border/40 bg-background/40 p-6 sm:p-8">
            <h2 className="text-lg font-bold tracking-tight">Design Principles</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Self-Hosted First",
                  desc: "Every feature works in a self-hosted environment. No external service dependencies beyond what you configure.",
                },
                {
                  title: "Modular by Default",
                  desc: "Each module (pipeline, projects, invoices, etc.) is independently accessible and can be disabled per workspace.",
                },
                {
                  title: "Real-Time Everywhere",
                  desc: "Firestore enables real-time sync across all clients — no polling, no stale data, no manual refresh.",
                },
                {
                  title: "No Vendor Lock-In",
                  desc: "MIT licensed. If Firebase doesn't suit your needs, the modular design makes it straightforward to swap components.",
                },
              ].map((p) => (
                <div key={p.title} className="rounded-lg border border-border/30 bg-background/60 p-4">
                  <h3 className="font-semibold text-sm">{p.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-20">
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 via-background to-background p-8 text-center sm:p-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              See LeadFlow in Action
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm">
              Explore a fully-loaded workspace with pipeline, invoices, projects, and more.
              No account required.
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
              No account. No credit card. Just click and explore.
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
            <Link href="/docs/deploy" className="hover:text-foreground transition-colors">
              Deployment
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

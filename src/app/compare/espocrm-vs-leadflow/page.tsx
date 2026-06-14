import { Button } from "@/components/ui/button";
import {
  BookOpen,
  CheckCircle,
  ExternalLink,
  Github,
  Star,
  X,
} from "lucide-react";
import { DemoButton } from "../demo-button";
import type { Metadata } from "next";
import Link from "next/link";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.tabishbinishfaq.dev";

export function generateMetadata(): Metadata {
  return {
    title: "EspoCRM Alternative — LeadFlow vs EspoCRM",
    description:
      "Comparing EspoCRM and LeadFlow: modern Next.js stack vs PHP, built-in client portal, time tracking & invoicing, and better UI/UX. LeadFlow is the modern open-source CRM alternative. Runs on free tiers — $0 to host.",
    keywords: [
      "espocrm alternative",
      "espocrm vs leadflow",
      "open source CRM",
      "espocrm review",
      "leadflow CRM",
      "modern CRM alternative",
      "next.js CRM",
      "free espocrm alternative",
      "no cost open source CRM",
    ],
    openGraph: {
      title: "EspoCRM vs LeadFlow — Modern Open-Source CRM Comparison",
      description:
        "Next.js 16 stack, client portal, time tracking & invoicing built in. Runs on free Firebase + Vercel tiers — $0 to host. See how LeadFlow compares to EspoCRM.",
      url: `${baseUrl}/compare/espocrm-vs-leadflow`,
      siteName: "LeadFlow",
      images: [
        {
          url: `${baseUrl}/og-image.svg`,
          width: 1200,
          height: 630,
          alt: "LeadFlow vs EspoCRM Comparison",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "EspoCRM vs LeadFlow — Modern Open-Source CRM Comparison",
      description:
        "Next.js 16 stack, client portal, time tracking & invoicing built in. Runs on free Firebase + Vercel tiers — $0 to host.",
    },
    alternates: {
      canonical: `${baseUrl}/compare/espocrm-vs-leadflow`,
    },
  };
}

const FEATURES = [
  { name: "Tech Stack", leadflow: "Next.js 16, React 19, Firebase", espocrm: "PHP, MySQL, Backbone.js" },
  { name: "Client Portal", leadflow: "Built-in", espocrm: "Via extension" },
  { name: "Time Tracking", leadflow: "Built-in", espocrm: "Via extension" },
  { name: "Invoicing", leadflow: "Built-in", espocrm: "Via extension" },
  { name: "Projects", leadflow: "Yes", espocrm: "Yes" },
  { name: "No-Code Customization", leadflow: "Code-based", espocrm: "Built-in (strong)" },
  { name: "Messaging", leadflow: "Yes", espocrm: "Yes" },
  { name: "Meetings / Scheduling", leadflow: "Yes", espocrm: "Yes" },
  { name: "Analytics", leadflow: "Yes", espocrm: "Basic" },
  { name: "UI / UX", leadflow: "Modern, polished", espocrm: "Functional, dated" },
  { name: "Self-hosted", leadflow: "Node.js / Vercel", espocrm: "PHP / MySQL" },
  { name: "License", leadflow: "MIT", espocrm: "AGPL-3.0" },
  { name: "Ideal For", leadflow: "SMBs, freelancers, teams", espocrm: "Enterprises, no-code users" },
];

export default function EspoVsLeadFlow() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 right-[-10%] h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 left-[-10%] h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
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
          <div className="flex items-center gap-2">
            <DemoButton label="Try Demo" />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-16 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/60 px-3.5 py-1 text-xs text-muted-foreground mb-6">
              <Star className="h-3.5 w-3.5 text-primary" />
              Open-source CRM comparison
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              LeadFlow vs EspoCRM
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg max-w-2xl mx-auto">
              EspoCRM has been a reliable open-source CRM for years with strong 
              no-code customization. LeadFlow brings a modern tech stack, built-in 
              client portal, time tracking, and invoicing — all in a polished, 
              modern interface.
            </p>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-16">
          <div className="overflow-hidden rounded-xl border border-border/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="px-4 py-3.5 text-left font-semibold text-foreground">Feature</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-primary">LeadFlow</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-muted-foreground">EspoCRM</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f, i) => (
                  <tr key={f.name} className={i < FEATURES.length - 1 ? "border-b border-border/30" : ""}>
                    <td className="px-4 py-3 font-medium text-foreground">{f.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        {f.leadflow}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {f.espocrm.startsWith("Via") || f.espocrm.startsWith("PHP") || f.espocrm.startsWith("Functional") || f.espocrm === "Basic" || f.espocrm === "AGPL-3.0" ? (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <X className="h-4 w-4 shrink-0 text-red-500/70" />
                          {f.espocrm}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4 shrink-0 text-green-600/60 dark:text-green-400/60" />
                          {f.espocrm}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Why Switch */}
        <section className="border-t border-border/40 bg-background/50">
          <div className="mx-auto w-full max-w-6xl px-6 py-16">
            <div className="mx-auto max-w-3xl text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Why switch from EspoCRM to LeadFlow
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                EspoCRM is powerful for no-code customization. LeadFlow is built for 
                teams that want a modern, all-in-one platform without cobbling together extensions.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Modern Tech Stack",
                  desc: "LeadFlow runs on Next.js 16 and React 19 — a modern, developer-friendly stack. EspoCRM uses PHP and Backbone.js, which feels dated and is harder to extend for modern developers.",
                },
                {
                  title: "Built-in Client Portal",
                  desc: "Give clients a dedicated dashboard for projects, invoices, and documents — no extensions needed. EspoCRM requires a paid extension for portal functionality.",
                },
                {
                  title: "Polished UI/UX",
                  desc: "LeadFlow features a clean, modern interface designed for fast workflows. EspoCRM's UI, while functional, shows its age with a cluttered layout and dated design patterns.",
                },
                {
                  title: "Time Tracking + Invoicing",
                  desc: "Track billable hours and create invoices inside LeadFlow. Both require extensions in EspoCRM, adding complexity and cost.",
                },
                {
                  title: "All-in-One Workspace",
                  desc: "Projects, invoices, time tracking, messaging, meetings, analytics, contracts, and client portal — 8 integrated modules in one workspace.",
                },
                {
                  title: "MIT License",
                  desc: "LeadFlow is MIT licensed — no restrictions on commercial use, modification, or redistribution. EspoCRM uses AGPL-3.0, which has stricter copyleft requirements.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-border/40 bg-background/40 p-5"
                >
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 via-background to-background p-8 text-center sm:p-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Try LeadFlow — No signup needed
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              Click one button and explore a fully-loaded workspace with projects, 
              invoices, time tracking, and client portal.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <DemoButton label="Launch Demo" />
              <Button asChild variant="outline" size="lg" className="gap-2 text-base h-12 px-6">
                <a href="https://github.com/Tabish5858/Leadflow-CRM" target="_blank" rel="noopener noreferrer">
                  <Github className="h-5 w-5" />
                  Star on GitHub
                </a>
              </Button>
              <Button asChild variant="ghost" size="lg" className="gap-2 text-base h-12 px-6">
                <Link href="/docs">
                  <BookOpen className="h-5 w-5" />
                  Setup Guide
                </Link>
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
            <Link href="/docs" className="hover:text-foreground transition-colors">
              Docs
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
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <span className="text-muted-foreground/60">MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

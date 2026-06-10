import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  ExternalLink,
  Github,
  Star,
  X,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DemoButton } from "../demo-button";

export const metadata: Metadata = {
  title: "Twenty CRM Alternative — LeadFlow vs Twenty",
  description:
    "Comparing Twenty CRM and LeadFlow: MIT vs AGPL-3.0 license, built-in client portal, time tracking & invoicing, 9 modules in one workspace. LeadFlow is the better open-source CRM for SMBs.",
  keywords: [
    "twenty CRM alternative",
    "twenty vs leadflow",
    "twenty open source CRM alternative",
    "twenty CRM review",
    "open source CRM comparison",
    "MIT license CRM",
    "leadflow vs twenty",
  ],
  openGraph: {
    title: "Twenty CRM vs LeadFlow — Which Open-Source CRM Wins?",
    description:
      "MIT-licensed, client portal, time tracking & invoicing built in. See how LeadFlow stacks up against Twenty CRM.",
    url: "https://crm.tabishbinishfaq.dev/compare/twenty-vs-leadflow",
    siteName: "LeadFlow",
    images: [
      {
        url: "https://crm.tabishbinishfaq.dev/og-image.png",
        width: 1200,
        height: 630,
        alt: "LeadFlow vs Twenty CRM Comparison",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Twenty CRM vs LeadFlow — Which Open-Source CRM Wins?",
    description:
      "MIT-licensed, client portal, time tracking & invoicing built in. See how LeadFlow stacks up against Twenty CRM.",
  },
  alternates: {
    canonical: "https://crm.tabishbinishfaq.dev/compare/twenty-vs-leadflow",
  },
};

const FEATURES = [
  { name: "License", leadflow: "MIT (business-friendly)", twenty: "AGPL-3.0 (restrictive)" },
  { name: "Client Portal", leadflow: "Built-in", twenty: "Not available" },
  { name: "Time Tracking", leadflow: "Built-in", twenty: "Requires plugin" },
  { name: "Invoicing", leadflow: "Built-in", twenty: "Requires plugin" },
  { name: "Pipeline Management", leadflow: "Yes", twenty: "Yes" },
  { name: "Projects", leadflow: "Yes", twenty: "Limited" },
  { name: "Messaging", leadflow: "Yes", twenty: "No" },
  { name: "Meetings / Scheduling", leadflow: "Yes", twenty: "No" },
  { name: "Analytics", leadflow: "Yes", twenty: "Basic" },
  { name: "Self-hosted", leadflow: "Node.js / Vercel", twenty: "Node.js / PostgreSQL" },
  { name: "GitHub Stars", leadflow: "Growing", twenty: "45K+" },
  { name: "Ideal For", leadflow: "SMBs, freelancers, teams", twenty: "Developers, startups" },
];

export default function TwentyVsLeadFlow() {
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
              LeadFlow vs Twenty CRM
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg max-w-2xl mx-auto">
              Twenty is a popular open-source CRM with 45K+ GitHub stars. But 
              LeadFlow gives you more out of the box — client portal, time tracking, 
              invoicing, and a business-friendly MIT license — without requiring plugins.
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
                  <th className="px-4 py-3.5 text-left font-semibold text-muted-foreground">Twenty CRM</th>
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
                      {f.twenty.startsWith("Not") || f.twenty.startsWith("Requires") || f.twenty === "AGPL-3.0 (restrictive)" || f.twenty === "No" || f.twenty === "Basic" || f.twenty === "Limited" ? (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <X className="h-4 w-4 shrink-0 text-red-500/70" />
                          {f.twenty}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4 shrink-0 text-green-600/60 dark:text-green-400/60" />
                          {f.twenty}
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
                Why switch from Twenty to LeadFlow
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Twenty is great for developers who want a lightweight CRM. LeadFlow is built 
                for teams that need an all-in-one business platform.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "MIT License",
                  desc: "LeadFlow is MIT licensed — you can modify, redistribute, and use it commercially without restrictions. Twenty uses AGPL-3.0, which imposes stricter copyleft requirements on derivative works.",
                },
                {
                  title: "Client Portal Built In",
                  desc: "Give clients a dedicated dashboard to view projects, invoices, and documents. Twenty doesn't offer a client portal — you'd need a third-party tool.",
                },
                {
                  title: "Time Tracking + Invoicing",
                  desc: "Track billable hours and generate invoices inside LeadFlow. Twenty requires separate plugins or integrations for both features.",
                },
                {
                  title: "9 Integrated Modules",
                  desc: "Pipeline, projects, invoices, time tracking, messaging, meetings, analytics, contracts, and client portal — all in one workspace.",
                },
                {
                  title: "Business-Friendly Stack",
                  desc: "Built on Next.js 16 and React 19 — easy to customize, extend, and deploy. Twenty uses a custom GraphQL stack that's harder to modify.",
                },
                {
                  title: "No Vendor Lock-In",
                  desc: "Self-host on any Node.js server or deploy via Vercel. Your data, your infrastructure. Twenty also supports self-hosting, but the AGPL license adds compliance overhead.",
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
              Click one button and explore a fully-loaded workspace with pipeline, 
              invoices, projects, time tracking, and client portal.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <DemoButton label="Launch Demo" />
              <Button asChild variant="outline" size="lg" className="gap-2 text-base h-12 px-6">
                <a href="https://github.com/Tabish5858/Leadflow-CRM" target="_blank" rel="noopener noreferrer">
                  <Github className="h-5 w-5" />
                  Star on GitHub
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

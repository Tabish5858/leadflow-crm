"use client";

import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  ExternalLink,
  Github,
  Star,
  X,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Salesforce Alternative — Free Open-Source CRM | LeadFlow vs Salesforce",
  description:
    "Comparing Salesforce and LeadFlow: FREE vs $25-300/seat/month, self-hosted vs cloud, no per-seat pricing, MIT license. LeadFlow is the best open-source alternative to Salesforce for SMBs.",
  keywords: [
    "salesforce alternative",
    "open source alternative to salesforce",
    "salesforce vs leadflow",
    "free salesforce alternative",
    "self-hosted CRM",
    "salesforce pricing comparison",
    "open source CRM for small business",
    "replace salesforce",
  ],
  openGraph: {
    title: "Salesforce vs LeadFlow — Free Open-Source CRM Alternative",
    description:
      "LeadFlow is 100% free, self-hosted, and MIT licensed. No per-seat pricing, no feature gates. Compare feature-by-feature with Salesforce.",
    url: "https://crm.tabishbinishfaq.dev/compare/salesforce-vs-leadflow",
    siteName: "LeadFlow",
    images: [
      {
        url: "https://crm.tabishbinishfaq.dev/og-image.png",
        width: 1200,
        height: 630,
        alt: "LeadFlow vs Salesforce Comparison",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Salesforce vs LeadFlow — Free Open-Source CRM Alternative",
    description:
      "LeadFlow is 100% free, self-hosted, and MIT licensed. No per-seat pricing, no feature gates. Compare feature-by-feature with Salesforce.",
  },
  alternates: {
    canonical: "https://crm.tabishbinishfaq.dev/compare/salesforce-vs-leadflow",
  },
};

const FEATURES = [
  { name: "Pricing", leadflow: "FREE (MIT License)", salesforce: "$25–$300/seat/month" },
  { name: "Self-Hosted", leadflow: "Yes (Docker Compose)", salesforce: "No (cloud only)" },
  { name: "Per-Seat Pricing", leadflow: "None", salesforce: "Yes" },
  { name: "Data Ownership", leadflow: "100% yours", salesforce: "On Salesforce servers" },
  { name: "Client Portal", leadflow: "Built-in", salesforce: "$75+/seat + Experience Cloud" },
  { name: "Pipeline Management", leadflow: "Yes", salesforce: "Yes" },
  { name: "Projects", leadflow: "Yes", salesforce: "Requires add-on" },
  { name: "Invoicing", leadflow: "Built-in", salesforce: "Requires CPQ ($75+/seat)" },
  { name: "Time Tracking", leadflow: "Built-in", salesforce: "Requires add-on" },
  { name: "Messaging", leadflow: "Built-in", salesforce: "Chatter (limited)" },
  { name: "Meetings / Scheduling", leadflow: "Yes", salesforce: "Requires add-on" },
  { name: "Analytics", leadflow: "Yes", salesforce: "Einstein Analytics ($75+/seat)" },
  { name: "Customization", leadflow: "Full (MIT license)", salesforce: "Platform-dependent" },
  { name: "Setup Time", leadflow: "<10 minutes (Docker)", salesforce: "Weeks to months" },
  { name: "Ideal For", leadflow: "SMBs, freelancers, teams", salesforce: "Large enterprises" },
];

export default function SalesforceVsLeadFlow() {
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
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.setItem("leadflow_demo_mode", "true");
                  window.location.href = "/dashboard";
                }
              }}
            >
              <Zap className="h-3.5 w-3.5" />
              Try Demo
            </Button>
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
              LeadFlow vs Salesforce
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg max-w-2xl mx-auto">
              Salesforce is the industry giant — and expensive. LeadFlow is the 
              free, open-source alternative that gives you pipeline, projects, 
              invoices, time tracking, and a client portal without the per-seat 
              pricing or vendor lock-in.
            </p>
          </div>
        </section>

        {/* Pricing Highlight */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-12">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-6 text-center">
              <p className="text-xs text-muted-foreground mb-1">LeadFlow</p>
              <p className="text-4xl font-bold text-green-500">$0</p>
              <p className="text-sm text-muted-foreground mt-1">Free forever · MIT license</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-background/40 p-6 text-center">
              <p className="text-xs text-muted-foreground mb-1">Salesforce</p>
              <p className="text-4xl font-bold text-foreground">$25–$300</p>
              <p className="text-sm text-muted-foreground mt-1">Per seat / month</p>
            </div>
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
                  <th className="px-4 py-3.5 text-left font-semibold text-muted-foreground">Salesforce</th>
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
                      {f.salesforce.startsWith("$") || f.salesforce.startsWith("Requires") || f.salesforce.startsWith("No") || f.salesforce.startsWith("On") || f.salesforce.startsWith("Chatter") || f.salesforce.startsWith("Weeks") || f.salesforce.startsWith("Platform") ? (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <X className="h-4 w-4 shrink-0 text-red-500/70" />
                          {f.salesforce}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4 shrink-0 text-green-600/60 dark:text-green-400/60" />
                          {f.salesforce}
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
                Why switch from Salesforce to LeadFlow
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Salesforce is built for enterprises with enterprise budgets. 
                LeadFlow gives you the core CRM features SMBs actually need — 
                at zero cost and with full data ownership.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "100% Free",
                  desc: "LeadFlow is completely free under the MIT license. Salesforce costs $25–$300 per seat per month — that's $3,000–$36,000/year for a 10-person team before add-ons.",
                },
                {
                  title: "Self-Hosted, Your Data",
                  desc: "LeadFlow runs on your infrastructure via Docker Compose. Your data never leaves your servers. Salesforce stores everything on their cloud — you're renting access to your own customer data.",
                },
                {
                  title: "No Per-Seat Pricing",
                  desc: "Invite unlimited users to LeadFlow at no additional cost. Salesforce charges per seat, so growing your team means growing your bill.",
                },
                {
                  title: "No Feature Gates",
                  desc: "Every LeadFlow feature is available to everyone. Salesforce hides core features behind paywalls — invoicing needs CPQ ($75+/seat), analytics needs Einstein ($75+/seat), a portal needs Experience Cloud.",
                },
                {
                  title: "Fast Setup",
                  desc: "Deploy LeadFlow in under 10 minutes with Docker Compose. Salesforce implementations typically take weeks to months and often require consultants.",
                },
                {
                  title: "All Essential Features Built In",
                  desc: "Pipeline, projects, invoices, time tracking, messaging, meetings, analytics, contracts, and client portal — all in one platform. No add-ons, no integrations to maintain.",
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
              <Button
                size="lg"
                className="gap-2 text-base h-12 px-6"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    localStorage.setItem("leadflow_demo_mode", "true");
                    window.location.href = "/dashboard";
                  }
                }}
              >
                <Zap className="h-5 w-5" />
                Launch Demo
              </Button>
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

import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  ExternalLink,
  Github,
  Star,
  X,
} from "lucide-react";
import { DemoButton } from "../demo-button";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "HubSpot Alternative — LeadFlow vs HubSpot",
  description:
    "Comparing HubSpot and LeadFlow: FREE vs $45-90/seat/month, self-hosted vs cloud, no feature gates, no data sharing concerns. LeadFlow is the best open-source alternative to HubSpot.",
  keywords: [
    "hubspot alternative",
    "open source hubspot alternative",
    "hubspot vs leadflow",
    "free hubspot alternative",
    "self-hosted CRM",
    "hubspot pricing comparison",
    "open source CRM for small business",
    "replace hubspot",
    "hubspot free vs open source",
  ],
  openGraph: {
    title: "HubSpot vs LeadFlow — Free Open-Source CRM Alternative",
    description:
      "LeadFlow is 100% free, self-hosted, and MIT licensed. No feature gates, no per-seat pricing, no data sharing. Compare feature-by-feature with HubSpot.",
    url: "https://crm.tabishbinishfaq.dev/compare/hubspot-vs-leadflow",
    siteName: "LeadFlow",
    images: [
      {
        url: "https://crm.tabishbinishfaq.dev/og-image.png",
        width: 1200,
        height: 630,
        alt: "LeadFlow vs HubSpot Comparison",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HubSpot vs LeadFlow — Free Open-Source CRM Alternative",
    description:
      "LeadFlow is 100% free, self-hosted, and MIT licensed. No feature gates, no per-seat pricing, no data sharing. Compare feature-by-feature with HubSpot.",
  },
  alternates: {
    canonical: "https://crm.tabishbinishfaq.dev/compare/hubspot-vs-leadflow",
  },
};

const FEATURES = [
  { name: "Pricing", leadflow: "FREE (MIT License)", hubspot: "$45–$90/seat/month (Starter–Enterprise)" },
  { name: "Self-Hosted", leadflow: "Yes (Node.js / Vercel)", hubspot: "No (cloud only)" },
  { name: "Per-Seat Pricing", leadflow: "None", hubspot: "Yes" },
  { name: "Data Ownership", leadflow: "100% yours", hubspot: "On HubSpot servers" },
  { name: "Feature Gates", leadflow: "None — all features included", hubspot: "Many features behind paywalls" },
  { name: "Client Portal", leadflow: "Built-in", hubspot: "Only in Enterprise ($5,000+/month)" },
  { name: "Pipeline Management", leadflow: "Yes", hubspot: "Free tier (limited)" },
  { name: "Projects", leadflow: "Yes", hubspot: "Requires paid plan" },
  { name: "Invoicing", leadflow: "Built-in", hubspot: "Requires Payments add-on" },
  { name: "Time Tracking", leadflow: "Built-in", hubspot: "Not available" },
  { name: "Messaging", leadflow: "Built-in", hubspot: "Conversations (Sales Hub)" },
  { name: "Meetings / Scheduling", leadflow: "Yes", hubspot: "Free tier (limited)" },
  { name: "Analytics / Reports", leadflow: "Yes", hubspot: "Requires Professional ($90/seat)" },
  { name: "Customization", leadflow: "Full (MIT license)", hubspot: "Platform-dependent" },
  { name: "Data Privacy", leadflow: "Your data, your servers", hubspot: "HubSpot accesses usage data" },
  { name: "Setup Time", leadflow: "<10 minutes", hubspot: "Quick (cloud) but migration is complex" },
  { name: "Ideal For", leadflow: "SMBs, freelancers, teams", hubspot: "Mid-market, marketing teams" },
];

export default function HubspotVsLeadFlow() {
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
              LeadFlow vs HubSpot
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg max-w-2xl mx-auto">
              HubSpot is a powerful marketing and sales platform — but the costs 
              add up fast with per-seat pricing and feature gates. LeadFlow is the 
              free, open-source alternative that gives you all the core CRM features 
              without the bill or data-sharing concerns.
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
              <p className="text-xs text-muted-foreground mb-1">HubSpot</p>
              <p className="text-4xl font-bold text-foreground">$45–$90</p>
              <p className="text-sm text-muted-foreground mt-1">Per seat / month (Starter–Enterprise)</p>
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
                  <th className="px-4 py-3.5 text-left font-semibold text-muted-foreground">HubSpot</th>
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
                      {f.hubspot.startsWith("$") || f.hubspot.startsWith("Requires") || f.hubspot.startsWith("No") || f.hubspot.startsWith("On") || f.hubspot.startsWith("Many") || f.hubspot.startsWith("Only") || f.hubspot.startsWith("Free") || f.hubspot.startsWith("Not") || f.hubspot.startsWith("Platform") || f.hubspot.startsWith("Quick") ? (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <X className="h-4 w-4 shrink-0 text-red-500/70" />
                          {f.hubspot}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4 shrink-0 text-green-600/60 dark:text-green-400/60" />
                          {f.hubspot}
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
                Why switch from HubSpot to LeadFlow
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                HubSpot&apos;s free tier is limited, and paid plans get expensive 
                fast. LeadFlow gives you everything — no paywalls, no per-seat fees, 
                no data sharing.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Completely Free",
                  desc: "LeadFlow is 100% free under the MIT license. HubSpot's free CRM is limited — to unlock pipelines, reporting, and automation, you need Sales Hub Starter at $45/seat or Professional at $90/seat.",
                },
                {
                  title: "No Feature Gates",
                  desc: "Every LeadFlow feature is available to every user. HubSpot hides core functionality behind paywalls — analytics need Professional ($90/seat), client portal needs Enterprise ($5,000+/month), invoicing needs Payments add-on.",
                },
                {
                  title: "Self-Hosted Data Privacy",
                  desc: "LeadFlow runs on your infrastructure. Your customer data never leaves your servers. HubSpot stores everything on their cloud and has access to your usage data for their own business purposes.",
                },
                {
                  title: "No Per-Seat Pricing",
                  desc: "Invite unlimited team members to LeadFlow at no extra cost. HubSpot charges per seat, so a 15-person team on Professional costs $1,350/month before any add-ons.",
                },
                {
                  title: "Built-in Client Portal",
                  desc: "LeadFlow includes a client portal out of the box. HubSpot only offers portal functionality in the Enterprise plan at $5,000+/month — completely out of reach for most SMBs.",
                },
                {
                  title: "All Features Included",
                  desc: "Pipeline, projects, invoices, time tracking, messaging, meetings, analytics, contracts, and client portal — all built into one platform with no upgrades, no add-ons, no hidden costs.",
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

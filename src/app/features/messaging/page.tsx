import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  Hash,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

const baseUrl = "https://crm.tabishbinishfaq.dev";

export function generateMetadata(): Metadata {
  return {
    title: "Team Messaging CRM & CRM Internal Messaging",
    description:
      "LeadFlow's open-source team messaging CRM with team inbox, read receipts, search, and per-conversation threads. Internal messaging built into your CRM. Self-host or try free.",
    keywords: [
      "team messaging CRM",
      "CRM internal messaging",
      "team inbox software",
      "business messaging platform",
      "CRM chat feature",
      "open source team chat",
      "internal communication tool",
      "conversation threads CRM",
    ],
    openGraph: {
      title: "Team Messaging CRM & CRM Internal Messaging",
      description:
        "Team inbox with read receipts, search, and per-conversation threads. Internal messaging built into your open-source CRM — try free.",
      url: `${baseUrl}/features/messaging`,
      images: [{ url: `${baseUrl}/og-image.png`, width: 1200, height: 630, alt: "LeadFlow Team Messaging Interface" }],
    },
  };
}

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Team Inbox",
    description: "All internal and lead conversations in one unified inbox. Never miss a message from your team or clients.",
  },
  {
    icon: Send,
    title: "Read Receipts",
    description: "See who has read each message. Know when your team has seen important updates without asking.",
  },
  {
    icon: Search,
    title: "Full-Text Search",
    description: "Search across every conversation, message, and attachment. Find what you need in seconds.",
  },
  {
    icon: Hash,
    title: "Per-Conversation Threads",
    description: "Organize discussions by lead, project, or topic. Keep context separate and conversations focused.",
  },
  {
    icon: Users,
    title: "Group & Direct Messages",
    description: "Send direct messages to individuals or create group conversations for your team or with clients.",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Permissions",
    description: "Control who can message whom. Keep client conversations visible only to assigned team members.",
  },
];

const COMPARISON = [
  { label: "CRM integration", leadflow: "Deep — leads, projects, invoices", others: "None or shallow" },
  { label: "Read receipts", leadflow: "Built-in", others: "Often missing" },
  { label: "Search across conversations", leadflow: "Full-text", others: "Limited or missing" },
  { label: "Per-conversation threads", leadflow: "Native", others: "Varies" },
  { label: "Self-host option", leadflow: "Yes — Vercel", others: "SaaS only" },
  { label: "Per-seat pricing", leadflow: "None — free", others: "$$$ per user/mo" },
];

export default function MessagingFeaturePage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 right-[-10%] h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 left-[-10%] h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-xs shadow-sm">
              LF
            </div>
            <span className="text-base font-bold tracking-tight">LeadFlow</span>
          </Link>
          <Button asChild variant="default" size="sm" className="gap-1.5">
            <Link href="/">
              <Zap className="h-3.5 w-3.5" />
              Try Demo
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto w-full max-w-6xl px-6 pb-12 pt-16 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/60 px-3.5 py-1 text-xs text-muted-foreground mb-6">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              CRM internal messaging
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Team Messaging CRM
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Conversations Where Work Happens
              </span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg max-w-2xl mx-auto">
              LeadFlow&apos;s team messaging CRM keeps internal communication and client conversations
              in one place. Team inbox with read receipts, full-text search, and per-conversation
              threads — built directly into your CRM so nothing falls through the cracks.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="gap-2 text-base h-12 px-6">
                <Link href="/">
                  <Zap className="h-5 w-5" />
                  Try Live Demo — No Signup
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-6 pb-12">
          <div className="grid grid-cols-3 gap-4 rounded-2xl border border-border/40 bg-background/50 p-6">
            {[
              { value: "Unified", label: "Team inbox" },
              { value: "Full-text", label: "Message search" },
              { value: "Zero", label: "Per-seat cost" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything a CRM Internal Messaging Platform Needs
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Stop switching between Slack and your CRM. Keep every conversation connected to the
              work it belongs to.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border/40 bg-background/40 p-5 transition-all hover:border-primary/30 hover:shadow-sm hover:shadow-primary/5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-semibold text-sm">{f.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border/40 bg-background/50">
          <div className="mx-auto w-full max-w-6xl px-6 py-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Team Messaging CRM — LeadFlow vs Alternatives
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Separate chat apps create context switching and data silos. LeadFlow embeds
                messaging directly into your CRM.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-background/60">
                    <th className="px-5 py-3 text-left font-semibold">Feature</th>
                    <th className="px-5 py-3 text-left font-semibold text-primary">LeadFlow</th>
                    <th className="px-5 py-3 text-left font-semibold text-muted-foreground">Others</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr key={row.label} className="border-b border-border/20">
                      <td className="px-5 py-3 text-muted-foreground">{row.label}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 text-primary">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {row.leadflow}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{row.others}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-16">
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 via-background to-background p-8 text-center sm:p-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Try Team Messaging CRM — Free
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              See how LeadFlow&apos;s CRM internal messaging works with real demo data. Explore
              conversations, threads, and search — no account required.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="gap-2 text-base h-12 px-6">
                <Link href="/">
                  <Zap className="h-5 w-5" />
                  Launch Demo
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2 text-base h-12 px-6">
                <Link href="/">
                  <ArrowRight className="h-5 w-5" />
                  Learn More
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No account. No credit card. Just click and explore.
            </p>
          </div>
        </section>
      </main>

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
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

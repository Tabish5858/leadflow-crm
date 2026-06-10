import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Globe,
  LayoutDashboard,
  Lock,
  Monitor,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

const baseUrl = "https://crm.tabishbinishfaq.dev";

export function generateMetadata(): Metadata {
  return {
    title: "Client Portal Software & Self-Hosted Client Portal | LeadFlow",
    description:
      "LeadFlow's self-hosted client portal software with client dashboard, project visibility, invoice access, document sharing, and role-based access. Open-source CRM — try free.",
    keywords: [
      "client portal software",
      "self-hosted client portal",
      "client dashboard CRM",
      "open source client portal",
      "client project access",
      "client invoice portal",
      "document sharing portal",
      "CRM client portal",
    ],
    openGraph: {
      title: "Client Portal Software & Self-Hosted Client Portal | LeadFlow",
      description:
        "Give clients a dedicated dashboard with project visibility, invoice access, document sharing, and role-based access. Self-hosted open-source CRM.",
      url: `${baseUrl}/features/client-portal`,
      images: [{ url: `${baseUrl}/og-image.png`, width: 1200, height: 630, alt: "LeadFlow Client Portal Dashboard" }],
    },
  };
}

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Client Dashboard",
    description: "Each client gets a personalized dashboard showing their projects, invoices, and recent activity at a glance.",
  },
  {
    icon: Monitor,
    title: "Project Visibility",
    description: "Clients see project progress, milestones, and task completion in real time — no more status email chains.",
  },
  {
    icon: FileText,
    title: "Invoice Access",
    description: "Clients view, download, and pay invoices from their portal. Status updates automatically as you work.",
  },
  {
    icon: Globe,
    title: "Document Sharing",
    description: "Upload contracts, deliverables, and files. Clients access them instantly through a secure, organized library.",
  },
  {
    icon: Lock,
    title: "Role-Based Access",
    description: "Granular permissions control exactly what each client can see — projects, invoices, documents, or time entries.",
  },
  {
    icon: Users,
    title: "Multi-Client Support",
    description: "Manage dozens of client portals from one workspace. Each client sees only their own data.",
  },
];

const COMPARISON = [
  { label: "Client dashboard", leadflow: "Personalized per client", others: "Generic or missing" },
  { label: "Role-based access", leadflow: "Granular permissions", others: "All-or-nothing" },
  { label: "Document sharing", leadflow: "Built-in file library", others: "Separate tool" },
  { label: "Invoice & project visibility", leadflow: "Automatic", others: "Manual sharing" },
  { label: "Self-host option", leadflow: "Yes — Docker", others: "SaaS only" },
  { label: "Per-seat pricing", leadflow: "None — free", others: "$$$ per client" },
];

export default function ClientPortalFeaturePage() {
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
              <Globe className="h-3.5 w-3.5 text-primary" />
              Self-hosted client portal
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Client Portal Software
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Give Every Client a Window Into Their Work
              </span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg max-w-2xl mx-auto">
              LeadFlow&apos;s self-hosted client portal software gives each client a secure dashboard
              with project progress, invoices, documents, and time entries. Role-based access means
              they see exactly what they need — nothing more, nothing less.
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
              { value: "Per-client", label: "Personalized dashboards" },
              { value: "Granular", label: "Role-based access" },
              { value: "Zero", label: "Per-client cost" },
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
              Everything a Client Portal Should Have
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Stop emailing PDFs and status updates. Give clients a portal that&apos;s always up to date.
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
                Client Portal Software — LeadFlow vs Alternatives
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                Most client portal tools charge per client or lack CRM integration. LeadFlow gives
                you both for free.
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
              Try Client Portal Software — Free
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              See how LeadFlow&apos;s self-hosted client portal looks from the client side. Explore
              projects, invoices, and documents — no signup required.
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

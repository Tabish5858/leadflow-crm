import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Bug, Cloud, Database, Globe, Key, Mail } from "lucide-react";
import { SetupChecklist } from "@/components/docs/setup-checklist";

export const metadata: Metadata = {
  title: "Documentation · Self-Host LeadFlow CRM",
  description:
    "Complete setup guide for LeadFlow CRM: fork, Firebase, Cloudinary, Resend, Google Calendar, environment variables, and Vercel deployment.",
  openGraph: {
    title: "Documentation · Self-Host LeadFlow CRM",
    description:
      "Complete setup guide for LeadFlow CRM from fork to production deployment.",
    url: "https://crm.tabishbinishfaq.dev/docs",
    type: "website",
  },
};

const cards = [
  {
    icon: BookOpen,
    title: "Getting Started",
    desc: "Prerequisites, fork the repo, and install dependencies.",
    href: "/docs/getting-started",
  },
  {
    icon: Database,
    title: "Firebase Setup",
    desc: "Create a Firebase project, enable Auth, Firestore, and Storage.",
    href: "/docs/firebase-setup",
  },
  {
    icon: Cloud,
    title: "Cloudinary Setup",
    desc: "Configure Cloudinary for document and file storage.",
    href: "/docs/cloudinary-setup",
  },
  {
    icon: Mail,
    title: "Resend Setup",
    desc: "Set up transactional email with domain verification.",
    href: "/docs/resend-setup",
  },
  {
    icon: Globe,
    title: "Google Calendar",
    desc: "Enable Calendar API, OAuth consent, and credentials.",
    href: "/docs/google-calendar-setup",
  },
  {
    icon: Key,
    title: "Environment Variables",
    desc: "Complete reference for all configuration values.",
    href: "/docs/env-variables",
  },
  {
    icon: Bug,
    title: "Sentry",
    desc: "Set up error tracking and performance monitoring.",
    href: "/docs/sentry-setup",
  },
];

export default function DocsOverview() {
  return (
    <div>
      <h1>LeadFlow Documentation</h1>
      <p className="lead">
        Complete guide to setting up and deploying your own instance of LeadFlow CRM.
        Follow each section in order · from forking the repository to deploying in production.
      </p>

      <hr />

      <h2>Setup Checklist</h2>
      <p>
        Setting up LeadFlow requires configuring several services. Most have free tiers
        that cover solo freelancers and small teams. Estimated total setup time: <strong>20–30 minutes</strong>.
      </p>

      <SetupChecklist />

      <div className="not-prose mt-10 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-xl border border-neutral-800 bg-white/[3%] p-5 transition-all hover:border-primary/40 hover:bg-white/[6%]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <card.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
              {card.title}
              <ArrowRight className="ml-1 inline h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

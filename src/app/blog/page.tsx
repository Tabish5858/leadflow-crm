"use client";

import { Button } from "@/components/ui/button";
import { Calendar, ExternalLink, Github, Zap } from "lucide-react";
import Link from "next/link";

const featuredPosts = [
  {
    title: "How to Self-Host LeadFlow CRM on Your Own VPS",
    description:
      "A complete walkthrough of deploying LeadFlow with Docker Compose, from VPS setup to production configuration.",
    date: "Coming soon",
    tags: ["Self-Hosting", "Docker"],
    status: "Coming soon",
  },
  {
    title: "LeadFlow vs Twenty vs SuiteCRM: Open-Source CRM Comparison",
    description:
      "An honest comparison of the top open-source CRMs — features, licensing, tech stack, and which one fits your team.",
    date: "Coming soon",
    tags: ["Comparisons", "Open Source"],
    status: "Coming soon",
  },
  {
    title: "Building a CRM Pipeline That Actually Converts",
    description:
      "Best practices for designing sales stages, automating lead workflows, and tracking conversion metrics in LeadFlow.",
    date: "Coming soon",
    tags: ["Pipeline", "Best Practices"],
    status: "Coming soon",
  },
];

export default function BlogPage() {
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
            <Link className="hover:text-foreground transition-colors" href="/docs/architecture">
              Architecture
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
        <section className="mx-auto w-full max-w-6xl px-6 pb-8 pt-16 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              &larr; Back to home
            </Link>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              LeadFlow Blog
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg max-w-2xl mx-auto">
              Guides, comparisons, and best practices for open-source CRM, self-hosting,
              pipeline management, and team productivity.
            </p>
          </div>
        </section>

        {/* Featured Posts */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Featured Articles</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredPosts.map((post) => (
              <div
                key={post.title}
                className="group relative rounded-xl border border-border/40 bg-background/40 p-6 transition-all hover:border-primary/30 hover:shadow-sm hover:shadow-primary/5"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <Calendar className="h-3.5 w-3.5" />
                  {post.date}
                  <span className="ml-auto rounded-full border border-border/30 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {post.status}
                  </span>
                </div>
                <h2 className="font-semibold text-sm leading-snug">{post.title}</h2>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {post.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Newsletter / Subscribe */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <div className="rounded-xl border border-border/40 bg-background/40 p-8 text-center sm:p-10">
            <h2 className="text-2xl font-bold tracking-tight">Stay Updated</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              New guides, comparisons, and product updates delivered to your inbox.
            </p>
            <form
              className="mt-5 mx-auto flex max-w-md gap-3"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="you@example.com"
                className="flex-1 rounded-lg border border-border/40 bg-background/60 px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button type="submit" size="sm" className="gap-1.5 shrink-0">
                <ExternalLink className="h-3.5 w-3.5" />
                Subscribe
              </Button>
            </form>
            <p className="mt-3 text-xs text-muted-foreground">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-20">
          <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 via-background to-background p-8 text-center sm:p-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Try LeadFlow Right Now
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-sm">
              No signup, no credit card. Just click and explore a fully-loaded CRM workspace.
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
            <Link href="/docs/deploy" className="hover:text-foreground transition-colors">
              Deployment
            </Link>
            <Link href="/docs/architecture" className="hover:text-foreground transition-colors">
              Architecture
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

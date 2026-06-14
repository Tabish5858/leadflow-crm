"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { CodeBlockCopy } from "@/components/docs/code-block-copy";

interface NavItem {
  label: string;
  href: string;
}

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Getting Started",
    items: [
      { label: "Overview", href: "/docs" },
      { label: "Prerequisites & Setup", href: "/docs/getting-started" },
    ],
  },
  {
    label: "Services Setup",
    items: [
      { label: "Firebase", href: "/docs/firebase-setup" },
      { label: "Cloudinary", href: "/docs/cloudinary-setup" },
      { label: "Resend", href: "/docs/resend-setup" },
      { label: "Google Calendar", href: "/docs/google-calendar-setup" },
      { label: "Sentry", href: "/docs/sentry-setup" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Environment Variables", href: "/docs/env-variables" },
      { label: "Deploy to Vercel", href: "/docs/deploy" },
    ],
  },
  {
    label: "Reference",
    items: [
      { label: "Architecture", href: "/docs/architecture" },
    ],
  },
];

function Sidebar({ pathname, onNav }: { pathname: string; onNav?: () => void }) {
  return (
    <nav className="space-y-6" aria-label="Documentation">
      {navSections.map((section) => (
        <div key={section.label}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {section.label}
          </h4>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNav}
                    className={cn(
                      "block rounded-md px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary/15 font-medium text-primary"
                        : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function findAdjacent(pathname: string): { prev: NavItem | null; next: NavItem | null } {
  const flat = navSections.flatMap((s) => s.items);
  const idx = flat.findIndex((i) => i.href === pathname);
  return {
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx < flat.length - 1 ? flat[idx + 1] : null,
  };
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { prev, next } = findAdjacent(pathname);

  return (
    <div className="docs-dark min-h-screen bg-black text-white">
      {/* Subtle background glow */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute -top-32 right-[-10%] h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-32 left-[-10%] h-96 w-96 rounded-full bg-primary/6 blur-3xl" />
      </div>

      {/* Mobile nav toggle */}
      <div className="sticky top-0 z-30 border-b border-neutral-800 bg-black/80 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/docs" className="flex items-center gap-2 text-sm font-semibold text-white">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-white font-bold text-[10px]">
              LF
            </div>
            Documentation
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
            className="text-neutral-400 hover:text-white"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl px-4 py-8 lg:px-8">
        {/* Sidebar - desktop */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">
            <Link
              href="/docs"
              className="mb-6 flex items-center gap-2 text-sm font-semibold text-white"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-white font-bold text-[10px]">
                LF
              </div>
              Documentation
            </Link>
            <Sidebar pathname={pathname} />
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-72 translate-x-0 border-r border-neutral-800 bg-black p-6 transition-transform lg:hidden",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/docs"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 text-sm font-semibold text-white"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-white font-bold text-[10px]">
                LF
              </div>
              Documentation
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
              className="text-neutral-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Sidebar pathname={pathname} onNav={() => setSidebarOpen(false)} />
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1 lg:pl-12">
          <div className="prose prose-invert max-w-none">
            <CodeBlockCopy />
            {children}
          </div>

          {/* Prev/Next navigation */}
          <div className="mt-16 flex items-center justify-between border-t border-neutral-800 pt-8">
            <div>
              {prev && (
                <Link
                  href={prev.href}
                  className="group flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                  {prev.label}
                </Link>
              )}
            </div>
            <div className="text-right">
              {next && (
                <Link
                  href={next.href}
                  className="group flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  {next.label}
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

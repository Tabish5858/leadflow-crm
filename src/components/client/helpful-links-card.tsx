"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientPortalSettings } from "@/types";
import { ExternalLink, Link2 } from "lucide-react";

interface HelpfulLinksCardProps {
  settings: ClientPortalSettings;
}

export function HelpfulLinksCard({ settings }: HelpfulLinksCardProps) {
  const links = settings.helpfulLinks;
  if (!links || links.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4 text-primary" />
          Helpful Links
        </CardTitle>
        <CardDescription>Resources curated by your agency team</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {links
            .sort((a, b) => a.order - b.order)
            .map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30 group"
              >
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium group-hover:text-primary transition-colors">
                  {link.title}
                </span>
              </a>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

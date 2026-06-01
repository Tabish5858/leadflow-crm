"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dismissWelcomeCard } from "@/lib/firebase/client-portal";
import type { ClientPortalSettings } from "@/types";
import { X, Sparkles } from "lucide-react";

interface WelcomeCardProps {
  settings: ClientPortalSettings;
  workspaceId: string;
  userId: string;
  clientName: string;
  onDismiss: () => void;
}

export function WelcomeCard({
  settings,
  workspaceId,
  userId,
  clientName,
  onDismiss,
}: WelcomeCardProps) {
  const card = settings.welcomeCard;
  if (!card.enabled) return null;

  const title = card.title.replace(/{{clientName}}/g, clientName);
  const description = card.description.replace(/{{clientName}}/g, clientName);

  const handleDismiss = async () => {
    try {
      await dismissWelcomeCard(workspaceId, userId);
      onDismiss();
    } catch {
      // Silently fail — not critical
      onDismiss();
    }
  };

  return (
    <Card className="relative overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
        aria-label="Dismiss welcome card"
      >
        <X className="h-4 w-4" />
      </Button>

      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            </div>

            {card.bulletPoints.length > 0 && (
              <ul className="space-y-1.5">
                {card.bulletPoints.map((point, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                    {point}
                  </li>
                ))}
              </ul>
            )}

            {card.mediaUrl && card.mediaType === "image" && (
              /* eslint-disable-next-line @next/next/no-img-element -- dynamic user-uploaded media, unknown dimensions */
              <img
                src={card.mediaUrl}
                alt=""
                className="mt-2 max-h-48 rounded-lg object-cover"
                loading="lazy"
              />
            )}

            {card.mediaUrl && card.mediaType === "video" && (
              <video
                src={card.mediaUrl}
                className="mt-2 max-h-48 rounded-lg"
                controls
                preload="metadata"
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

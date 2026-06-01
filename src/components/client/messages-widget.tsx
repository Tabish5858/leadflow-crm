"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/firebase/client";
import { collection, getDocs, limit, orderBy, query, Timestamp, where } from "firebase/firestore";
import { MessageSquare, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ClientConversation {
  id: string;
  participantIds: string[];
  participantNames: string[];
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

interface MessagesWidgetProps {
  workspaceId: string;
  userId: string;
}

export function MessagesWidget({ workspaceId, userId }: MessagesWidgetProps) {
  const [conversations, setConversations] = useState<ClientConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId || !userId) return;

    (async () => {
      try {
        const convRef = collection(db, "conversations");
        const q = query(
          convRef,
          where("workspaceId", "==", workspaceId),
          orderBy("lastMessageAt", "desc"),
          limit(10)
        );
        const snap = await getDocs(q);

        const filtered = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              participantIds: data.participantIds || [],
              participantNames: data.participantNames || [],
              lastMessage: data.lastMessage || "",
              lastMessageAt: (data.lastMessageAt as Timestamp)?.toDate() ?? new Date(),
              unreadCount: data.unreadCount || 0,
            };
          })
          .filter((c) => c.participantIds.includes(userId))
          .slice(0, 3);

        setConversations(filtered);
      } catch {
        setConversations([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [workspaceId, userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-36" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            Messages
          </CardTitle>
          <CardDescription>Your recent conversations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground/60">
              Messages from your team will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            Messages
          </CardTitle>
          <Link
            href="/client/messages"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <CardDescription>
          {totalUnread > 0
            ? `${totalUnread} unread message${totalUnread !== 1 ? "s" : ""}`
            : "No unread messages"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {conversations.map((conv) => {
            const otherNames = conv.participantNames.filter(
              (_, i) => conv.participantIds[i] !== userId
            );
            const displayName = otherNames.join(", ") || "Team";
            const initial = displayName.charAt(0).toUpperCase();

            return (
              <Link
                key={conv.id}
                href={`/client/messages?conversation=${conv.id}`}
                className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-muted/30"
              >
                <Avatar className="h-9 w-9 border">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {conv.lastMessageAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {conv.lastMessage || "No messages yet"}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                    {conv.unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

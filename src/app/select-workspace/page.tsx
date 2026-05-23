"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getWorkspace } from "@/lib/firebase/workspaces";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Building2, Shield, Users, ArrowRight, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";

interface WorkspaceInfo {
  id: string;
  name: string;
  role: string;
  memberCount: number;
}

export default function SelectWorkspacePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          router.replace("/login");
          return;
        }

        const userData = userSnap.data();
        const workspaceIds: string[] = userData.workspaceIds || [];
        const workspaceRoles: Record<string, string> = userData.workspaceRoles || {};

        // If only 1 workspace, just go there
        if (workspaceIds.length <= 1) {
          router.replace("/dashboard");
          return;
        }

        // Fetch workspace details
        const workspaceInfos: WorkspaceInfo[] = [];
        for (const wsId of workspaceIds) {
          try {
            const ws = await getWorkspace(wsId);
            workspaceInfos.push({
              id: wsId,
              name: ws?.name || "Unknown Workspace",
              role: workspaceRoles[wsId] || userData.role || "member",
              memberCount: ws?.memberIds?.length || 0,
            });
          } catch {
            workspaceInfos.push({
              id: wsId,
              name: "Unknown Workspace",
              role: workspaceRoles[wsId] || userData.role || "member",
              memberCount: 0,
            });
          }
        }

        setWorkspaces(workspaceInfos);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  const handleSelect = async (workspaceId: string) => {
    if (!auth.currentUser) return;
    setSelecting(workspaceId);

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        activeWorkspaceId: workspaceId,
        updatedAt: Timestamp.now(),
      });
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const roleBadgeColors: Record<string, string> = {
    owner: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    member: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    viewer: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold shadow-sm mx-auto">
            LF
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Select Workspace</h1>
          <p className="text-sm text-muted-foreground">
            You have access to multiple workspaces. Choose one to continue.
          </p>
        </div>

        {/* Workspace List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No workspaces found</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {workspaces.map((ws) => (
              <Card
                key={ws.id}
                className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm"
                onClick={() => handleSelect(ws.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-lg">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{ws.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleBadgeColors[ws.role] || roleBadgeColors.member}`}
                        >
                          <Shield className="h-3 w-3" />
                          {ws.role}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {ws.memberCount} member{ws.memberCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      disabled={selecting === ws.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(ws.id);
                      }}
                    >
                      {selecting === ws.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                      <span className="sr-only">Select</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

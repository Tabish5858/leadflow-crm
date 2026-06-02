"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { auth, db } from "@/lib/firebase/client";
import { toast } from "@/lib/toast";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface InviteInfo {
  valid: boolean;
  workspaceName: string;
  inviterName: string;
  email: string;
  message: string | null;
  expiresAt: string;
}

type PageState = "loading" | "error" | "invite_info" | "signup" | "accepting" | "accepted";

function AcceptClientInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [signupData, setSignupData] = useState({ name: "", password: "" });
  const [signingUp, setSigningUp] = useState(false);

  // Check auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setIsLoggedIn(!!firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch invite details
  useEffect(() => {
    if (!token) return;

    async function fetchInvite() {
      const inviteToken: string = token!;
      try {
        const res = await fetch(`/api/workspaces/clients/check-invite?token=${encodeURIComponent(inviteToken)}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to verify invitation");
          setPageState("error");
          return;
        }

        setInvite(data);
        setPageState("invite_info");
      } catch {
        setError("Unable to verify invitation. Please try again.");
        setPageState("error");
      }
    }

    fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setPageState("accepting");

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setError("Please sign in to accept the invitation.");
        setPageState("error");
        return;
      }

      const res = await fetch("/api/workspaces/clients/accept-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to accept invitation");
        setPageState("error");
        return;
      }

      setPageState("accepted");

      // Redirect to client dashboard after a short delay
      setTimeout(() => {
        router.push("/client/dashboard");
      }, 1500);
    } catch {
      setError("Something went wrong. Please try again.");
      setPageState("error");
    }
  };

  const handleSignupAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !invite) return;

    if (!signupData.name || !signupData.password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (signupData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setSigningUp(true);

    try {
      // Create Firebase auth account
      const cred = await createUserWithEmailAndPassword(auth, invite.email, signupData.password);
      await updateProfile(cred.user, { displayName: signupData.name });

      // Create minimal user document (no workspace - will be added via accept)
      await setDoc(doc(db, "users", cred.user.uid), {
        id: cred.user.uid,
        email: invite.email,
        displayName: signupData.name,
        photoURL: null,
        role: "client",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: "en",
        currency: "USD",
        notificationPrefs: {
          email: true,
          inApp: true,
          followUpReminders: true,
          digestFrequency: "daily",
        },
        workspaceIds: [],
        activeWorkspaceId: null,
        workspaceRoles: {},
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
      });

      // Now accept the invite
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/workspaces/clients/accept-invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to accept invitation");
        setPageState("error");
        return;
      }

      setPageState("accepted");

      setTimeout(() => {
        router.push("/client/dashboard");
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed";
      toast.error(message);
      setSigningUp(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="mx-auto h-12 w-12 rounded-full" />
            <Skeleton className="mx-auto mt-4 h-6 w-48" />
            <Skeleton className="mx-auto mt-2 h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────
  if (pageState === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="mt-4">Invitation Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex gap-3 justify-center">
            <Button asChild variant="outline">
              <a href="/login">Go to Login</a>
            </Button>
            {token && (
              <Button asChild variant="outline">
                <a href={`/client/auth/accept?token=${encodeURIComponent(token)}`}>Try Again</a>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ── Accepted state ─────────────────────────────────────────────
  if (pageState === "accepted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="mt-4">Welcome!</CardTitle>
            <CardDescription>
              You now have access to the {invite?.workspaceName} client portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            <p className="mt-2">Redirecting to your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Accepting / Signing up state ───────────────────────────────
  if (pageState === "accepting" || signingUp) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <CardTitle className="mt-4">
              {signingUp ? "Creating Account" : "Accepting Invitation"}
            </CardTitle>
            <CardDescription>Just a moment...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ── Invite info state (logged in) ──────────────────────────────
  if (isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <ExternalLink className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="mt-4">
              Join {invite?.workspaceName}
            </CardTitle>
            <CardDescription>
              You&apos;ve been invited by {invite?.inviterName}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {invite?.message && (
              <div className="rounded-lg bg-muted p-4 text-sm italic text-muted-foreground">
                &ldquo;{invite.message}&rdquo;
              </div>
            )}

            <div className="rounded-lg border p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Workspace</span>
                <span className="font-medium">{invite?.workspaceName}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-muted-foreground">Invited by</span>
                <span className="font-medium">{invite?.inviterName}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-muted-foreground">Access level</span>
                <span className="font-medium capitalize">Client Portal</span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button className="w-full" size="lg" onClick={handleAccept}>
              Accept Invitation
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ── Invite info state (not logged in - show signup form) ──────
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ExternalLink className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="mt-4">
            Join {invite?.workspaceName}
          </CardTitle>
          <CardDescription>
            Create an account to access the client portal
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {invite?.message && (
            <div className="rounded-lg bg-muted p-4 text-sm italic text-muted-foreground">
              &ldquo;{invite.message}&rdquo;
            </div>
          )}

          <div className="rounded-lg border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Workspace</span>
              <span className="font-medium">{invite?.workspaceName}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-muted-foreground">Invited by</span>
              <span className="font-medium">{invite?.inviterName}</span>
            </div>
          </div>

          <form onSubmit={handleSignupAndAccept} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invite?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Invitation was sent to this email
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={signupData.name}
                onChange={(e) => setSignupData((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={signupData.password}
                onChange={(e) => setSignupData((p) => ({ ...p, password: e.target.value }))}
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" size="lg">
              Create Account & Accept
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <a
              href={`/login`}
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function AcceptClientInvitePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <Skeleton className="mx-auto h-6 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
      </div>
    }>
      <AcceptClientInviteContent />
    </Suspense>
  );
}

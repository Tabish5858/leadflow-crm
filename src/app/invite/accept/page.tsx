"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { acceptInvite, getWorkspace } from "@/lib/firebase/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Mail, Lock, User, Building2, Shield } from "lucide-react";
import { toast } from "@/lib/toast";

interface InviteDetails {
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: string;
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteId = searchParams.get("inviteId");

  const [phase, setPhase] = useState<"loading" | "signup" | "submitting" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [invite, setInvite] = useState<InviteDetails | null>(null);

  // Signup form
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ─── Fetch invite details ───────────────────────────────────────────────

  useEffect(() => {
    if (!inviteId) {
      setPhase("error");
      setErrorMessage("Invalid invitation link. No invite ID provided.");
      return;
    }

    loadInviteDetails(inviteId)
      .then((data) => {
        if (!data) {
          setPhase("error");
          setErrorMessage("Invitation not found. It may have been cancelled.");
          return;
        }
        if (data.status === "expired") {
          setPhase("error");
          setErrorMessage("This invitation has expired. Please ask the workspace owner to send a new one.");
          return;
        }
        if (data.status === "accepted") {
          setPhase("error");
          setErrorMessage("This invitation has already been accepted.");
          return;
        }
        setInvite(data);
        setPhase("signup");
      })
      .catch((err) => {
        setPhase("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load invitation.");
      });
  }, [inviteId]);

  // ─── Handle signup ─────────────────────────────────────────────────────

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invite) return;

    // Validation
    if (!displayName.trim() || displayName.trim().length < 2) {
      toast.error("Display name must be at least 2 characters");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setPhase("submitting");

    try {
      // 1. Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, invite.email, password);
      await updateProfile(cred.user, { displayName: displayName.trim() });

      // 2. Create user document in Firestore (no own workspace — join invited one)
      await setDoc(doc(db, "users", cred.user.uid), {
        id: cred.user.uid,
        email: invite.email,
        displayName: displayName.trim(),
        photoURL: null,
        role: invite.role as "admin" | "member" | "viewer",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: "en",
        currency: "USD",
        notificationPrefs: {
          email: true,
          inApp: true,
          followUpReminders: true,
          digestFrequency: "daily",
        },
        workspaceIds: [invite.workspaceId],
        activeWorkspaceId: invite.workspaceId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
      });

      // 3. Accept the invite (adds user to workspace memberIds)
      await acceptInvite(inviteId!, cred.user.uid);

      setPhase("success");

      // Redirect after brief delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        setPhase("error");
        setErrorMessage(
          `An account with ${invite.email} already exists. ` +
          `Please sign in first, then visit this invitation link again.`
        );
      } else {
        setPhase("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong. Please try again."
        );
      }
    }
  };

  // ─── Loading state ─────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────

  if (phase === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4">Invitation Error</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/login">Go to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Success state ─────────────────────────────────────────────────────

  if (phase === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <CardTitle className="mt-4">Welcome to {invite?.workspaceName}!</CardTitle>
            <CardDescription>
              Your account has been created. Redirecting to your workspace...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ─── Signup form ───────────────────────────────────────────────────────

  const roleLabels: Record<string, string> = {
    admin: "Admin — can manage members and settings",
    member: "Member — can create and edit leads",
    viewer: "Viewer — read-only access",
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 p-12">
        <div className="mx-auto max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold shadow-sm">
              LF
            </div>
            <span className="text-xl font-bold tracking-tight">LeadFlow</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            You&apos;ve been invited to join
          </h1>
          <p className="text-2xl font-semibold text-primary">
            {invite?.workspaceName}
          </p>
          <p className="text-lg text-muted-foreground">
            LeadFlow CRM helps teams manage leads, track pipelines, and
            close deals faster — all in one place.
          </p>
          <div className="space-y-3 pt-4">
            {[
              "Unlimited leads & pipelines",
              "Built-in time tracking",
              "Real-time analytics",
              "100% open source",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15">
                  <div className="h-2 w-2 rounded-full bg-success" />
                </div>
                <span className="text-sm text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Signup Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile branding */}
          <div className="lg:hidden text-center space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold shadow-sm mx-auto">
              LF
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Join {invite?.workspaceName}
            </h1>
          </div>

          {/* Invitation context */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>
                You&apos;ve been invited to join{" "}
                <strong className="text-foreground">{invite?.workspaceName}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>
                Your role:{" "}
                <strong className="text-foreground capitalize">{invite?.role}</strong>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {invite && roleLabels[invite.role]
                ? roleLabels[invite.role]
                : "Create your account to get started."}
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Email — locked */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={invite?.email || ""}
                  disabled
                  className="pl-10 bg-muted/50 text-muted-foreground cursor-not-allowed"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                This email was set by the workspace owner.
              </p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Your full name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10"
                  required
                  minLength={2}
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={phase === "submitting"}
            >
              {phase === "submitting" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account & Join"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={`/login?redirect=${encodeURIComponent(`/invite/accept?inviteId=${inviteId}`)}`}
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground">
            By creating an account, you agree to our Terms of Service
            and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
    );
  }

// ─── Fetch full invite details ────────────────────────────────────────────────

async function loadInviteDetails(inviteId: string): Promise<(InviteDetails & { status: string }) | null> {
  const { doc: fdoc, getDoc: fgetDoc } = await import("firebase/firestore");
  const { db: fdb } = await import("@/lib/firebase/client");

  const inviteRef = fdoc(fdb, "workspace_invites", inviteId);
  const snap = await fgetDoc(inviteRef);
  if (!snap.exists()) return null;

  const data = snap.data();

  // Fetch workspace name
  let workspaceName = "Unknown Workspace";
  try {
    const workspace = await getWorkspace(data.workspaceId);
    if (workspace) workspaceName = workspace.name;
  } catch {
    // Non-critical — use fallback name
  }

  return {
    workspaceId: data.workspaceId,
    workspaceName,
    email: data.email,
    role: data.role,
    status: data.status,
  };
}

// ─── Page component ──────────────────────────────────────────────────────────

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}

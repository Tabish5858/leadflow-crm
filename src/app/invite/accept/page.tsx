"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { auth, db } from "@/lib/firebase/client";
import { acceptInvite } from "@/lib/firebase/workspaces";
import { toast } from "@/lib/toast";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, query as firestoreQuery, where, getDocs, Timestamp } from "firebase/firestore";
import {
  Building2,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  Shield,
  User,
  XCircle,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface InviteDetails {
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: string;
}

type Phase =
  | "loading"
  | "already_logged_in"
  | "signup"
  | "signin_existing"
  | "submitting"
  | "success"
  | "error";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inviteId = searchParams.get("inviteId");

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [invite, setInvite] = useState<InviteDetails | null>(null);

  // Signup form
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Sign-in form (existing user)
  const [signinPassword, setSigninPassword] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSigninLoading, setIsSigninLoading] = useState(false);

  // ─── Fetch invite details + check current auth ──────────────────────────

  useEffect(() => {
    if (!inviteId) {
      setPhase("error");
      setErrorMessage("Invalid invitation link. No invite ID provided.");
      return;
    }

    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      // Load invite details
      const data = await loadInviteDetails(inviteId);
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

      // Check if logged in with matching email
      if (currentUser && currentUser.email?.toLowerCase() === data.email.toLowerCase()) {
        setPhase("already_logged_in");
        return;
      }

      // Check Firestore for an existing user doc with this email
      let existingUser = false;
      try {
        const q = firestoreQuery(
          collection(db, "users"),
          where("email", "==", data.email)
        );
        const snap = await getDocs(q);
        existingUser = !snap.empty;
      } catch {
        // Firestore rules may block collection-level queries — fall through
      }

      setDisplayName(currentUser?.displayName || "");

      if (existingUser) {
        // Invited email already has a user document → show sign-in flow
        setPhase("signin_existing");
      } else {
        // No existing account found → signup flow
        setPhase("signup");
      }
    });

    return () => unsub();
  }, [inviteId]);

  // ─── Handle new user signup ─────────────────────────────────────────────

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;

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
      const cred = await createUserWithEmailAndPassword(auth, invite.email, password);
      await updateProfile(cred.user, { displayName: displayName.trim() });

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
        workspaceRoles: { [invite.workspaceId]: invite.role },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
      });

      await acceptInvite(inviteId!, cred.user.uid);

      setPhase("success");
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        // Account exists — switch to sign-in flow
        setPhase("signin_existing");
        setSigninPassword("");
        setErrorMessage("");
      } else {
        setPhase("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Something went wrong. Please try again."
        );
      }
    }
  };

  // ─── Handle existing user sign-in ───────────────────────────────────────

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;

    setIsSigninLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, invite.email, signinPassword);
      await acceptInviteAfterAuth(cred.user.uid);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === "auth/wrong-password") {
        toast.error("Incorrect password. Please try again.");
      } else if (code === "auth/invalid-credential") {
        toast.error("Invalid email or password. If you signed up with Google, use the button below.");
      } else {
        setPhase("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Sign in failed. Please try again."
        );
      }
      setIsSigninLoading(false);
    }
  };

  // ─── Handle Google sign-in ──────────────────────────────────────────────

  const handleGoogleSignIn = async () => {
    if (!invite) return;

    setIsSigninLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ login_hint: invite.email });
      const result = await signInWithPopup(auth, provider);
      await acceptInviteAfterAuth(result.user.uid);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // user closed popup — no error needed
      } else {
        setPhase("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Google sign in failed."
        );
      }
      setIsSigninLoading(false);
    }
  };

  // ─── Handle already logged in → accept invite ──────────────────────────

  const handleAcceptAsLoggedIn = async () => {
    if (!invite || !auth.currentUser) return;
    setIsAccepting(true);
    try {
      await acceptInviteAfterAuth(auth.currentUser.uid);
    } catch (error: unknown) {
      setPhase("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to accept invite."
      );
      setIsAccepting(false);
    }
  };

  // ─── Shared accept-invite logic (after any auth method) ─────────────────

  const acceptInviteAfterAuth = async (uid: string) => {
    if (!invite) return;

    // Ensure user document exists for Google-based users
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        id: uid,
        email: invite.email,
        displayName: auth.currentUser?.displayName || "",
        photoURL: auth.currentUser?.photoURL || null,
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
        workspaceRoles: { [invite.workspaceId]: invite.role },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
      });
    } else {
      // Update existing user with new workspace role
      const userData = userSnap.data();
      const workspaceRoles = userData.workspaceRoles || {};
      workspaceRoles[invite.workspaceId] = invite.role;
      const { setDoc: fsetDoc } = await import("firebase/firestore");
      await fsetDoc(userRef, { workspaceRoles, updatedAt: Timestamp.now() }, { merge: true });
    }

    await acceptInvite(inviteId!, uid);

    setPhase("success");
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  // ─── Loading state ─────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="h-6 w-40 bg-muted rounded animate-pulse mx-auto mb-2" />
            <div className="h-4 w-56 bg-muted rounded animate-pulse mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-muted rounded animate-pulse" />
            </div>
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
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
              Your invitation has been accepted. Redirecting to your workspace...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // ─── Already logged in — one-click accept ──────────────────────────────

  if (phase === "already_logged_in" && invite) {
    const roleLabels: Record<string, string> = {
      admin: "Admin — can manage members and settings",
      member: "Member — can create and edit leads",
      viewer: "Viewer — read-only access",
    };

    return (
      <div className="flex min-h-screen">
        <LeftPanel invite={invite} />
        <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
              <h1 className="text-xl font-bold">You&apos;re Signed In</h1>
              <p className="text-sm text-muted-foreground">
                as {auth.currentUser?.email}
              </p>
            </div>

            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>
                  Join <strong className="text-foreground">{invite.workspaceName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>
                  Role:{" "}
                  <strong className="text-foreground capitalize">{invite.role}</strong>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {roleLabels[invite.role] || "Accept to join this workspace."}
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleAcceptAsLoggedIn}
              disabled={isAccepting}
            >
              {isAccepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                "Accept Invitation & Join"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Not you?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Switch account
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Sign-in form (existing user) ──────────────────────────────────────

  if (phase === "signin_existing" && invite) {
    return (
      <div className="flex min-h-screen">
        <LeftPanel invite={invite} />
        <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold shadow-sm mx-auto">
                LF
              </div>
              <h1 className="text-xl font-bold">Sign in to accept</h1>
            </div>

            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <LogIn className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  An account with{" "}
                  <strong className="text-foreground">{invite.role === "owner" ? invite.email : invite.email}</strong>
                  {" "}already exists. Sign in to accept the invitation.
                </span>
              </div>
            </div>

            {/* Email/Password sign-in */}
            <form onSubmit={handleSignin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={invite.email}
                    disabled
                    className="pl-10 bg-muted/50 text-muted-foreground cursor-not-allowed"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={signinPassword}
                  onChange={(e) => setSigninPassword(e.target.value)}
                  className="pl-10"
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSigninLoading}
              >
                {isSigninLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In & Accept"
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isSigninLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link
                href={`/login?redirect=${encodeURIComponent(`/invite/accept?inviteId=${inviteId}`)}`}
                className="font-medium text-primary hover:underline"
              >
                Sign in on a different page
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Signup form (new user) ────────────────────────────────────────────

  const roleLabels: Record<string, string> = {
    admin: "Admin — can manage members and settings",
    member: "Member — can create and edit leads",
    viewer: "Viewer — read-only access",
  };

  return (
    <div className="flex min-h-screen">
      <LeftPanel invite={invite} />
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
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="font-medium text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Shared left panel ──────────────────────────────────────────────────────

function LeftPanel({ invite }: { invite: InviteDetails | null }) {
  return (
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
  );
}

// ─── Fetch full invite details ──────────────────────────────────────────────

async function loadInviteDetails(inviteId: string): Promise<(InviteDetails & { status: string }) | null> {
  try {
    const res = await fetch(`/api/workspaces/invite/check?inviteId=${encodeURIComponent(inviteId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Page component ────────────────────────────────────────────────────────

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

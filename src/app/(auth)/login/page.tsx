"use client";

import { useState } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/firebase/workspaces";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/toast";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      toast.success("Logged in successfully");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Login failed";
      toast.error(message);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        const workspaceId = crypto.randomUUID();
        await setDoc(userRef, {
          id: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || "",
          photoURL: result.user.photoURL || null,
          role: "owner",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: "en",
          currency: "USD",
          notificationPrefs: {
            email: true,
            inApp: true,
            followUpReminders: true,
            digestFrequency: "daily",
          },
          workspaceIds: [workspaceId],
          activeWorkspaceId: workspaceId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          lastActiveAt: Timestamp.now(),
        });

        // Create default workspace
        const displayName = result.user.displayName || "User";
        await setDoc(doc(db, "workspaces", workspaceId), {
          id: workspaceId,
          name: `${displayName}'s Workspace`,
          logoUrl: null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          currency: "USD",
          dateFormat: "MM/DD/YYYY",
          weekStart: "monday",
          pipeline: { stages: DEFAULT_PIPELINE_STAGES },
          customFields: [],
          niches: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          ownerId: result.user.uid,
          memberIds: [result.user.uid],
        });
      }
      toast.success("Logged in with Google");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Google login failed";
      toast.error(message);
      setLoading(false);
    }
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
            Manage your leads, close more deals.
          </h1>
          <p className="text-lg text-muted-foreground">
            The open-source CRM built for modern sales teams. Track pipelines,
            manage contacts, and grow your business.
          </p>
          <div className="space-y-3 pt-4">
            {[
              "Visual pipeline management",
              "Time tracking & billing",
              "Analytics & reporting",
              "Open source & free forever",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15">
                  <div className="h-2 w-2 rounded-full bg-success" />
                </div>
                <span className="text-sm text-muted-foreground">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <Card className="w-full max-w-md border-0 shadow-none bg-transparent">
          <CardContent className="space-y-6">
            {/* Mobile Logo */}
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-sm shadow-sm">
                LF
              </div>
              <span className="text-lg font-bold tracking-tight">
                LeadFlow
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                Welcome back
              </h2>
              <p className="text-sm text-muted-foreground">
                Sign in to your LeadFlow account
              </p>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">
                  OR
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
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
              Continue with Google
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-primary hover:underline"
              >
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

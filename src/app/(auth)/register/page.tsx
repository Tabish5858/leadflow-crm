"use client";

import { useState } from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/firebase/workspaces";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      await updateProfile(cred.user, { displayName: formData.name });

      // Create user document
      const workspaceId = crypto.randomUUID();
      await setDoc(doc(db, "users", cred.user.uid), {
        id: cred.user.uid,
        email: formData.email,
        displayName: formData.name,
        photoURL: null,
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
      await setDoc(doc(db, "workspaces", workspaceId), {
        id: workspaceId,
        name: `${formData.name}'s Workspace`,
        logoUrl: null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        currency: "USD",
        dateFormat: "MM/DD/YYYY",
        weekStart: "monday",
        pipeline: {
          stages: DEFAULT_PIPELINE_STAGES,
        },
        customFields: [],
        niches: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ownerId: cred.user.uid,
        memberIds: [cred.user.uid],
        inviteCode: generateInviteCode(),
      });

      toast.success("Account created successfully");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Registration failed";
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
            Start managing your leads today.
          </h1>
          <p className="text-lg text-muted-foreground">
            Free, open-source CRM that grows with your business. No credit card
            required.
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
                Create an account
              </h2>
              <p className="text-sm text-muted-foreground">
                Get started with LeadFlow — it&apos;s free and open-source
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  autoComplete="name"
                />
              </div>
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
                  minLength={8}
                  autoComplete="new-password"
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

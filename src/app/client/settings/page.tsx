"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientUser } from "@/contexts/client-user-context";
import { db } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  Building2,
  Calendar,
  Check,
  LogOut,
  Mail,
  Save,
  ShieldAlert,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/client/module-layout";

export default function ClientSettingsPage() {
  const {
    uid,
    displayName: initialName,
    email,
    photoURL,
    workspaceName,
  } = useClientUser();

  const [displayName, setDisplayName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [memberSince, setMemberSince] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayName(initialName);
  }, [initialName]);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "users", uid)).then((userSnap) => {
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.createdAt?.toDate) {
          setMemberSince(userData.createdAt.toDate());
        }
      }
    });
  }, [uid]);

  const handleSaveProfile = async () => {
    if (!displayName.trim() || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateDoc(doc(db, "users", uid), {
        displayName: displayName.trim(),
        updatedAt: new Date(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Silently fail - user can retry
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Manage your account and preferences" />

      {/* ── Profile ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 border-2">
              <AvatarImage src={photoURL || undefined} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {displayName?.charAt(0) || "C"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <p className="text-lg font-semibold">{displayName}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{email}</span>
                <Badge variant="secondary" className="text-[10px] leading-none">
                  <Mail className="h-3 w-3 mr-0.5 inline" />
                  Verified
                </Badge>
              </div>
              {memberSince && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Member since {formatDate(memberSince)}
                </p>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <div className="flex gap-2">
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSaveProfile}
                disabled={saving || !displayName.trim()}
                className="gap-2"
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved
                  </>
                ) : saving ? (
                  <Skeleton className="h-4 w-4" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Account ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Workspace</p>
              <p className="text-sm text-muted-foreground">{workspaceName}</p>
            </div>
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Your Role</p>
              <p className="text-sm text-muted-foreground">Client portal access</p>
            </div>
            <Badge variant="outline" className="capitalize shrink-0">
              Client
            </Badge>
          </div>
          {memberSince && (
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Member Since</p>
                <p className="text-sm text-muted-foreground">{formatDate(memberSince)}</p>
              </div>
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Danger Zone ── */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Remove Account</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently remove your account from this workspace. This action cannot be undone.
                </p>
              </div>
              <Button variant="destructive" size="sm" className="gap-2 shrink-0">
                <LogOut className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

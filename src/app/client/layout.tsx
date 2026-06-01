"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientUserProvider } from "@/contexts/client-user-context";
import type { ClientUserData } from "@/contexts/client-user-context";
import { auth, db } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface ClientUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  /** Workspace ID where user has "client" role */
  clientWorkspaceId: string;
  workspaceName: string;
}

const navItems = [
  { href: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

function NavSkeleton() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </main>
    </div>
  );
}

function ClientLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthRoute = pathname?.startsWith("/client/auth") ?? false;

  useEffect(() => {
    if (isAuthRoute) {
      // Auth routes (accept page) — accessible without authentication.
      // The page component handles its own auth state internally.
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }

      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          router.push("/register");
          return;
        }

        const userData = userSnap.data();
        const workspaceRoles: Record<string, string> = userData.workspaceRoles || {};

        // Find a workspace where the user has "client" role
        const clientEntry = Object.entries(workspaceRoles).find(
          ([_, role]) => role === "client"
        );

        if (!clientEntry) {
          // Not a client — redirect to dashboard
          router.push("/dashboard");
          return;
        }

        const [clientWorkspaceId] = clientEntry;

        // Fetch workspace name
        const workspaceSnap = await getDoc(doc(db, "workspaces", clientWorkspaceId));
        const workspaceName = workspaceSnap.exists()
          ? (workspaceSnap.data().name || "Workspace")
          : "Workspace";

        setClientUser({
          uid: firebaseUser.uid,
          displayName: userData.displayName || firebaseUser.displayName || "Client",
          email: userData.email || firebaseUser.email || "",
          photoURL: userData.photoURL || firebaseUser.photoURL || null,
          clientWorkspaceId,
          workspaceName,
        });
      } catch (error) {
        console.error("Client auth error:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, isAuthRoute]);

  // Auth routes — render children directly without header/nav
  if (isAuthRoute) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const currentPage = navItems.find((item) => pathname.startsWith(item.href));

  if (loading) return <NavSkeleton />;
  if (!clientUser) return null;

  return (
    <ClientUserProvider clientUser={clientUser}>
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm lg:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            className="lg:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-sm shadow-sm">
              LF
            </div>
            <span className="hidden text-lg font-bold tracking-tight sm:inline">
              {clientUser.workspaceName}
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 ml-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </Button>

          <Avatar className="h-8 w-8 border">
            <AvatarImage src={clientUser.photoURL || undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {clientUser.displayName.charAt(0) || "C"}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="fixed left-0 top-16 z-20 flex w-64 flex-col border-r bg-card p-4 shadow-lg lg:hidden">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </>
      )}

      {/* Page content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 page-enter sm:p-6">{children}</div>
      </main>
    </div>
    </ClientUserProvider>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayoutInner>{children}</ClientLayoutInner>;
}

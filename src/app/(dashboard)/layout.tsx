"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  BarChart3,
  Clock,
  MessageSquare,
  Settings,
  Zap,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { WorkspaceProvider, useWorkspace } from "@/contexts/workspace-context";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/time-tracker", label: "Time Tracker", icon: Clock },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/automations", label: "Automations", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
];

function SidebarSkeleton() {
  return (
    <aside className="flex w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-3 px-6">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </nav>
      <Separator />
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, activeWorkspace, loading: wsLoading } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
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
      } catch {
        // User doc might not exist yet
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const currentPage = navItems.find((item) => item.href === pathname);

  if (loading || wsLoading) {
    return (
      <div className="flex h-screen">
        <SidebarSkeleton />
        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo + Close */}
        <div className="flex h-16 items-center justify-between gap-3 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-sm shadow-sm">
              LF
            </div>
            <span className="text-lg font-bold tracking-tight">LeadFlow</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Close menu</p></TooltipContent>
          </Tooltip>
        </div>

        <Separator />

        {/* Workspace Switcher */}
        <WorkspaceSwitcher />

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 p-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <ChevronRight className="h-3.5 w-3.5 text-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        <Separator />

        {/* Footer */}
        <div className="p-3 space-y-1">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>

          {/* User Info */}
          <Link
            href="/settings"
            onClick={() => {
              // Set active tab to profile via localStorage
              localStorage.setItem("leadflow_settings_tab", "profile");
              setSidebarOpen(false);
            }}
            className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-accent/50"
          >
            <Avatar className="h-8 w-8 border">
              <AvatarImage src={user?.photoURL || undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {user?.displayName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">
                {user?.displayName || "User"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email || ""}
              </p>
            </div>
          </Link>

          {/* Sign Out */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm lg:px-6">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Open menu</p></TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden sm:inline">LeadFlow</span>
              <ChevronRight className="h-3.5 w-3.5 hidden sm:inline" />
              <span className="font-medium text-foreground">
                {activeWorkspace?.name || "Workspace"}
              </span>
              <ChevronRight className="h-3.5 w-3.5 hidden sm:inline" />
              <span className="font-medium text-foreground">
                {currentPage?.label || "Dashboard"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border sm:hidden">
              <AvatarImage src={user?.photoURL || undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {user?.displayName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 page-enter sm:p-6">{children}</div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </WorkspaceProvider>
  );
}

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DemoBanner } from "@/components/demo/demo-banner";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UnreadBadge } from "@/components/messages/unread-badge";
import { HeaderActionsProvider } from "@/contexts/header-actions-context";
import { ClientPreviewProvider } from "@/lib/hooks/use-client-preview";
import { WorkspaceProvider, useWorkspace } from "@/contexts/workspace-context";
import { useDemoMode } from "@/lib/demo/demo-context";
import { auth, db } from "@/lib/firebase/client";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { cn } from "@/lib/utils";
import type { ModuleId } from "@/types";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  KanbanSquare,
  File,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Sun,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const navItems: { href: string; label: string; icon: typeof LayoutDashboard; moduleId: ModuleId }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, moduleId: "dashboard" },
  { href: "/leads", label: "Leads", icon: Users, moduleId: "leads" },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare, moduleId: "pipeline" },
  { href: "/projects", label: "Projects", icon: FolderKanban, moduleId: "projects" },
  { href: "/time-tracker", label: "Time Tracker", icon: Clock, moduleId: "time_tracker" },
  { href: "/meetings", label: "Meetings", icon: Calendar, moduleId: "meetings" },
  { href: "/messages", label: "Messages", icon: MessageSquare, moduleId: "messages" },
  { href: "/invoices", label: "Invoices", icon: FileText, moduleId: "invoices" },
  { href: "/documents", label: "Documents", icon: File, moduleId: "documents" },
  { href: "/clients", label: "Clients", icon: UserCheck, moduleId: "clients" },
  { href: "/settings", label: "Settings", icon: Settings, moduleId: "settings" },
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
  const { canAccess } = usePermissions();
  const { isDemoMode } = useDemoMode();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [headerActions, setHeaderActions] = useState<ReactNode | null>(null);

  useEffect(() => {
    // Demo mode bypasses Firebase auth entirely
    if (isDemoMode) {
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
      } catch {
        // User doc might not exist yet
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router, isDemoMode]);

  useEffect(() => {
    const saved = localStorage.getItem("leadflow_sidebar_collapsed");
    if (saved !== null) {
      setSidebarCollapsed(saved === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("leadflow_sidebar_collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    setHeaderActions(null);
  }, [pathname]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const currentPage = navItems.find((item) => pathname.startsWith(item.href));

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

  // Clients use the dedicated client portal, not the dashboard
  if (user?.role === "client") {
    router.push("/client/dashboard");
    return null;
  }

  return (
    <HeaderActionsProvider setHeaderActions={setHeaderActions}>
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
            "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-300 lg:relative lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
            sidebarCollapsed ? "lg:w-20" : "lg:w-64"
          )}
        >
          {/* ── Logo + Collapse Toggle ── */}
          <div
            className={cn(
              "flex h-16 shrink-0 items-center border-b px-4",
              sidebarCollapsed ? "justify-center" : "justify-between"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-sm shadow-sm">
                LF
              </div>
              {!sidebarCollapsed && (
                <span className="text-lg font-bold tracking-tight truncate">
                  {activeWorkspace?.name || "LeadFlow"}
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="hidden lg:inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="hidden lg:inline-flex absolute -right-3 top-5 z-10 h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
            {/* Mobile close */}
            <button
              type="button"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* ── Workspace Switcher ── */}
          <div className={cn(sidebarCollapsed ? "flex justify-center pt-3 flex-col" : "pt-3")}>
            <WorkspaceSwitcher collapsed={sidebarCollapsed} />
          </div>

          {/* ── Navigation ── */}
          <nav
            className={cn(
              "flex-1 overflow-y-auto py-3",
              sidebarCollapsed ? "px-2 space-y-1 flex flex-col items-center" : "px-3 space-y-0.5"
            )}
          >
            {navItems
              .filter((item) => canAccess(item.moduleId))
              .map((item) => {
                const isActive = pathname.startsWith(item.href);

                return sidebarCollapsed ? (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "flex items-center justify-center rounded-lg px-2.5 py-2.5 text-sm font-medium transition-all w-max",
                          isActive
                            ? "bg-primary/10 text-primary shadow-sm"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-2">
                      <p>{item.label}</p>
                      {item.href === "/messages" && (
                        <UnreadBadge
                          workspaceId={activeWorkspace?.id || ""}
                          userId={user?.id || ""}
                        />
                      )}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.href === "/messages" && (
                      <UnreadBadge
                        workspaceId={activeWorkspace?.id || ""}
                        userId={user?.id || ""}
                      />
                    )}
                  </Link>
                );
              })}
          </nav>

          {/* ── Footer ── */}
          <div className="border-t">
            {/* User info */}
            <Link
              href="/settings"
              onClick={() => {
                localStorage.setItem("leadflow_settings_tab", "profile");
                setSidebarOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/50",
                sidebarCollapsed ? "justify-center mx-2 mt-2 rounded-lg hover:bg-accent/50" : ""
              )}
              title={sidebarCollapsed ? user?.displayName || "Profile" : undefined}
            >
              <Avatar className="h-8 w-8 shrink-0 border">
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {user?.displayName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">
                    {user?.displayName || "User"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email || ""}
                  </p>
                </div>
              )}
            </Link>

            {/* Theme + Sign Out */}
            <div
              className={cn(
                "p-3",
                sidebarCollapsed && "flex flex-col items-center gap-1 px-2 pb-3"
              )}
            >
              {sidebarCollapsed ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{theme === "dark" ? "Light Mode" : "Dark Mode"}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Sign Out</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title={theme === "dark" ? "Light Mode" : "Dark Mode"}
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Demo Banner */}
          <DemoBanner />

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
              {headerActions && (
                <div className="flex items-center gap-2">{headerActions}</div>
              )}
              <NotificationBell />
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
    </HeaderActionsProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientPreviewProvider>
      <WorkspaceProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </WorkspaceProvider>
    </ClientPreviewProvider>
  );
}

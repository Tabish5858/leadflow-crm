"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ClientPreviewBanner } from "@/components/client/ClientPreviewBanner";
import { ClientUserProvider } from "@/contexts/client-user-context";
import { ClientPortalProvider } from "@/contexts/client-portal-context";
import { auth, db } from "@/lib/firebase/client";
import { useClientPreview } from "@/lib/hooks/use-client-preview";
import { cn } from "@/lib/utils";
import type { ClientPortalSettings } from "@/types";
import { DEFAULT_CLIENT_PORTAL_SETTINGS } from "@/types";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
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
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ClientUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  clientWorkspaceId: string;
  workspaceName: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey?: keyof ClientPortalSettings["modules"];
}

const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/client/projects", label: "Projects", icon: FolderKanban, moduleKey: "projects" },
  { href: "/client/messages", label: "Messages", icon: MessageSquare, moduleKey: "messages" },
  { href: "/client/meetings", label: "Meetings", icon: Calendar, moduleKey: "meetings" },
  { href: "/client/invoices", label: "Invoices", icon: FileText, moduleKey: "invoices" },
  { href: "/client/documents", label: "Documents", icon: File, moduleKey: "documents" },
  { href: "/client/time-tracker", label: "Time Tracker", icon: Clock, moduleKey: "time_tracking" },
  { href: "/client/settings", label: "Settings", icon: Settings },
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
        {Array.from({ length: 7 }).map((_, i) => (
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

function ClientLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [portalSettings, setPortalSettings] = useState<ClientPortalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { isPreviewing, previewClientName, previewClientId } = useClientPreview();
  const isAuthRoute = pathname?.startsWith("/client/auth") ?? false;

  // Compute visible nav items based on portal settings
  const navItems: NavItem[] = ALL_NAV_ITEMS.filter((item) => {
    if (!item.moduleKey) return true; // Dashboard and Settings always shown
    if (!portalSettings) return true; // Default to showing all until settings load
    // Respect the module setting from client_portal_settings
    return portalSettings.modules[item.moduleKey] !== false;
  });

  // Persist sidebar state
  useEffect(() => {
    const saved = localStorage.getItem("leadflow_client_sidebar_collapsed");
    if (saved !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSidebarCollapsed(saved === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("leadflow_client_sidebar_collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Auth + user data loading
  useEffect(() => {
    if (isAuthRoute) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    // Preview mode: use mock data + saved settings from sessionStorage
    if (isPreviewing && previewClientId) {
      // Try to load preview settings from sessionStorage
      let previewSettings: ClientPortalSettings | null = null;
      if (typeof window !== "undefined") {
        try {
          const stored = sessionStorage.getItem("leadflow_client_portal_preview_settings");
          if (stored) {
            const parsed = JSON.parse(stored);
            previewSettings = {
              ...(DEFAULT_CLIENT_PORTAL_SETTINGS as ClientPortalSettings),
              ...parsed,
              modules: { ...(DEFAULT_CLIENT_PORTAL_SETTINGS.modules as ClientPortalSettings["modules"]), ...(parsed.modules || {}) },
              welcomeCard: { ...(DEFAULT_CLIENT_PORTAL_SETTINGS.welcomeCard as ClientPortalSettings["welcomeCard"]), ...(parsed.welcomeCard || {}) },
              checklist: { ...(DEFAULT_CLIENT_PORTAL_SETTINGS.checklist as ClientPortalSettings["checklist"]), ...(parsed.checklist || {}) },
            } as ClientPortalSettings;
          }
        } catch {
          // Invalid preview data — use defaults
        }
      }
      setClientUser({
        uid: previewClientId,
        displayName: previewClientName || "Preview Client",
        email: "client@preview.local",
        photoURL: null,
        clientWorkspaceId: "preview",
        workspaceName: "Workspace (Preview)",
      });
      setPortalSettings(previewSettings || (DEFAULT_CLIENT_PORTAL_SETTINGS as ClientPortalSettings));
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

        const clientEntry = Object.entries(workspaceRoles).find(
          ([_, role]) => role === "client"
        );

        if (!clientEntry) {
          router.push("/dashboard");
          return;
        }

        const [clientWorkspaceId] = clientEntry;

        const [workspaceSnap, settingsSnap] = await Promise.all([
          getDoc(doc(db, "workspaces", clientWorkspaceId)),
          getDoc(doc(db, "client_portal_settings", clientWorkspaceId)),
        ]);

        const workspaceName = workspaceSnap.exists()
          ? (workspaceSnap.data().name || "Workspace")
          : "Workspace";

        if (settingsSnap.exists()) {
          setPortalSettings(settingsSnap.data() as ClientPortalSettings);
        } else {
          setPortalSettings(DEFAULT_CLIENT_PORTAL_SETTINGS as ClientPortalSettings);
        }

        setClientUser({
          uid: firebaseUser.uid,
          displayName: userData.displayName || firebaseUser.displayName || "Client",
          email: userData.email || firebaseUser.email || "",
          photoURL: userData.photoURL || firebaseUser.photoURL || null,
          clientWorkspaceId,
          workspaceName,
        });
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, isAuthRoute, isPreviewing, previewClientId, previewClientName]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const currentPage = navItems.find((item) => pathname.startsWith(item.href));

  // Auth routes: render without sidebar
  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (loading) {
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

  if (!clientUser) return null;

  // Maintenance mode: portal disabled via settings
  const isPortalDisabled = portalSettings?.enabled === false && !isAuthRoute;

  // Show maintenance page when portal is disabled
  if (isPortalDisabled) {
    return (
      <ClientUserProvider clientUser={clientUser}>
        <ClientPortalProvider settings={portalSettings}>
          <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="mx-auto max-w-md text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted mx-auto">
                <svg
                  className="h-10 w-10 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">
                Portal Under Maintenance
              </h1>
              <p className="text-muted-foreground mb-8">
                The client portal is currently disabled. Please check back later
                or contact your service provider for more information.
              </p>
              <Button
                variant="outline"
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </ClientPortalProvider>
      </ClientUserProvider>
    );
  }

  return (
    <ClientUserProvider clientUser={clientUser}>
      <ClientPortalProvider settings={portalSettings}>
      <div className="flex h-screen">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-200 lg:static lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
            sidebarCollapsed ? "lg:w-20" : "lg:w-64"
          )}
        >
          {/* Logo + Controls */}
          <div
            className={cn(
              "flex h-16 items-center justify-between gap-3 px-6",
              sidebarCollapsed && "px-4"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-sm shadow-sm">
                LF
              </div>
              {!sidebarCollapsed && (
                <span className="text-lg font-bold tracking-tight truncate">
                  {clientUser.workspaceName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="hidden lg:inline-flex"
                    onClick={() => setSidebarCollapsed((prev) => !prev)}
                    aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  >
                    {sidebarCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="lg:hidden"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent><p>Close menu</p></TooltipContent>
              </Tooltip>
            </div>
          </div>

          <Separator />

          {/* Navigation */}
          <nav
            className={cn(
              "flex-1 space-y-0.5 overflow-y-auto p-3",
              sidebarCollapsed && "px-2"
            )}
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

              const linkContent = (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
                    sidebarCollapsed && "justify-center px-2",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {isActive && (
                        <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </>
                  )}
                </Link>
              );

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </nav>

          <Separator />

          {/* Footer — user info + theme + logout */}
          <div className={cn("p-3 space-y-2", sidebarCollapsed && "px-2")}>
            {/* User info */}
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2",
                sidebarCollapsed && "justify-center px-2"
              )}
              title={sidebarCollapsed ? clientUser.displayName : undefined}
            >
              <Avatar className="h-8 w-8 border shrink-0">
                <AvatarImage src={clientUser.photoURL || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {clientUser.displayName.charAt(0) || "C"}
                </AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">
                    {clientUser.displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {clientUser.email}
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-1">
              {/* Theme toggle */}
              {sidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      className="flex h-9 w-full items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                      aria-label={theme === "dark" ? "Light Mode" : "Dark Mode"}
                    >
                      {theme === "dark" ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{theme === "dark" ? "Light Mode" : "Dark Mode"}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  type="button"
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
              )}

              {/* Sign out */}
              {sidebarCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-full text-muted-foreground hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Sign Out</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Preview banner (agency preview mode) */}
          <ClientPreviewBanner />

          {/* Header */}
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm lg:px-6">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="lg:hidden"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open navigation menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent><p>Open menu</p></TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="hidden sm:inline font-medium text-foreground">
                  {clientUser.workspaceName}
                </span>
                <ChevronRight className="h-3.5 w-3.5 hidden sm:inline" />
                <span className="font-medium text-foreground">
                  {currentPage?.label || "Dashboard"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 border sm:hidden">
                <AvatarImage src={clientUser.photoURL || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {clientUser.displayName.charAt(0) || "C"}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Page content */}
          <div className="flex-1 overflow-auto">
            <div className="p-4 page-enter sm:p-6">{children}</div>
          </div>
        </main>
      </div>
      </ClientPortalProvider>
    </ClientUserProvider>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayoutInner>{children}</ClientLayoutInner>;
}

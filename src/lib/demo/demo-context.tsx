"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import {
  DEMO_USER,
  DEMO_WORKSPACE,
  DEMO_LEADS,
  DEMO_CONVERSATIONS,
  DEMO_MESSAGES,
  DEMO_TIME_ENTRIES,
  DEMO_NOTIFICATIONS,
  DEMO_MEETINGS,
  DEMO_STATS,
  demoStore,
  DEMO_TEAM_MEMBERS,
} from "./demo-data";
import type { User, Workspace } from "@/types";

const DEMO_FLAG_KEY = "leadflow_demo_mode";

interface DemoContextValue {
  isDemoMode: boolean;
  demoUser: User;
  demoWorkspace: Workspace;
  teamMembers: typeof DEMO_TEAM_MEMBERS;
  store: typeof demoStore;
  demoStats: typeof DEMO_STATS;
  enterDemo: () => void;
  exitDemo: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemoMode() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemoMode must be used within DemoProvider");
  }
  return context;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  // Initialize synchronously from localStorage so workspace context sees the correct value
  // on first render (not waiting for useEffect)
  const [isDemoMode, setIsDemoMode] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(DEMO_FLAG_KEY) === "true"
  );

  const enterDemo = useCallback(() => {
    localStorage.setItem(DEMO_FLAG_KEY, "true");
    setIsDemoMode(true);
    // Small delay to let React state propagate before navigation
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 50);
  }, []);

  const exitDemo = useCallback(async () => {
    localStorage.removeItem(DEMO_FLAG_KEY);
    setIsDemoMode(false);
    // Reset demo store to initial state for next session
    Object.assign(demoStore, {
      leads: [...DEMO_LEADS],
      conversations: [...DEMO_CONVERSATIONS],
      messages: [...DEMO_MESSAGES],
      timeEntries: [...DEMO_TIME_ENTRIES],
      notifications: [...DEMO_NOTIFICATIONS],
      meetings: [...DEMO_MEETINGS],
    });
    // Try to sign out from Firebase (in case user was previously logged in)
    try {
      await signOut(auth);
    } catch {
      // Firebase sign out may fail if not authenticated - that's fine
    }
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      isDemoMode,
      demoUser: DEMO_USER,
      demoWorkspace: DEMO_WORKSPACE,
      teamMembers: DEMO_TEAM_MEMBERS,
      store: demoStore,
      demoStats: DEMO_STATS,
      enterDemo,
      exitDemo,
    }),
    [isDemoMode, enterDemo, exitDemo]
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { Workspace, User } from "@/types";
import {
  subscribeToUserWorkspaces,
  createWorkspace,
  setActiveWorkspace,
  getUserWorkspaces,
} from "@/lib/firebase/workspaces";
import { canCreateWorkspace } from "@/lib/workspace-permissions";
import { useDemoMode } from "@/lib/demo/demo-context";
import { DEMO_USER, DEMO_WORKSPACE } from "@/lib/demo/demo-data";

// Synchronous check - doesn't depend on React state propagation
function isDemoModeSync(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("leadflow_demo_mode") === "true";
}

const LOCAL_STORAGE_KEY = "leadflow_active_workspace";

/**
 * Compute the effective role for a user in a specific workspace.
 * Uses workspaceRoles map first, falls back to top-level role (legacy).
 */
function getEffectiveRole(userData: User, workspaceId: string): User["role"] {
  const workspaceRoles = userData.workspaceRoles || {};
  const role = workspaceRoles[workspaceId] || userData.role || "viewer";
  return role as User["role"];
}

interface WorkspaceContextValue {
  user: User | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createNewWorkspace: (name: string) => Promise<string>;
  refreshWorkspaces: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  // Synchronous demo mode check - runs during render, before any effects
  const [user, setUser] = useState<User | null>(
    () => isDemoModeSync() ? DEMO_USER : null
  );
  const [workspaces, setWorkspaces] = useState<Workspace[]>(
    () => isDemoModeSync() ? [DEMO_WORKSPACE] : []
  );
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(
    () => isDemoModeSync() ? DEMO_WORKSPACE : null
  );
  const [loading, setLoading] = useState(!isDemoModeSync());
  const unsubscribeWsRef = useRef<(() => void) | null>(null);
  const demoMode = useDemoMode();

  // Load user and workspaces on auth change
  useEffect(() => {
    // If demo mode is active, skip Firebase entirely and use mock data
    if (isDemoModeSync() || demoMode.isDemoMode) {
      setUser(DEMO_USER);
      setWorkspaces([DEMO_WORKSPACE]);
      setActiveWorkspaceState(DEMO_WORKSPACE);
      setLoading(false);
      return;
    }
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setWorkspaces([]);
        setActiveWorkspaceState(null);
        setLoading(false);
        return;
      }

      try {
        // Load user document
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const rawUserData = userSnap.data() as User;
          // Always set id from Firestore doc ID (legacy accounts may not store it)
          if (!rawUserData.id) rawUserData.id = firebaseUser.uid;

          // Determine active workspace
          let targetWorkspaceId = rawUserData.activeWorkspaceId;

          // Fallback to localStorage
          if (!targetWorkspaceId) {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) targetWorkspaceId = stored;
          }

          // Load workspaces
          const fetchedWorkspaces = await getUserWorkspaces([firebaseUser.uid]);
          setWorkspaces(fetchedWorkspaces);

          // Resolve the active workspace
          let resolvedWorkspace: Workspace | null = null;
          if (targetWorkspaceId && fetchedWorkspaces.find((w) => w.id === targetWorkspaceId)) {
            resolvedWorkspace = fetchedWorkspaces.find((w) => w.id === targetWorkspaceId) || null;
          } else if (fetchedWorkspaces.length > 0) {
            // Default to first workspace
            resolvedWorkspace = fetchedWorkspaces[0];
            // Sync to Firestore
            await updateDoc(userRef, { activeWorkspaceId: fetchedWorkspaces[0].id });
          }

          // Compute effective role for this workspace
          if (resolvedWorkspace) {
            rawUserData.role = getEffectiveRole(rawUserData, resolvedWorkspace.id);
          }
          setUser(rawUserData);
          setActiveWorkspaceState(resolvedWorkspace);

          // Set up real-time subscription
          if (unsubscribeWsRef.current) unsubscribeWsRef.current();
          const unsub = subscribeToUserWorkspaces(firebaseUser.uid, (updatedWorkspaces) => {
            setWorkspaces(updatedWorkspaces);
            // Update active workspace if it changed
            setActiveWorkspaceState((prev) => {
              if (prev) {
                const updated = updatedWorkspaces.find((w) => w.id === prev.id);
                return updated || prev;
              }
              return updatedWorkspaces.length > 0 ? updatedWorkspaces[0] : null;
            });
          });
          unsubscribeWsRef.current = unsub;
        }
      } catch (error) {
        console.error("Failed to load workspace data:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeWsRef.current) unsubscribeWsRef.current();
    };
  }, []);

  // Keep user.role in sync with the active workspace's workspaceRoles map
  // Uses a ref to avoid setState-in-effect lint error
  const prevWorkspaceIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeWorkspace || !user) return;
    if (prevWorkspaceIdRef.current === activeWorkspace.id) return;
    prevWorkspaceIdRef.current = activeWorkspace.id;

    const workspaceRoles = user.workspaceRoles || {};
    const effectiveRole = workspaceRoles[activeWorkspace.id] || user.role || "viewer";
    if (user.role !== effectiveRole) {
      setUser({ ...user, role: effectiveRole as User["role"] });
    }
  }, [activeWorkspace?.id, user]);

  const switchWorkspace = useCallback(async (workspaceId: string) => {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace || !user) return;

    // Compute effective role for the target workspace
    const updatedUser = { ...user, role: getEffectiveRole(user, workspaceId) };
    setUser(updatedUser);
    setActiveWorkspaceState(workspace);
    localStorage.setItem(LOCAL_STORAGE_KEY, workspaceId);

    // Sync to Firestore
    try {
      await setActiveWorkspace(user.id, workspaceId);
    } catch (error) {
      console.error("Failed to sync active workspace:", error);
    }
  }, [workspaces, user]);

  const createNewWorkspace = useCallback(async (name: string): Promise<string> => {
    if (!user) throw new Error("No user");
    if (!canCreateWorkspace(user.email)) {
      throw new Error("You are not authorized to create workspaces on this instance.");
    }

    const workspaceId = await createWorkspace(user.id, name);

    // Update user's workspaceIds
    const userRef = doc(db, "users", user.id);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data() as User;
      const workspaceIds = userData.workspaceIds || [];
      await updateDoc(userRef, {
        workspaceIds: [...workspaceIds, workspaceId],
        activeWorkspaceId: workspaceId,
        [`workspaceRoles.${workspaceId}`]: "owner",
      });
    }

    // Switch to new workspace
    await switchWorkspace(workspaceId);

    return workspaceId;
  }, [user, switchWorkspace]);

  const refreshWorkspaces = useCallback(() => {
    // Triggered by re-subscription; handled by the real-time listener
    if (user) {
      getUserWorkspaces([user.id]).then(setWorkspaces);
    }
  }, [user]);

  const value = useMemo(() => ({
    user,
    workspaces,
    activeWorkspace,
    loading,
    switchWorkspace,
    createNewWorkspace,
    refreshWorkspaces,
  }), [user, workspaces, activeWorkspace, loading, switchWorkspace, createNewWorkspace, refreshWorkspaces]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

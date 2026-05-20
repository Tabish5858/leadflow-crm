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

const LOCAL_STORAGE_KEY = "leadflow_active_workspace";

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
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const unsubscribeWsRef = useRef<(() => void) | null>(null);

  // Load user and workspaces on auth change
  useEffect(() => {
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
          const userData = userSnap.data() as User;
          setUser(userData);

          // Determine active workspace
          let targetWorkspaceId = userData.activeWorkspaceId;

          // Fallback to localStorage
          if (!targetWorkspaceId) {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) targetWorkspaceId = stored;
          }

          // Load workspaces
          const fetchedWorkspaces = await getUserWorkspaces([firebaseUser.uid]);
          setWorkspaces(fetchedWorkspaces);

          // Validate active workspace is in user's workspaces
          if (targetWorkspaceId && fetchedWorkspaces.find((w) => w.id === targetWorkspaceId)) {
            setActiveWorkspaceState(fetchedWorkspaces.find((w) => w.id === targetWorkspaceId) || null);
          } else if (fetchedWorkspaces.length > 0) {
            // Default to first workspace
            setActiveWorkspaceState(fetchedWorkspaces[0]);
            // Sync to Firestore
            await updateDoc(userRef, { activeWorkspaceId: fetchedWorkspaces[0].id });
          }

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

  const switchWorkspace = useCallback(async (workspaceId: string) => {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (!workspace || !user) return;

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

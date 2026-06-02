"use client";

import { useWorkspace } from "@/contexts/workspace-context";
import { useCallback, useEffect, useState } from "react";

/**
 * Hook to check if the current user can create workspaces.
 * Calls a server API endpoint to avoid exposing the allowed email list
 * to the client bundle.
 */
export function useCanCreateWorkspace(): {
  canCreate: boolean;
  loading: boolean;
} {
  const { user } = useWorkspace();
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    if (!user?.id) {
      setCanCreate(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { auth: firebaseAuth } = await import("@/lib/firebase/client");
      const idToken = await firebaseAuth.currentUser?.getIdToken();
      if (!idToken) {
        setCanCreate(false);
        setLoading(false);
        return;
      }

      const activeWorkspaceId = user.activeWorkspaceId || "";

      const res = await fetch("/api/workspaces/can-create", {
        headers: {
          Authorization: `Bearer ${idToken}`,
          "x-workspace-id": activeWorkspaceId,
        },
      });

      if (!res.ok) {
        setCanCreate(false);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setCanCreate(data.canCreate ?? false);
    } catch {
      setCanCreate(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.activeWorkspaceId]);

  useEffect(() => {
    check();
  }, [check]);

  return { canCreate, loading };
}

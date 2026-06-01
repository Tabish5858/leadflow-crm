"use client";

import { useClientPortal } from "@/contexts/client-portal-context";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * Route guard that redirects to client dashboard if the specified module is disabled.
 * Use in client pages that should only be accessible when the module is enabled.
 */
export function ModuleGuard({
  moduleKey,
  children,
}: {
  moduleKey: keyof import("@/types").ClientPortalSettings["modules"];
  children: ReactNode;
}) {
  const { isModuleEnabled } = useClientPortal();
  const router = useRouter();
  const enabled = isModuleEnabled(moduleKey);

  useEffect(() => {
    if (!enabled) {
      router.replace("/client/dashboard");
    }
  }, [enabled, router]);

  if (!enabled) return null;

  return <>{children}</>;
}

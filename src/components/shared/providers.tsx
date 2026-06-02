"use client";

import { ClientPreviewProvider } from "@/lib/hooks/use-client-preview";
import { DemoProvider } from "@/lib/demo/demo-context";
import type { ReactNode } from "react";

/**
 * Client-side providers that need to be above both dashboard and client route groups.
 * Wraps children with ClientPreviewProvider so preview mode works across all routes.
 * Also wraps with DemoProvider so demo mode works on the login page and dashboard.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <DemoProvider>
      <ClientPreviewProvider>{children}</ClientPreviewProvider>
    </DemoProvider>
  );
}

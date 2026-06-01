"use client";

import { ClientPreviewProvider } from "@/lib/hooks/use-client-preview";
import type { ReactNode } from "react";

/**
 * Client-side providers that need to be above both dashboard and client route groups.
 * Wraps children with ClientPreviewProvider so preview mode works across all routes.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <ClientPreviewProvider>{children}</ClientPreviewProvider>;
}

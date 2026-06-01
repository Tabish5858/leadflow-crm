"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ClientPortalSettings } from "@/types";
import { DEFAULT_CLIENT_PORTAL_SETTINGS } from "@/types";

export interface ClientPortalContextValue {
  settings: ClientPortalSettings;
  /** Check if a specific module is enabled (respects master toggle + module toggle) */
  isModuleEnabled: (moduleKey: keyof ClientPortalSettings["modules"]) => boolean;
  /** Check if the portal itself is enabled */
  isPortalEnabled: boolean;
}

const ClientPortalContext = createContext<ClientPortalContextValue | null>(null);

export function ClientPortalProvider({
  settings,
  children,
}: {
  settings: ClientPortalSettings | null;
  children: ReactNode;
}) {
  const merged: ClientPortalSettings = {
    ...(DEFAULT_CLIENT_PORTAL_SETTINGS as ClientPortalSettings),
    ...settings,
    modules: {
      ...(DEFAULT_CLIENT_PORTAL_SETTINGS.modules as ClientPortalSettings["modules"]),
      ...(settings?.modules || {}),
    },
    welcomeCard: {
      ...(DEFAULT_CLIENT_PORTAL_SETTINGS.welcomeCard as ClientPortalSettings["welcomeCard"]),
      ...(settings?.welcomeCard || {}),
    },
    checklist: {
      ...(DEFAULT_CLIENT_PORTAL_SETTINGS.checklist as ClientPortalSettings["checklist"]),
      ...(settings?.checklist || {}),
    },
  };

  const value: ClientPortalContextValue = {
    settings: merged,
    isPortalEnabled: merged.enabled,
    isModuleEnabled: (moduleKey) => {
      return merged.enabled && merged.modules[moduleKey] !== false;
    },
  };

  return (
    <ClientPortalContext.Provider value={value}>
      {children}
    </ClientPortalContext.Provider>
  );
}

export function useClientPortal(): ClientPortalContextValue {
  const ctx = useContext(ClientPortalContext);
  if (!ctx) {
    throw new Error("useClientPortal must be used within a ClientPortalProvider");
  }
  return ctx;
}

"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface ClientUserData {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  clientWorkspaceId: string;
  workspaceName: string;
}

interface ClientUserContextValue {
  clientUser: ClientUserData;
}

const ClientUserContext = createContext<ClientUserContextValue | null>(null);

export function ClientUserProvider({
  clientUser,
  children,
}: {
  clientUser: ClientUserData;
  children: ReactNode;
}) {
  return (
    <ClientUserContext.Provider value={{ clientUser }}>
      {children}
    </ClientUserContext.Provider>
  );
}

export function useClientUser(): ClientUserData {
  const ctx = useContext(ClientUserContext);
  if (!ctx) {
    throw new Error("useClientUser must be used within a ClientUserProvider");
  }
  return ctx.clientUser;
}

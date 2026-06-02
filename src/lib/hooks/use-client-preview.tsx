"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

interface ClientPreviewContextType {
  isPreviewing: boolean;
  previewClientId: string | null;
  previewClientName: string;
  enterPreview: (clientId: string, clientName: string) => void;
  exitPreview: () => void;
}

const ClientPreviewContext = createContext<ClientPreviewContextType | null>(null);

export function ClientPreviewProvider({ children }: { children: ReactNode }) {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewClientId, setPreviewClientId] = useState<string | null>(null);
  const [previewClientName, setPreviewClientName] = useState("");

  const enterPreview = useCallback((clientId: string, clientName: string) => {
    setPreviewClientId(clientId);
    setPreviewClientName(clientName);
    setIsPreviewing(true);
    // Store in sessionStorage so it persists across navigation
    if (typeof window !== "undefined") {
      sessionStorage.setItem("leadflow_client_preview", JSON.stringify({ clientId, clientName }));
    }
  }, []);

  const exitPreview = useCallback(() => {
    setIsPreviewing(false);
    setPreviewClientId(null);
    setPreviewClientName("");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("leadflow_client_preview");
    }
  }, []);

  // Restore from sessionStorage on mount
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("leadflow_client_preview");
      if (stored) {
        try {
          const { clientId, clientName } = JSON.parse(stored);
          setPreviewClientId(clientId);
          setPreviewClientName(clientName);
          setIsPreviewing(true);
        } catch {
          // Invalid stored data - skip
        }
      }
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <ClientPreviewContext.Provider value={{ isPreviewing, previewClientId, previewClientName, enterPreview, exitPreview }}>
      {children}
    </ClientPreviewContext.Provider>
  );
}

export function useClientPreview() {
  const ctx = useContext(ClientPreviewContext);
  if (!ctx) return { isPreviewing: false, previewClientId: null, previewClientName: "", enterPreview: () => {}, exitPreview: () => {} };
  return ctx;
}

"use client";

import { useClientUser } from "@/contexts/client-user-context";
import { getContracts } from "@/lib/firebase/contracts";
import type { Contract } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleGuard } from "@/components/client/module-guard";
import { PageHeader, ErrorState } from "@/components/client/module-layout";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  FileSignature,
  FileCheck,
  Download,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  signed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Received",
  signed: "Signed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

function formatDate(ts: { toDate?: () => Date; seconds?: number } | null | undefined) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date((ts.seconds || 0) * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ClientContractsPage() {
  const { clientWorkspaceId, uid } = useClientUser();
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!clientWorkspaceId) return;
    setLoading(true);
    getContracts(clientWorkspaceId, { max: 100 })
      .then(setContracts)
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  }, [clientWorkspaceId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contracts;
    const q = search.toLowerCase();
    return contracts.filter(
      (c) => c.contractTitle.toLowerCase().includes(q)
    );
  }, [contracts, search]);

  if (error) {
    return (
      <div>
        <PageHeader title="Contracts" description="Documents requiring your review or signature" />
        <ErrorState message={error.message} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  // Filter out drafts for client view
  const clientContracts = filtered.filter((c) => c.status !== "draft");

  return (
    <div>
      <PageHeader
        title="Contracts"
        description={
          loading ? "Loading..." : `${clientContracts.length} document${clientContracts.length !== 1 ? "s" : ""}`
        }
      />

      {!loading && clientContracts.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contracts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-8 mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : clientContracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">
              {search ? "No matching contracts" : "No contracts yet"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {search
                ? "Try a different search term."
                : "Contracts and proposals sent to you will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div>Document</div>
            <div>Status</div>
            <div>Received</div>
            <div></div>
          </div>
          {clientContracts.map((contract) => (
            <div
              key={contract.id}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 border-t hover:bg-muted/30 cursor-pointer transition-colors items-center"
              onClick={() => router.push(`/client/contracts/${contract.id}`)}
            >
              <div>
                <p className="text-sm font-medium">{contract.contractTitle}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {contract.type === "proposal" ? (
                    <FileCheck className="h-3.5 w-3.5 text-purple-500" />
                  ) : (
                    <FileSignature className="h-3.5 w-3.5 text-blue-500" />
                  )}
                  <span className="text-xs text-muted-foreground capitalize">{contract.type}</span>
                </div>
              </div>
              <div>
                <Badge
                  variant="outline"
                  className={`${
                    contract.status === "sent"
                      ? "bg-blue-100 text-blue-700"
                      : contract.status === "signed"
                      ? "bg-green-100 text-green-700"
                      : contract.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                  } text-xs`}
                >
                  {STATUS_LABELS[contract.status] || contract.status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDate(contract.dateSent || contract.createdAt)}
              </div>
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const { generateContractPdf } = await import('@/lib/pdf-contract');

                      // Format Firestore Timestamps to strings before passing to PDF
                      const rawSigners = contract.signers || [];
                      const signers = rawSigners.map((s) => {
                        const sa = s.signedAt;
                        let signedAtStr = '';
                        if (sa && typeof sa === 'object' && 'seconds' in sa) {
                          const ts = sa as { seconds: number; nanoseconds?: number };
                          signedAtStr = new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          });
                        } else if (typeof sa === 'string') {
                          signedAtStr = sa;
                        }
                        return {
                          name: s.name || '',
                          email: s.email || '',
                          status: s.status || 'pending',
                          signedAt: signedAtStr,
                        };
                      });

                      const rawDateSent = contract.dateSent;
                      let dateSentStr = '';
                      if (rawDateSent && typeof rawDateSent === 'object' && 'toDate' in rawDateSent) {
                        dateSentStr = (rawDateSent as { toDate: () => Date }).toDate().toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        });
                      }

                      const blob = await generateContractPdf({
                        title: contract.contractTitle || 'Contract',
                        type: contract.type || 'contract',
                        status: contract.status || 'sent',
                        content: contract.content || '',
                        signers,
                        dateSent: dateSentStr,
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${contract.contractTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      console.error('PDF generation failed', err);
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClientContractsPageWrapper() {
  return (
    <ModuleGuard moduleKey="contracts">
      <ClientContractsPage />
    </ModuleGuard>
  );
}

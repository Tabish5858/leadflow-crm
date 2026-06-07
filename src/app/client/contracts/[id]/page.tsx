"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClientUser } from "@/contexts/client-user-context";
import { getContract, signContract, rejectContract, updateContract } from "@/lib/firebase/contracts";
import { Timestamp } from "firebase/firestore";
import type { Contract } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ModuleGuard } from "@/components/client/module-guard";
import { PageHeader, ErrorState } from "@/components/client/module-layout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import {
  ArrowLeft,
  Check,
  X,
  Loader2,
  Signature,
  FileSignature,
  FileText,
} from "lucide-react";

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-blue-100 text-blue-700",
  signed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  sent: "Pending Review",
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

function ClientContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { uid } = useClientUser();

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [signing, setSigning] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getContract(id);
      if (!data) {
        setError(new Error("Contract not found"));
        return;
      }
      // Redirect drafts away
      if (data.status === "draft") {
        toast.error("This contract is not yet available");
        router.push("/client/contracts");
        return;
      }
      setContract(data);

      // Record view activity (fire-and-forget)
      if (data.status === "sent" && uid) {
        const viewActivity = {
          type: "viewed" as const,
          userId: uid,
          userName: uid,
          timestamp: Timestamp.now(),
          details: "Viewed by client",
        };
        updateContract(data.id, {
          activities: [...(data.activities || []), viewActivity],
        } as Partial<Contract>).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to load contract"));
    } finally {
      setLoading(false);
    }
  }, [id, router, uid]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSign = async () => {
    if (!contract || !uid) return;
    setSigning(true);
    try {
      // Find the signer by matching uid in the signers list
      const matchingSigner = contract.signers?.find((s) => s.email === uid || s.id.includes(uid));
      const signerId = matchingSigner?.id || `signer-${uid}`;
      await signContract(contract.id, signerId, uid);
      toast.success("Document signed successfully");
      setShowSignDialog(false);
      load();
    } catch {
      toast.error("Failed to sign");
    } finally {
      setSigning(false);
    }
  };

  const handleReject = async () => {
    if (!contract) return;
    setSigning(true);
    try {
      const matchingSigner = contract.signers?.find((s) => s.email === uid || s.id.includes(uid));
      await rejectContract(contract.id, rejectReason, {
        userId: uid,
        userName: matchingSigner?.name || uid,
      });
      toast.success("Document rejected");
      setShowRejectDialog(false);
      load();
    } catch {
      toast.error("Failed to reject");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Contract" description="Loading..." />
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div>
        <PageHeader title="Contract" description="" />
        <ErrorState
          message={error?.message || "Contract not found"}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const canAct = contract.status === "sent";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.push("/client/contracts")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{contract.contractTitle}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={`${STATUS_STYLES[contract.status] || "bg-gray-100 text-gray-700"} text-xs`}
                >
                  {STATUS_LABELS[contract.status] || contract.status}
                </Badge>
                <span className="text-xs text-muted-foreground capitalize">{contract.type}</span>
                {contract.dateSent && (
                  <span className="text-xs text-muted-foreground">
                    Received {formatDate(contract.dateSent)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {canAct && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-red-600 border-red-200 hover:bg-accent hover:text-red-700"
              onClick={() => setShowRejectDialog(true)}
            >
              <X className="h-4 w-4" />
              Decline
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setShowSignDialog(true)}>
              <Signature className="h-4 w-4" />
              {contract.type === "proposal" ? "Approve" : "Sign"}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-6">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: contract.content || "<p>No content yet.</p>" }}
          />
        </CardContent>
      </Card>

      {/* Signers */}
      {contract.signers && contract.signers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Signers</h3>
            <div className="space-y-2">
              {contract.signers.map((signer) => (
                <div key={signer.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{signer.name}</p>
                    <p className="text-xs text-muted-foreground">{signer.email}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      signer.status === "signed"
                        ? "bg-green-100 text-green-700"
                        : signer.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {signer.status === "signed" && <Check className="h-3 w-3 mr-1" />}
                    {signer.status.charAt(0).toUpperCase() + signer.status.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sign Dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{contract.type === "proposal" ? "Approve Proposal" : "Sign Contract"}</DialogTitle>
            <DialogDescription>
              By {contract.type === "proposal" ? "approving" : "signing"}, you agree to the terms and conditions outlined in this document.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <div className="flex flex-col items-center gap-2">
              <Signature className="h-16 w-16 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Your digital signature</p>
              <p className="text-xs text-muted-foreground">You are signing as the authorized recipient</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSign} disabled={signing}>
              {signing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {contract.type === "proposal" ? "Approve & Sign" : "Sign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Decline Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this {contract.type}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={signing}
            >
              {signing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ClientContractDetailWrapper({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ModuleGuard moduleKey="contracts">
      <ClientContractDetailPage params={params} />
    </ModuleGuard>
  );
}

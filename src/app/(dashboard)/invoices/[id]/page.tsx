"use client";

import { useWorkspace } from "@/contexts/workspace-context";
import {
  getInvoice,
  updateInvoice,
  deleteInvoice,
  approvePaymentProof,
  rejectPaymentProof,
} from "@/lib/firebase/invoices";
import { getProject } from "@/lib/firebase/projects";
import { getWorkspaceMembers } from "@/lib/firebase/workspaces";
import type { Invoice, InvoiceStatus, WorkspaceMember } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronLeft,
  FileText,
  Loader2,
  Send,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-muted text-muted-foreground",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["paid", "cancelled"],
  paid: [],
  overdue: ["paid", "cancelled"],
  cancelled: [],
  partial: ["paid"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

function formatDate(date: Date | null): string {
  if (!date) return "Not set";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { activeWorkspace, user } = useWorkspace();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [showReviewDialog, setShowReviewDialog] = useState<"approve" | "reject" | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const loadInvoice = useCallback(async () => {
    if (!activeWorkspace?.id || !invoiceId) return;
    setLoading(true);
    setError(null);
    try {
      const [data, memberData] = await Promise.all([
        getInvoice(invoiceId),
        getWorkspaceMembers(activeWorkspace.id),
      ]);
      if (!data) {
        setError("Invoice not found");
        return;
      }
      setInvoice(data);
      setMembers(memberData);
    } catch {
      setError("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, invoiceId]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  // Fetch project name when invoice loads
  useEffect(() => {
    if (!invoice?.projectId) { setProjectName(null); return; }
    getProject(invoice.projectId)
      .then((p) => setProjectName(p?.name ?? null))
      .catch(() => setProjectName(null));
  }, [invoice?.projectId]);

  const client = useMemo(
    () => members.find((m) => m.userId === invoice?.clientId),
    [members, invoice?.clientId]
  );

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!invoice || updating) return;
    setUpdating(true);
    try {
      await updateInvoice(invoice.id, { status: newStatus });
      setInvoice((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              paidDate: newStatus === "paid" ? ({ toDate: () => new Date() } as Invoice["paidDate"]) : prev.paidDate,
            }
          : prev
      );
      toast.success(`Invoice marked as ${newStatus}`);
    } catch {
      toast.error("Failed to update invoice");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    setDeleting(true);
    try {
      await deleteInvoice(invoice.id);
      toast.success("Invoice deleted");
      router.push("/invoices");
    } catch {
      toast.error("Failed to delete invoice");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-destructive">{error || "Invoice not found"}</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/invoices">Back to Invoices</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[invoice.status] || STATUS_STYLES.draft;
  const availableTransitions = TRANSITIONS[invoice.status] || [];

  // ── Button label map ──
  const transitionLabels: Record<string, string> = {
    sent: "Send Invoice",
    paid: "Mark as Paid",
    cancelled: "Cancel Invoice",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Invoices
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">{invoice.invoiceNumber}</h1>
            <Badge variant="outline" className={cn("text-xs", statusStyle)}>
              {invoice.status === "sent" && invoice.dueDate?.toDate() < new Date()
                ? "Overdue"
                : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {client?.displayName || "Unknown client"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {availableTransitions.map((status) => (
            <Button
              key={status}
              variant={status === "cancelled" ? "outline" : "default"}
              size="sm"
              onClick={() => handleStatusChange(status)}
              disabled={updating}
              className="gap-2"
            >
              {status === "paid" && <CheckCircle2 className="h-4 w-4" />}
              {status === "sent" && <Send className="h-4 w-4" />}
              {status === "cancelled" && <XCircle className="h-4 w-4" />}
              {transitionLabels[status] || status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
          {(invoice.status === "paid" || invoice.status === "cancelled") && (
            <Button variant="outline" size="sm" disabled>
              No actions available
            </Button>
          )}
          {invoice.status === "draft" && (
            <Button
              variant="outline"
              size="icon"
              className="text-destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {invoice.invoiceNumber}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Issued: {formatDate(invoice.issueDate?.toDate())}
              {invoice.dueDate && <> &middot; Due: {formatDate(invoice.dueDate?.toDate())}</>}
              {invoice.paidDate && <> &middot; Paid: {formatDate(invoice.paidDate?.toDate())}</>}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bill To */}
          {client && (
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Bill To</p>
              <p className="text-sm font-medium">{client.displayName}</p>
              <p className="text-sm text-muted-foreground">{client.email}</p>
              {projectName && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Project: {projectName}
                </p>
              )}
            </div>
          )}

          <Separator />

          {/* Line Items Table */}
          <div>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 text-xs text-muted-foreground font-medium mb-2 px-1">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit Price</span>
              <span className="text-right">Total</span>
            </div>
            <div className="space-y-1">
              {invoice.lineItems.map((item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 rounded-lg bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="truncate">{item.description}</span>
                  <span className="text-right">{item.quantity}</span>
                  <span className="text-right">{formatCurrency(item.unitPrice, invoice.currency)}</span>
                  <span className="text-right font-medium">{formatCurrency(item.total, invoice.currency)}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1.5 max-w-xs ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({invoice.taxRate}%)</span>
              <span>{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
            </div>
            {invoice.discount && invoice.discount.amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Discount
                  {invoice.discount.type === "percentage"
                    ? ` (${invoice.discount.amount}%)`
                    : ""}
                </span>
                <span className="text-green-600">
                  -{formatCurrency(
                    invoice.discount.type === "percentage"
                      ? invoice.subtotal * (invoice.discount.amount / 100)
                      : Math.min(invoice.discount.amount, invoice.subtotal + invoice.taxAmount),
                    invoice.currency
                  )}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
            {invoice.paidDate && (
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span>Paid</span>
                <span>{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {invoice.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            </>
          )}

          {/* Payment Proof */}
          {invoice.paymentProof && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Payment Proof</p>
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{invoice.paymentProof.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded{" "}
                      {invoice.paymentProof.uploadedAt.toDate().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    {invoice.paymentProof.status === "pending" && (
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs mt-1">
                        Pending Review
                      </Badge>
                    )}
                    {invoice.paymentProof.status === "approved" && (
                      <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs mt-1">
                        Approved
                      </Badge>
                    )}
                    {invoice.paymentProof.status === "rejected" && (
                      <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs mt-1">
                        Rejected
                      </Badge>
                    )}
                    {invoice.paymentProof.reviewNotes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Review notes: {invoice.paymentProof.reviewNotes}
                      </p>
                    )}
                  </div>
                  {invoice.paymentProof.filePath && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={invoice.paymentProof.filePath} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4 mr-1" />
                        View
                      </a>
                    </Button>
                  )}
                </div>
                {invoice.paymentProof.status === "pending" && (
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setShowReviewDialog("approve")}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      Approve Payment
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive"
                      onClick={() => setShowReviewDialog("reject")}
                    >
                      <ThumbsDown className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog
        open={showReviewDialog !== null}
        onOpenChange={(open) => { if (!open) { setShowReviewDialog(null); setReviewNotes(""); } }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {showReviewDialog === "approve" ? "Approve Payment" : "Reject Payment Proof"}
            </DialogTitle>
            <DialogDescription>
              {showReviewDialog === "approve"
                ? "This will mark the invoice as paid and confirm the payment proof."
                : "Reject the payment proof so the client can upload a corrected version."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="review-notes">Notes (optional)</Label>
            <Textarea
              id="review-notes"
              placeholder={showReviewDialog === "approve" ? "Approval notes..." : "Reason for rejection..."}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowReviewDialog(null); setReviewNotes(""); }}>
              Cancel
            </Button>
            <Button
              variant={showReviewDialog === "approve" ? "default" : "destructive"}
              onClick={async () => {
                if (!invoice) return;
                setReviewing(true);
                try {
                  if (showReviewDialog === "approve") {
                    await approvePaymentProof(invoice.id, user?.id || "", reviewNotes || undefined);
                    setInvoice((prev) =>
                      prev ? { ...prev, status: "paid", paidDate: { toDate: () => new Date() } as Invoice["paidDate"], paymentProof: { ...prev.paymentProof!, status: "approved", reviewedBy: user?.id, reviewedAt: { toDate: () => new Date() } as any } } : prev
                    );
                    toast.success("Payment approved — invoice marked as paid");
                  } else {
                    await rejectPaymentProof(invoice.id, user?.id || "", reviewNotes || undefined);
                    setInvoice((prev) =>
                      prev ? { ...prev, paymentProof: { ...prev.paymentProof!, status: "rejected", reviewedBy: user?.id, reviewedAt: { toDate: () => new Date() } as any } } : prev
                    );
                    toast.success("Payment proof rejected");
                  }
                } catch {
                  toast.error("Failed to review payment proof");
                } finally {
                  setReviewing(false);
                  setShowReviewDialog(null);
                  setReviewNotes("");
                }
              }}
              disabled={reviewing}
            >
              {reviewing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{showReviewDialog === "approve" ? "Approving..." : "Rejecting..."}</>
              ) : (
                showReviewDialog === "approve" ? "Approve & Mark Paid" : "Reject Proof"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Invoice?</DialogTitle>
            <DialogDescription>
              This will permanently delete invoice {invoice.invoiceNumber}. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Invoice"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

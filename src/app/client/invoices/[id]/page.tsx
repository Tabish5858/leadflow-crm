"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useClientUser } from "@/contexts/client-user-context";
import { getApiAuthHeaders } from "@/lib/api/client";
import { db } from "@/lib/firebase/client";
import { submitPaymentProof } from "@/lib/firebase/invoices";
import type { Invoice } from "@/types";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  BackButton,
  ErrorState,
  SkeletonCard,
} from "@/components/client/module-layout";

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  sent: "Unpaid",
  overdue: "Overdue",
  draft: "Draft",
  cancelled: "Cancelled",
  partial: "Partial",
  pending_review: "Pending Review",
};

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  sent: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  draft: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  pending_review: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

export default function ClientInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { clientWorkspaceId, uid } = useClientUser();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ── Payment proof upload ──
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // ── Load invoice with real-time updates ──
  useEffect(() => {
    if (!clientWorkspaceId || !id || !uid) return;
    setLoading(true);

    // Verify access first
    getDoc(doc(db, "invoices", id))
      .then((snap) => {
        if (!snap.exists()) {
          setError(new Error("Invoice not found"));
          return false;
        }
        const data = { id: snap.id, ...snap.data() } as Invoice;
        if (data.workspaceId !== clientWorkspaceId || data.clientId !== uid) {
          setError(new Error("You don't have access to this invoice"));
          return false;
        }
        return true;
      })
      .then((authorized) => {
        if (!authorized) { setLoading(false); return; }

        // Real-time listener for status/payment proof updates
        const unsub = onSnapshot(
          doc(db, "invoices", id),
          (snap) => {
            if (!snap.exists()) {
              setError(new Error("Invoice not found"));
              setLoading(false);
              return;
            }
            setInvoice({ id: snap.id, ...snap.data() } as Invoice);
            setLoading(false);
          },
          (err) => {
            setError(err);
            setLoading(false);
          }
        );
        return () => unsub();
      })
      .catch((e) => {
        setError(e);
        setLoading(false);
      });
  }, [clientWorkspaceId, id, uid]);

  // ── Redirect draft invoices ──
  useEffect(() => {
    if (invoice && invoice.status === "draft") {
      router.replace("/client/invoices");
    }
  }, [invoice, router]);

  // ── Upload payment proof ──
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !invoice || !clientWorkspaceId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", clientWorkspaceId);

      const headers = await getApiAuthHeaders(clientWorkspaceId);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { ...headers, "x-workspace-id": clientWorkspaceId },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Upload failed");
      }

      const result = await res.json();

      await submitPaymentProof(invoice.id, uid!, {
        fileName: result.fileName || file.name,
        filePath: result.url || result.cloudinaryUrl,
        fileSize: file.size,
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div>
        <BackButton href="/client/invoices" />
        <SkeletonCard className="mb-4" />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div>
        <BackButton href="/client/invoices" />
        <ErrorState
          message={error?.message || "Invoice not found"}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  // Don't render draft invoices (redirect will fire)
  if (invoice.status === "draft") return null;

  const canUploadProof =
    invoice.status === "sent" || invoice.status === "overdue";
  const isPendingReview = invoice.status === "pending_review";
  const proof = invoice.paymentProof;

  return (
    <div>
      <BackButton href="/client/invoices" />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Invoice {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Issued{" "}
              {invoice.issueDate.toDate().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={STATUS_STYLES[invoice.status] || ""}
            >
              {invoice.status === "sent" &&
              invoice.dueDate.toDate() < new Date()
                ? "Overdue"
                : STATUS_LABELS[invoice.status] ||
                  invoice.status.charAt(0).toUpperCase() +
                    invoice.status.slice(1)}
            </Badge>
            {invoice.pdfUrl && (
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a
                  href={invoice.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Invoice details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Due Date</p>
              <p className="font-medium">
                {invoice.dueDate.toDate().toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Status</p>
              <p className="font-medium capitalize">
                {invoice.status === "sent" &&
                invoice.dueDate.toDate() < new Date()
                  ? "Overdue"
                  : STATUS_LABELS[invoice.status] || invoice.status}
              </p>
            </div>
            {invoice.paidDate && (
              <div>
                <p className="text-muted-foreground mb-1">Paid Date</p>
                <p className="font-medium">
                  {invoice.paidDate.toDate().toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Proof Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-4">
            {formatCurrency(invoice.total, invoice.currency)}
          </div>

          {invoice.status === "paid" ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span>Paid</span>
              {proof && (
                <span className="text-muted-foreground ml-2">
                  &middot; {proof.fileName}
                </span>
              )}
            </div>
          ) : isPendingReview && proof ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="h-5 w-5" />
                <span>Payment proof submitted — awaiting review</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{proof.fileName}</span>
                <Button variant="outline" size="sm" asChild>
                  <a href={proof.filePath} target="_blank" rel="noopener noreferrer">
                    View
                  </a>
                </Button>
              </div>
            </div>
          ) : proof?.status === "rejected" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-5 w-5" />
                <span>Payment proof rejected</span>
              </div>
              {proof.reviewNotes && (
                <p className="text-sm text-muted-foreground">
                  Reason: {proof.reviewNotes}
                </p>
              )}
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-2">
                  Please upload a corrected payment proof.
                </p>
                <UploadPaymentProofButton
                  uploading={uploading}
                  onUpload={() => fileRef.current?.click()}
                />
              </div>
            </div>
          ) : canUploadProof ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pay via bank transfer or other method, then upload your payment
                receipt or proof for the admin to verify.
              </p>
              <UploadPaymentProofButton
                uploading={uploading}
                onUpload={() => fileRef.current?.click()}
              />
            </div>
          ) : null}
        </CardContent>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </Card>

      {/* Line items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium text-right">Qty</th>
                <th className="pb-2 font-medium text-right">Unit Price</th>
                <th className="pb-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">
                    {formatCurrency(item.unitPrice, invoice.currency)}
                  </td>
                  <td className="py-2 text-right font-medium">
                    {formatCurrency(item.total, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Separator className="my-4" />

          {/* Totals */}
          <div className="space-y-1 text-sm ml-auto w-64">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Tax ({(invoice.taxRate * 100).toFixed(1)}%)
              </span>
              <span>{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
            </div>
            {invoice.discount && invoice.discount.amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Discount
                  {invoice.discount.type === "percentage"
                    ? ` (${invoice.discount.amount}%)`
                    : ""}
                </span>
                <span className="text-green-600">
                  -
                  {formatCurrency(
                    invoice.discount.type === "percentage"
                      ? invoice.subtotal * (invoice.discount.amount / 100)
                      : Math.min(
                          invoice.discount.amount,
                          invoice.subtotal + invoice.taxAmount
                        ),
                    invoice.currency
                  )}
                </span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {invoice.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Upload button sub-component ─────────────────────────────────────────────

function UploadPaymentProofButton({
  uploading,
  onUpload,
}: {
  uploading: boolean;
  onUpload: () => void;
}) {
  return (
    <Button onClick={onUpload} disabled={uploading} className="gap-2">
      {uploading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading...
        </>
      ) : (
        <>
          <Upload className="h-4 w-4" />
          Upload Payment Proof
        </>
      )}
    </Button>
  );
}

"use client";

import { useWorkspace } from "@/contexts/workspace-context";
import { createInvoice } from "@/lib/firebase/invoices";
import { getWorkspaceMembers } from "@/lib/firebase/workspaces";
import type { InvoiceLineItem, WorkspaceMember } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import { ChevronLeft, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewInvoicePage() {
  const router = useRouter();
  const { activeWorkspace, user } = useWorkspace();

  const [clients, setClients] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [clientId, setClientId] = useState("");
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);

  useEffect(() => {
    if (!activeWorkspace?.id) return;
    getWorkspaceMembers(activeWorkspace.id)
      .then((m) => setClients(m.filter((m) => m.role === "client")))
      .catch(() => toast.error("Failed to load clients"))
      .finally(() => setLoading(false));
  }, [activeWorkspace?.id]);

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

      // Recompute total
      const qty = typeof next[index].quantity === "string"
        ? parseFloat(next[index].quantity as string) || 0
        : next[index].quantity;
      const price = typeof next[index].unitPrice === "string"
        ? parseFloat(next[index].unitPrice as string) || 0
        : next[index].unitPrice;
      next[index].total = qty * price;

      return next;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * (parseFloat(taxRate) / 100);
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace?.id || !user?.id) return;
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }
    if (!lineItems.some((item) => item.description.trim() && item.total > 0)) {
      toast.error("Please add at least one valid line item");
      return;
    }

    setSubmitting(true);
    try {
      const id = await createInvoice(activeWorkspace.id, user.id, {
        clientId,
        lineItems: lineItems.filter((item) => item.description.trim()),
        taxRate: parseFloat(taxRate) || 0,
        notes: notes.trim() || null,
        currency: "USD",
      });
      toast.success("Invoice created");
      router.push(`/invoices/${id}`);
    } catch {
      toast.error("Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Invoices
      </Link>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>New Invoice</CardTitle>
            <CardDescription>Create an invoice for a client.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Selection */}
            <div className="space-y-2">
              <Label htmlFor="client">
                Client <span className="text-destructive">*</span>
              </Label>
              {clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No clients available. Invite clients to your workspace first.
                </p>
              ) : (
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Select a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.userId} value={client.userId}>
                        {client.displayName} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="gap-1">
                  <Plus className="h-3 w-3" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {lineItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-2 rounded-lg border p-3">
                    <div className="flex-1 space-y-2 min-w-0">
                      <Input
                        placeholder="Description (e.g. Web Design Service)"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, "description", e.target.value)}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <div className="w-20">
                          <Input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, "quantity", parseInt(e.target.value) || 0)}
                            className="text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Unit price"
                            value={item.unitPrice}
                            onChange={(e) => updateLineItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="text-sm"
                          />
                        </div>
                        <div className="w-24 flex items-center justify-end">
                          <span className="text-sm font-medium">{formatCurrency(item.total)}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-destructive"
                          onClick={() => removeLineItem(index)}
                          disabled={lineItems.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2 max-w-xs ml-auto">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Tax</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="h-7 w-16 text-xs text-right"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <span className="text-sm">{formatCurrency(tax)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Payment terms, additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="outline" type="button" asChild>
            <Link href="/invoices">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting || !clientId}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Invoice"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

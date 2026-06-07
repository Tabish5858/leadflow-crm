"use client";

import { useWorkspace } from "@/contexts/workspace-context";
import { createInvoice, generateInvoiceNumber } from "@/lib/firebase/invoices";
import { getProjects } from "@/lib/firebase/projects";
import { getWorkspaceMembers } from "@/lib/firebase/workspaces";
import type { InvoiceDiscount, InvoiceLineItem, WorkspaceMember } from "@/types";

// ─── Local type for project data (Project type not exported from @/types) ────
interface SelectableProject {
  id: string;
  name: string;
  clients: string[];
}
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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";
import {
  Calendar,
  ChevronLeft,
  Hash,
  Loader2,
  Percent,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

function toDateInputValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ─── Form Helpers ─────────────────────────────────────────────────────────────

function computeFinancials(
  lineItems: InvoiceLineItem[],
  taxRate: number,
  discount: InvoiceDiscount | null
) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = subtotal * (taxRate / 100);

  let discountAmount = 0;
  if (discount && discount.amount > 0) {
    if (discount.type === "percentage") {
      discountAmount = subtotal * (discount.amount / 100);
    } else {
      discountAmount = Math.min(discount.amount, subtotal + taxAmount);
    }
  }

  const total = subtotal + taxAmount - discountAmount;

  return { subtotal, taxAmount, discountAmount, total };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DEFAULT_TERMS = 30; // days

export default function NewInvoicePage() {
  const router = useRouter();
  const { activeWorkspace, user } = useWorkspace();

  // ── Data ────────────────────────────────────────────────────────────────────
  const [clients, setClients] = useState<WorkspaceMember[]>([]);
  const [projects, setProjects] = useState<SelectableProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ── Invoice number ──────────────────────────────────────────────────────────
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // ── Form state ──────────────────────────────────────────────────────────────
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [issueDate, setIssueDate] = useState(toDateInputValue(new Date()));
  const [dueDate, setDueDate] = useState(toDateInputValue(addDays(new Date(), DEFAULT_TERMS)));
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);

  // ── Discount ────────────────────────────────────────────────────────────────
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountAmount, setDiscountAmount] = useState("0");

  const discount: InvoiceDiscount | null = useMemo(() => {
    if (!showDiscount || parseFloat(discountAmount) <= 0) return null;
    return { type: discountType, amount: parseFloat(discountAmount) || 0 };
  }, [showDiscount, discountType, discountAmount]);

  // ── Load initial data ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeWorkspace?.id) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [memberData, projectData] = await Promise.all([
          getWorkspaceMembers(activeWorkspace.id),
          getProjects(activeWorkspace.id),
        ]);
        if (cancelled) return;
        setClients(memberData.filter((m) => m.role === "client"));
        setProjects(projectData);
      } catch {
        if (!cancelled) toast.error("Failed to load clients or projects");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Fetch invoice number separately to avoid blocking the form
    generateInvoiceNumber(activeWorkspace.id)
      .then((num) => { if (!cancelled) setInvoiceNumber(num); })
      .catch(() => { /* invoice number is non-critical; user can see it after save */ });

    load();
    return () => { cancelled = true; };
  }, [activeWorkspace?.id]);

  // ── Projects filtered by selected client ────────────────────────────────────
  const clientProjects = useMemo(
    () => projects.filter((p) => p.clients.includes(clientId)),
    [projects, clientId]
  );

  // ── When client changes, reset project selection ────────────────────────────
  useEffect(() => {
    setProjectId("");
  }, [clientId]);

  // ── When issue date changes, auto-update due date ───────────────────────────
  useEffect(() => {
    const parsed = new Date(issueDate + "T12:00:00");
    if (!isNaN(parsed.getTime())) {
      setDueDate(toDateInputValue(addDays(parsed, DEFAULT_TERMS)));
    }
  }, [issueDate]);

  // ── Line item helpers ──────────────────────────────────────────────────────
  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      const qty = Number(next[index].quantity) || 0;
      const price = Number(next[index].unitPrice) || 0;
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

  // ── Financials ─────────────────────────────────────────────────────────────
  const { subtotal, taxAmount, discountAmount: discAmount, total } = useMemo(
    () => computeFinancials(lineItems, parseFloat(taxRate) || 0, discount),
    [lineItems, taxRate, discount]
  );

  // ── Submit ──────────────────────────────────────────────────────────────────
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
        projectId: projectId || null,
        invoiceNumber,
        lineItems: lineItems.filter((item) => item.description.trim()),
        taxRate: parseFloat(taxRate) || 0,
        discount: discount ?? undefined,
        currency: "USD",
        notes: notes.trim() || null,
        issueDate: new Date(issueDate + "T12:00:00"),
        dueDate: new Date(dueDate + "T12:00:00"),
      });
      toast.success("Invoice created");
      router.push(`/invoices/${id}`);
    } catch {
      toast.error("Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>New Invoice</CardTitle>
                <CardDescription>Create an invoice for a client.</CardDescription>
              </div>
              {/* Invoice number badge */}
              {invoiceNumber && (
                <div className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-3 py-1.5 text-sm font-medium">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  {invoiceNumber}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ── Client Selection ──────────────────────────────────────────── */}
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

            {/* ── Project Selection ─────────────────────────────────────────── */}
            <div className="space-y-2">
              <Label htmlFor="project">Project (optional)</Label>
              <Select value={projectId} onValueChange={setProjectId} disabled={!clientId}>
                <SelectTrigger id="project">
                  <SelectValue
                    placeholder={clientId ? "Select a project..." : "Select a client first"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {clientProjects.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No projects for this client
                    </div>
                  ) : (
                    clientProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* ── Dates ─────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issue-date" className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Issue Date
                </Label>
                <Input
                  id="issue-date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-date" className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Due Date
                </Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={issueDate}
                />
              </div>
            </div>

            <Separator />

            {/* ── Line Items ────────────────────────────────────────────────── */}
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

            {/* ── Totals & Tax & Discount ───────────────────────────────────── */}
            <div className="space-y-2 max-w-xs ml-auto">
              {/* Subtotal */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              {/* Tax */}
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
                <span className="text-sm">{formatCurrency(taxAmount)}</span>
              </div>

              {/* Discount */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Discount</span>
                    <Switch
                      checked={showDiscount}
                      onCheckedChange={setShowDiscount}
                      className="scale-75"
                    />
                  </div>
                  {showDiscount && (
                    <span className="text-sm text-green-600">-{formatCurrency(discAmount)}</span>
                  )}
                </div>
                {showDiscount && (
                  <div className="flex items-center gap-2 pt-1">
                    <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}>
                      <SelectTrigger className="h-8 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          <span className="flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            Percentage
                          </span>
                        </SelectItem>
                        <SelectItem value="fixed">
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            Fixed
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      max={discountType === "percentage" ? 100 : undefined}
                      step={discountType === "percentage" ? "1" : "0.01"}
                      placeholder="Amount"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      className="h-8 flex-1 text-xs text-right"
                    />
                    {discountType === "fixed" && (
                      <span className="text-xs text-muted-foreground">USD</span>
                    )}
                    {discountType === "percentage" && (
                      <span className="text-xs text-muted-foreground">%</span>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Total */}
              <div className="flex items-center justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <Separator />

            {/* ── Notes ─────────────────────────────────────────────────────── */}
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

        {/* ── Actions ────────────────────────────────────────────────────────── */}
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

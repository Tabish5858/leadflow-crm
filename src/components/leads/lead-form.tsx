"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema, type LeadFormData } from "@/lib/schemas/lead";
import { useLeadStore } from "@/lib/stores/leadStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_PIPELINE_STAGES, LEAD_SOURCES, NICHES } from "@/lib/constants";
import { useState } from "react";
import { toast } from "@/lib/toast";
import type { CustomField } from "@/types";
import { Separator } from "@/components/ui/separator";
import { CountrySelect } from "@/components/ui/country-select";

interface LeadFormProps {
  onSuccess: () => void;
  userId: string;
  workspaceId: string;
  defaultValues?: Partial<LeadFormData>;
  customFields?: CustomField[];
  userName?: string;
}

export function LeadForm({ onSuccess, userId, workspaceId, defaultValues, customFields = [], userName }: LeadFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const addLead = useLeadStore((s) => s.addLead);
  // Default select custom fields to first option
  const initialCustomValues: Record<string, unknown> = {};
  for (const cf of customFields) {
    if (cf.type === "select" && cf.options && cf.options.length > 0) {
      initialCustomValues[cf.id] = cf.options[0];
    }
  }
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>(initialCustomValues);

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      firstName: defaultValues?.firstName || "",
      lastName: defaultValues?.lastName || "",
      email: defaultValues?.email || "",
      phone: defaultValues?.phone || "",
      company: defaultValues?.company || "",
      jobTitle: defaultValues?.jobTitle || "",
      status: defaultValues?.status || "new",
      source: defaultValues?.source || "",
      niche: defaultValues?.niche || "",
      country: defaultValues?.country || "",
      city: defaultValues?.city || "",
      website: defaultValues?.website || "",
      linkedin: defaultValues?.linkedin || "",
      value: defaultValues?.value || 0,
      expectedCloseAt: defaultValues?.expectedCloseAt || "",
      currency: defaultValues?.currency || "USD",
      tags: defaultValues?.tags || [],
      notes: defaultValues?.notes || "",
    },
  });

  const onSubmit = async (data: LeadFormData) => {
    setSubmitting(true);
    try {
      // Validate required custom fields
      for (const field of customFields) {
        if (field.required && !customFieldValues[field.id]) {
          toast.error(`${field.name} is required`);
          setSubmitting(false);
          return;
        }
      }

      await addLead(workspaceId, userId, data, customFieldValues, userName);
      onSuccess();
    } catch {
      toast.error("Failed to create lead");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            {...form.register("firstName")}
            placeholder="John"
          />
          {form.formState.errors.firstName && (
            <p className="text-xs text-destructive">
              {form.formState.errors.firstName.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            {...form.register("lastName")}
            placeholder="Doe"
          />
          {form.formState.errors.lastName && (
            <p className="text-xs text-destructive">
              {form.formState.errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          {...form.register("email")}
          placeholder="john@example.com"
        />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...form.register("phone")} placeholder="+1 234 567 890" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input id="company" {...form.register("company")} placeholder="Acme Inc" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="jobTitle">Job Title</Label>
          <Input id="jobTitle" {...form.register("jobTitle")} placeholder="CEO" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select
            value={form.watch("status")}
            onValueChange={(v) => form.setValue("status", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_PIPELINE_STAGES.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Select
            value={form.watch("source")}
            onValueChange={(v) => form.setValue("source", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {LEAD_SOURCES.map((source) => (
                <SelectItem key={source} value={source}>
                  {source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="niche">Industry</Label>
          <Select
            value={form.watch("niche")}
            onValueChange={(v) => form.setValue("niche", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {NICHES.map((niche) => (
                <SelectItem key={niche} value={niche}>
                  {niche}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />
      <p className="text-sm font-medium text-muted-foreground">Location</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <CountrySelect
            value={form.watch("country") || ""}
            onChange={(v) => form.setValue("country", v)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" {...form.register("city")} placeholder="New York" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="value">Deal Value ($)</Label>
          <Input
            id="value"
            type="number"
            {...form.register("value", { valueAsNumber: true })}
            placeholder="5000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" {...form.register("website")} placeholder="https://example.com" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expectedCloseAt">Expected Close Date</Label>
          <Input
            id="expectedCloseAt"
            type="date"
            {...form.register("expectedCloseAt")}
          />
        </div>
        <div className="space-y-2">
          {/* spacer */ }
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          {...form.register("notes")}
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Internal notes about this lead..."
        />
      </div>

      {customFields.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Custom Fields</h3>
            {customFields
              .sort((a, b) => a.order - b.order)
              .map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={`cf-${field.id}`}>
                    {field.name}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {field.type === "text" && (
                    <Input
                      id={`cf-${field.id}`}
                      value={(customFieldValues[field.id] as string) || ""}
                      onChange={(e) =>
                        setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      placeholder={`Enter ${field.name.toLowerCase()}`}
                    />
                  )}
                  {field.type === "number" && (
                    <Input
                      id={`cf-${field.id}`}
                      type="number"
                      value={(customFieldValues[field.id] as string) || ""}
                      onChange={(e) =>
                        setCustomFieldValues((prev) => ({ ...prev, [field.id]: parseFloat(e.target.value) || 0 }))
                      }
                      placeholder={`Enter ${field.name.toLowerCase()}`}
                    />
                  )}
                  {field.type === "date" && (
                    <Input
                      id={`cf-${field.id}`}
                      type="date"
                      value={(customFieldValues[field.id] as string) || ""}
                      onChange={(e) =>
                        setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                    />
                  )}
                  {field.type === "select" && (
                    <Select
                      value={(customFieldValues[field.id] as string) || ""}
                      onValueChange={(v) =>
                        setCustomFieldValues((prev) => ({ ...prev, [field.id]: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${field.name.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {field.type === "multiselect" && (
                    <div className="flex flex-wrap gap-2">
                      {field.options?.map((option) => {
                        const selected = ((customFieldValues[field.id] as string[]) || []).includes(option);
                        return (
                          <Button
                            key={option}
                            type="button"
                            variant={selected ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const current = (customFieldValues[field.id] as string[]) || [];
                              const updated = selected
                                ? current.filter((v) => v !== option)
                                : [...current, option];
                              setCustomFieldValues((prev) => ({ ...prev, [field.id]: updated }));
                            }}
                          >
                            {option}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                  {field.type === "url" && (
                    <Input
                      id={`cf-${field.id}`}
                      type="url"
                      value={(customFieldValues[field.id] as string) || ""}
                      onChange={(e) =>
                        setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      placeholder="https://example.com"
                    />
                  )}
                  {field.type === "email" && (
                    <Input
                      id={`cf-${field.id}`}
                      type="email"
                      value={(customFieldValues[field.id] as string) || ""}
                      onChange={(e) =>
                        setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      placeholder="email@example.com"
                    />
                  )}
                </div>
              ))}
          </div>
        </>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onSuccess}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Lead"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import { getLead } from "@/lib/firebase/firestore";
import { logStatusChange } from "@/lib/firebase/activities";
import type { Lead } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeadStore } from "@/lib/stores/leadStore";
import { useWorkspace } from "@/contexts/workspace-context";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants";
import { formatCurrency, getInitials } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActivityTimeline } from "@/components/leads/activity-timeline";
import {
  Mail,
  Phone,
  Building2,
  Globe,
  Linkedin,
  MapPin,
  DollarSign,
  Clock,
  User,
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

type LeadStatusType =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Proposal"
  | "Negotiation"
  | "Won"
  | "Lost";

const statusLabelMap: Record<string, LeadStatusType> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

interface LeadDetailProps {
  leadId: string;
}

function LeadDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-4" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LeadDetail({ leadId }: LeadDetailProps) {
  const { user, activeWorkspace } = useWorkspace();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const updateStatus = useLeadStore((s) => s.updateStatus);

  useEffect(() => {
    setLoading(true);
    getLead(leadId)
      .then((data) => {
        setLead(data);
      })
      .finally(() => setLoading(false));
  }, [leadId]);

  const handleStatusChange = async (status: string) => {
    if (!lead) return;
    const fromStatus = lead.status;
    updateStatus(lead.id, status);
    setLead({ ...lead, status });

    // Log activity
    if (activeWorkspace && user) {
      try {
        await logStatusChange(lead.id, activeWorkspace.id, user.id, fromStatus, status);
      } catch {
        // Activity logging is non-critical
      }
    }

    const stages = activeWorkspace?.pipeline?.stages || DEFAULT_PIPELINE_STAGES;
    const stageName = stages.find((s) => s.id === status)?.name;
    toast.success(`Moved to ${stageName}`);
  };

  if (loading) {
    return <LeadDetailSkeleton />;
  }

  if (!lead) {
    return (
      <p className="text-center text-muted-foreground py-12">
        Lead not found
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16 border">
          <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
            {getInitials(`${lead.firstName} ${lead.lastName}`)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="text-xl font-bold tracking-tight">
            {lead.firstName} {lead.lastName}
          </h2>
          {lead.jobTitle && (
            <p className="text-sm text-muted-foreground">
              {lead.jobTitle} {lead.company ? `at ${lead.company}` : ""}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge
              status={statusLabelMap[lead.status] ?? "New"}
            />
            {lead.value && (
              <Badge variant="outline" className="font-medium">
                {formatCurrency(lead.value, lead.currency)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Status Change */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Move to:</span>
        <Select value={lead.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(activeWorkspace?.pipeline?.stages || DEFAULT_PIPELINE_STAGES).map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Tabs: Details & Activity */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">
            <User className="h-3.5 w-3.5" />
            Details
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Clock className="h-3.5 w-3.5" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={lead.email} />
            {lead.phone && (
              <InfoItem icon={<Phone className="h-4 w-4" />} label="Phone" value={lead.phone} />
            )}
            {lead.company && (
              <InfoItem icon={<Building2 className="h-4 w-4" />} label="Company" value={lead.company} />
            )}
            {lead.website && (
              <InfoItem
                icon={<Globe className="h-4 w-4" />}
                label="Website"
                value={lead.website}
                isLink
              />
            )}
            {lead.linkedin && (
              <InfoItem
                icon={<Linkedin className="h-4 w-4" />}
                label="LinkedIn"
                value="Profile"
                href={lead.linkedin}
                isLink
              />
            )}
            {(lead.city || lead.country) && (
              <InfoItem
                icon={<MapPin className="h-4 w-4" />}
                label="Location"
                value={`${lead.city}${lead.city && lead.country ? ", " : ""}${lead.country}`}
              />
            )}
            {lead.value && (
              <InfoItem
                icon={<DollarSign className="h-4 w-4" />}
                label="Deal Value"
                value={formatCurrency(lead.value, lead.currency)}
              />
            )}
          </div>

          {/* Notes */}
          {lead.notes && (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="text-sm font-medium mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-lg bg-muted/30 p-3">
                  {lead.notes}
                </p>
              </div>
            </>
          )}

          {/* Custom Fields */}
          {activeWorkspace?.customFields && activeWorkspace.customFields.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="text-sm font-medium mb-2">Custom Fields</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeWorkspace.customFields
                    .sort((a, b) => a.order - b.order)
                    .map((field) => {
                      const value = lead.customFields?.[field.id];
                      if (!value) return null;

                      let displayValue: React.ReactNode = String(value);

                      if (field.type === "multiselect" && Array.isArray(value)) {
                        displayValue = (
                          <div className="flex flex-wrap gap-1">
                            {value.map((v: string) => (
                              <Badge key={v} variant="secondary" className="text-xs">
                                {v}
                              </Badge>
                            ))}
                          </div>
                        );
                      } else if (field.type === "date") {
                        displayValue = new Date(value as string).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      } else if (field.type === "url" || field.type === "email") {
                        displayValue = (
                          <a
                            href={field.type === "email" ? `mailto:${value}` : (value as string)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            {value as string}
                          </a>
                        );
                      }

                      return (
                        <div key={field.id}>
                          <p className="text-xs text-muted-foreground">{field.name}</p>
                          <p className="text-sm font-medium">{displayValue}</p>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}

          {/* Tags */}
          {lead.tags.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="text-sm font-medium mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator className="my-4" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Created:{" "}
              {lead.createdAt?.toDate().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p>
              Updated:{" "}
              {lead.updatedAt?.toDate().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ActivityTimeline
            leadId={lead.id}
            userId={user?.id || ""}
            userName={user?.displayName || "User"}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
  href,
  isLink,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  isLink?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {isLink ? (
          <a
            href={href ?? value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium">{value}</p>
        )}
      </div>
    </div>
  );
}

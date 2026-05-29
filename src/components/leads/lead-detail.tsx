"use client";

import { useEffect, useState, useMemo } from "react";
import { getLead } from "@/lib/firebase/firestore";
import { logStatusChange } from "@/lib/firebase/activities";
import type { Lead } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLeadStore } from "@/lib/stores/leadStore";
import { useWorkspace } from "@/contexts/workspace-context";
import { updateWorkspace } from "@/lib/firebase/workspaces";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants";
import { formatCurrency, getInitials } from "@/lib/utils";
import { ScoreBadge } from "@/components/leads/score-badge";
import { ActivityTimeline } from "@/components/leads/activity-timeline";
import { EmailComposer, EmailHistory } from "@/components/leads/email-composer";
import { sendEmail, getEmailsForLead, type EmailRecord } from "@/lib/firebase/emails";
import { subscribeToLeadActivities, logNote, deleteActivity } from "@/lib/firebase/activities";
import type { Activity } from "@/types";
import { getEmailEventsForLead, type EmailEvent } from "@/lib/email-tracking";
import { calculateLeadScore } from "@/lib/lead-scoring";
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
  FileText,
  Calendar,
  Trash2,
  ExternalLink,
  Copy,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { DocumentManager } from "@/components/leads/document-manager";
import { getApiAuthHeaders } from "@/lib/api/client";

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
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailEvents, setEmailEvents] = useState<EmailEvent[]>([]);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [newStatusDialogOpen, setNewStatusDialogOpen] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#3b82f6");
  const [notes, setNotes] = useState<Activity[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getLead(leadId)
      .then((data) => {
        setLead(data);
      })
      .finally(() => setLoading(false));
  }, [leadId]);

  useEffect(() => {
    if (leadId) {
      setLoadingEmails(true);
      Promise.all([getEmailsForLead(leadId), getEmailEventsForLead(leadId)])
        .then(([emailRecords, events]) => {
          setEmails(emailRecords);
          setEmailEvents(events);
        })
        .finally(() => setLoadingEmails(false));
    }
  }, [leadId]);

  useEffect(() => {
    setNotesLoading(true);
    const unsubscribe = subscribeToLeadActivities(leadId, (acts) => {
      setNotes(acts.filter((a) => a.type === "note"));
      setNotesLoading(false);
    });
    return () => unsubscribe();
  }, [leadId]);

  const stages = activeWorkspace?.pipeline?.stages || DEFAULT_PIPELINE_STAGES;

  const scoreData = useMemo(() => {
    if (!lead) return null;
    const breakdown = calculateLeadScore(lead, emails, stages);
    return { score: breakdown.total, breakdown };
  }, [lead, emails, stages]);

  const handleSendEmail = async (data: { to: string; subject: string; body: string; trackOpens?: boolean; trackClicks?: boolean }) => {
    if (!activeWorkspace || !user || !lead) return;
    await sendEmail({
      workspaceId: activeWorkspace.id,
      leadId: lead.id,
      to: data.to,
      subject: data.subject,
      body: data.body,
      createdBy: user.id,
      trackOpens: data.trackOpens,
      trackClicks: data.trackClicks,
    });
    const [updatedEmails, updatedEvents] = await Promise.all([
      getEmailsForLead(leadId),
      getEmailEventsForLead(leadId),
    ]);
    setEmails(updatedEmails);
    setEmailEvents(updatedEvents);
  };

  const handleStatusChange = async (status: string) => {
    if (!lead) return;
    if (status === "__add_new__") {
      setNewStatusDialogOpen(true);
      return;
    }
    const fromStatus = lead.status;
    updateStatus(lead.id, status, user?.id, user?.displayName);
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

  const handleAddToCalendar = async () => {
    if (!lead?.nextFollowUpAt || !user || !activeWorkspace) return;
    setAddingToCalendar(true);
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getApiAuthHeaders(activeWorkspace.id)),
        },
        body: JSON.stringify({
          leadId: lead.id,
          followUpDate: lead.nextFollowUpAt.toDate().toISOString(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Event added to Google Calendar");
      } else {
        if (data.error?.includes("not connected")) {
          toast.error("Connect Google Calendar in Settings first");
        } else {
          toast.error(data.error || "Failed to add to calendar");
        }
      }
    } catch {
      toast.error("Failed to add to calendar");
    } finally {
      setAddingToCalendar(false);
    }
  };

  const handleAddNewStatus = async () => {
    if (!newStatusName.trim() || !activeWorkspace) return;
    const stages = activeWorkspace?.pipeline?.stages || DEFAULT_PIPELINE_STAGES;
    const newStage = {
      id: newStatusName.toLowerCase().replace(/\s+/g, "-"),
      name: newStatusName.trim(),
      color: newStatusColor,
      probability: 0,
      order: stages.length,
    };
    const updatedStages = [...stages, newStage];
    try {
      await updateWorkspace(activeWorkspace.id, { pipeline: { stages: updatedStages } });
      toast.success(`Status "${newStage.name}" added`);
      setNewStatusName("");
      setNewStatusColor("#3b82f6");
      setNewStatusDialogOpen(false);
    } catch {
      toast.error("Failed to add status");
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim() || !user || !lead) return;
    setAddingNote(true);
    try {
      await logNote(lead.id, lead.workspaceId, user.id, newNoteText.trim());
      setNewNoteText("");
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (activityId: string) => {
    setDeletingNoteId(activityId);
    try {
      await deleteActivity(activityId);
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    } finally {
      setDeletingNoteId(null);
    }
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
            <Select value={lead.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-fit h-6 px-2.5 py-0 text-xs font-medium border-0 shadow-none hover:opacity-80 focus:ring-0 bg-muted/50 rounded-full">
                {(() => {
                  const currentStage = stages.find((s) => s.id === lead.status);
                  return (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: currentStage?.color || "#94a3b8" }}
                      />
                      {currentStage?.name || lead.status}
                    </div>
                  );
                })()}
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name}
                    </span>
                  </SelectItem>
                ))}
                <Separator className="my-1" />
                <SelectItem
                  value="__add_new__"
                  className="text-primary font-medium"
                >
                  + Add new status
                </SelectItem>
              </SelectContent>
            </Select>
            {lead.value && (
              <Badge variant="outline" className="font-medium">
                {formatCurrency(lead.value, lead.currency)}
              </Badge>
            )}
            {scoreData && (
              <ScoreBadge
                score={scoreData.score}
                breakdown={scoreData.breakdown}
                size="md"
              />
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Follow-up Calendar Button */}
      {lead.nextFollowUpAt && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Follow-up scheduled</p>
            <p className="text-xs text-muted-foreground">
              {lead.nextFollowUpAt.toDate().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddToCalendar}
            disabled={addingToCalendar}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {addingToCalendar ? "Adding..." : "Add to Calendar"}
          </Button>
        </div>
      )}

      <Separator />

      {/* Tabs: Details, Activity, Notes, Emails, Documents */}
      <Tabs defaultValue="details">
        <TabsList className="flex-wrap">
          <TabsTrigger value="details">
            <User className="h-3.5 w-3.5" />
            Details
          </TabsTrigger>
          <TabsTrigger value="notes">
            <FileText className="h-3.5 w-3.5" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Clock className="h-3.5 w-3.5" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="h-3.5 w-3.5" />
            Emails {emails.length > 0 && `(${emails.length})`}
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-3.5 w-3.5" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lead.email ? (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <div className="inline-flex items-center gap-1.5 group">
                    <a href={`mailto:${lead.email}`} className="text-sm font-medium text-primary hover:underline truncate max-w-[200px]" title={lead.email}>
                      {lead.email}
                    </a>
                    <span className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={`mailto:${lead.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </a>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(lead.email); toast.success("Copied to clipboard"); }}
                        className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
                      >
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value="" />
            )}
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
                      const raw = lead.customFields?.[field.id];
                      const hasValue = raw !== undefined && raw !== null && raw !== "";

                      if (!hasValue) return null;

                      let displayValue: React.ReactNode = String(raw);

                      if (field.type === "multiselect" && Array.isArray(raw)) {
                        displayValue = (
                          <div className="flex flex-wrap gap-1">
                            {raw.map((v: string) => (
                              <Badge key={v} variant="secondary" className="text-xs">
                                {v}
                              </Badge>
                            ))}
                          </div>
                        );
                      } else if (field.type === "date") {
                        displayValue = new Date(raw as string).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      } else if (field.type === "url") {
                        const urlStr = raw as string;
                        const href = urlStr.startsWith("http") ? urlStr : `https://${urlStr}`;
                        displayValue = (
                          <span className="inline-flex items-center gap-1.5 max-w-[250px] group">
                            <span className="truncate text-sm text-primary" title={urlStr}>
                              {urlStr}
                            </span>
                            <span className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(urlStr);
                                  toast.success("Copied to clipboard");
                                }}
                                className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
                              >
                                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </span>
                          </span>
                        );
                      } else if (field.type === "email") {
                        const emailStr = raw as string;
                        displayValue = (
                          <span className="inline-flex items-center gap-1.5 max-w-[250px] group">
                            <a
                              href={`mailto:${emailStr}`}
                              className="truncate text-sm text-primary hover:underline"
                              title={emailStr}
                            >
                              {emailStr}
                            </a>
                            <span className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a
                                href={`mailto:${emailStr}`}
                                className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(emailStr);
                                  toast.success("Copied to clipboard");
                                }}
                                className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
                              >
                                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </span>
                          </span>
                        );
                      } else {
                        const textStr = String(raw);
                        displayValue = (
                          <span className="inline-flex items-center gap-1.5 max-w-[250px] group">
                            <span className="truncate text-sm font-medium" title={textStr}>
                              {textStr}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(textStr);
                                toast.success("Copied to clipboard");
                              }}
                              className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
                            >
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </span>
                        );
                      }

                      return (
                        <div key={field.id}>
                          <p className="text-xs text-muted-foreground">{field.name}</p>
                          <div className="mt-0.5">{displayValue}</div>
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

        <TabsContent value="notes" className="mt-4">
          <div className="space-y-4">
            {/* Add Note */}
            <div className="space-y-2">
              <Textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Add a note..."
                className="min-h-[80px] resize-none"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={addingNote || !newNoteText.trim()}
                >
                  {addingNote ? (
                    <>
                      <span className="animate-spin mr-1.5 h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-1.5 h-3.5 w-3.5" />
                      Add Note
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Notes List */}
            {notesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No notes yet</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-start gap-3 p-3 rounded-lg border group hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {note.createdAt?.toDate().toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      disabled={deletingNoteId === note.id}
                      className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50"
                    >
                      {deletingNoteId === note.id ? (
                        <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className="max-h-[400px] overflow-y-auto pr-1">
            <ActivityTimeline
              leadId={lead.id}
              userId={user?.id || ""}
              userName={user?.displayName || "User"}
            />
          </div>
        </TabsContent>

        <TabsContent value="emails" className="mt-4">
          <div className="space-y-4">
            <Button size="sm" onClick={() => setEmailDialogOpen(true)}>
              <Mail className="mr-2 h-4 w-4" />
              Compose Email
            </Button>
            {loadingEmails ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <EmailHistory
                emails={emails.map((e) => {
                  const events = emailEvents.filter((ev) => ev.emailId === e.id);
                  const openEvents = events.filter((ev) => ev.type === "open");
                  const clickEvents = events.filter((ev) => ev.type === "click");
                  const lastOpened = openEvents.length > 0
                    ? openEvents[openEvents.length - 1].timestamp.toDate()
                    : undefined;
                  const clickedUrls = [...new Set(clickEvents.map((ev) => ev.url).filter(Boolean))] as string[];

                  return {
                    id: e.id,
                    subject: e.subject,
                    to: e.to,
                    status: e.status,
                    sentAt: e.sentAt?.toDate() || null,
                    tracking: e.trackingEnabled
                      ? {
                          openCount: openEvents.length,
                          lastOpenedAt: lastOpened,
                          clickCount: clickEvents.length,
                          clickedUrls,
                        }
                      : null,
                  };
                })}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          {activeWorkspace && user && (
            <DocumentManager
              leadId={lead.id}
              workspaceId={activeWorkspace.id}
              userId={user.id}
            />
          )}
        </TabsContent>
      </Tabs>

      <EmailComposer
        leadEmail={lead.email}
        leadName={`${lead.firstName} ${lead.lastName}`}
        leadCompany={lead.company || undefined}
        onSend={handleSendEmail}
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
      />

      <Dialog open={newStatusDialogOpen} onOpenChange={setNewStatusDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Status</DialogTitle>
            <DialogDescription>
              Create a custom pipeline stage for your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status-name">Status name</Label>
              <Input
                id="status-name"
                placeholder="e.g. On Hold"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { color: "#3b82f6", label: "Blue" },
                  { color: "#eab308", label: "Yellow" },
                  { color: "#f97316", label: "Orange" },
                  { color: "#a855f7", label: "Purple" },
                  { color: "#ef4444", label: "Red" },
                  { color: "#22c55e", label: "Green" },
                  { color: "#6b7280", label: "Gray" },
                  { color: "#06b6d4", label: "Cyan" },
                ].map(({ color, label }) => (
                  <Tooltip key={color}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          newStatusColor === color ? "border-foreground scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewStatusColor(color)}
                      />
                    </TooltipTrigger>
                    <TooltipContent><p>{label}</p></TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNewStatus} disabled={!newStatusName.trim()}>
              Add Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

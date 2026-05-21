"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Send, Save, FileText, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const EMAIL_TEMPLATES = [
  {
    id: "cold-outreach",
    name: "Cold Outreach",
    subject: "Quick question about {{company}}",
    body: `Hi {{firstName}},

I came across {{company}} and noticed you're doing interesting work in the industry.

I'd love to connect and explore if there's a potential fit for collaboration. Would you be open to a quick 15-minute call next week?

Best regards,
{{sender}}`,
  },
  {
    id: "follow-up",
    name: "Follow-up",
    subject: "Following up - {{company}}",
    body: `Hi {{firstName}},

Just following up on my previous email. I wanted to see if you had a chance to review it.

I'm still very interested in connecting and would appreciate any time you could spare.

Best,
{{sender}}`,
  },
  {
    id: "proposal",
    name: "Proposal",
    subject: "Proposal for {{company}}",
    body: `Hi {{firstName}},

Thank you for your time on our call. As discussed, I've put together a proposal tailored to {{company}}'s needs.

Key highlights:
- [Point 1]
- [Point 2]
- [Point 3]

I'd love to walk you through the details. Are you available for a follow-up call this week?

Best regards,
{{sender}}`,
  },
  {
    id: "check-in",
    name: "Check-in",
    subject: "Checking in",
    body: `Hi {{firstName}},

Hope you're doing well! I wanted to check in and see how things are going at {{company}}.

If there's anything I can help with or if you'd like to catch up, I'm here.

Best,
{{sender}}`,
  },
];

interface EmailComposerProps {
  leadEmail?: string;
  leadName?: string;
  leadCompany?: string;
  onSend: (data: { to: string; subject: string; body: string }) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailComposer({
  leadEmail,
  leadName,
  leadCompany,
  onSend,
  open,
  onOpenChange,
}: EmailComposerProps) {
  const [to, setTo] = useState(leadEmail || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const handleTemplateSelect = (templateId: string) => {
    const template = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      let subject = template.subject;
      let body = template.body;

      // Replace placeholders
      subject = subject
        .replace("{{company}}", leadCompany || "your company")
        .replace("{{firstName}}", leadName?.split(" ")[0] || "there");

      body = body
        .replace("{{company}}", leadCompany || "your company")
        .replace("{{firstName}}", leadName?.split(" ")[0] || "there")
        .replace("{{sender}}", "Me");

      setSubject(subject);
      setBody(body);
      setSelectedTemplate(templateId);
    }
  };

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error("Recipient email is required");
      return;
    }
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!body.trim()) {
      toast.error("Email body is required");
      return;
    }

    setSending(true);
    try {
      await onSend({ to: to.trim(), subject: subject.trim(), body: body.trim() });
      toast.success("Email sent successfully");
      handleClose();
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = () => {
    toast.info("Draft saved (simulated)");
    handleClose();
  };

  const handleClose = () => {
    setTo(leadEmail || "");
    setSubject("");
    setBody("");
    setSelectedTemplate("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Compose Email
          </DialogTitle>
          <DialogDescription>
            Send an email to this lead. Templates can be auto-filled with lead details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Selector */}
          <div className="space-y-2">
            <Label>Template (optional)</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To */}
          <div className="space-y-2">
            <Label>To</Label>
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="lead@example.com"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email..."
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          {/* Preview */}
          {subject && body && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
              <p className="text-sm font-medium">{subject}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                {body.split("\n").slice(0, 3).join("\n")}
                {body.split("\n").length > 3 ? "..." : ""}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSaveDraft} disabled={sending}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EmailHistoryProps {
  emails: Array<{
    id: string;
    subject: string;
    to: string;
    status: string;
    sentAt: Date | null;
  }>;
}

export function EmailHistory({ emails }: EmailHistoryProps) {
  if (emails.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No emails sent yet.</p>;
  }

  return (
    <div className="space-y-3">
      {emails.map((email) => (
        <div key={email.id} className="rounded-lg border p-3 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{email.subject}</p>
            <Badge variant={email.status === "sent" ? "default" : "secondary"} className="text-xs">
              {email.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            To: {email.to}
            {email.sentAt && ` • ${email.sentAt.toLocaleDateString()}`}
          </p>
        </div>
      ))}
    </div>
  );
}

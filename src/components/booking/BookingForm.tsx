"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ChevronLeft } from "lucide-react";
import { BookingMeetingType, BookingQuestion, AvailabilitySlot } from "./types";
import { formatDate, formatSlotWithTz } from "./utils";

interface BookingFormProps {
  meetingType: BookingMeetingType;
  selectedDate: Date;
  selectedSlot: AvailabilitySlot;
  onBack: () => void;
  onSubmit: (data: {
    name: string;
    email: string;
    notes: string;
    questionAnswers: Record<string, string | string[]>;
  }) => Promise<void>;
  booking: boolean;
}

export function BookingForm({
  meetingType,
  selectedDate,
  selectedSlot,
  onBack,
  onSubmit,
  booking,
}: BookingFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string | string[]>>({});

  const tz = meetingType.availability?.timezone || "UTC";

  const handleSubmit = async () => {
    // Validate required fields
    if (!name.trim() || !email.trim()) return;

    // Validate required booking questions
    if (meetingType.bookingQuestions?.length > 0) {
      for (const q of meetingType.bookingQuestions) {
        if (!q.required) continue;
        const answer = questionAnswers[q.id];
        if (
          !answer ||
          (Array.isArray(answer) && answer.length === 0) ||
          (typeof answer === "string" && !answer.trim())
        ) {
          return; // Toast should be handled by parent
        }
      }
    }

    await onSubmit({
      name: name.trim(),
      email: email.trim(),
      notes: notes.trim(),
      questionAnswers,
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">Your details</h2>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="book-name" className="text-sm font-medium">
            Your name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="book-name"
            placeholder=""
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="book-email" className="text-sm font-medium">
            Email address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="book-email"
            type="email"
            placeholder=""
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="book-notes" className="text-sm font-medium">
            Additional notes
          </Label>
          <Textarea
            id="book-notes"
            placeholder="Please share anything that will help prepare for our meeting."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none"
          />
        </div>

        {/* Dynamic Booking Questions */}
        {meetingType.bookingQuestions?.length > 0 &&
          meetingType.bookingQuestions.map((q) => (
            <BookingQuestionField
              key={q.id}
              question={q}
              value={questionAnswers[q.id]}
              onChange={(val) =>
                setQuestionAnswers((prev) => ({ ...prev, [q.id]: val }))
              }
            />
          ))}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <Button
            onClick={handleSubmit}
            disabled={booking || !name.trim() || !email.trim()}
            className="px-6"
          >
            {booking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Booking...
              </>
            ) : (
              "Confirm"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Question Field Component ─────────────────────────────────────
function BookingQuestionField({
  question,
  value,
  onChange,
}: {
  question: BookingQuestion;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {question.question}
        {question.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {question.type === "text" || question.type === "phone" || question.type === "date" ? (
        <Input
          type={question.type === "date" ? "date" : question.type === "phone" ? "tel" : "text"}
          placeholder={question.type === "phone" ? "+1 (555) 000-0000" : ""}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-11"
        />
      ) : question.type === "textarea" ? (
        <Textarea
          rows={3}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          className="resize-none"
        />
      ) : question.type === "radio" || question.type === "dropdown" ? (
        <select
          className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select...</option>
          {question.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : question.type === "checkbox" ? (
        <div className="flex flex-wrap gap-2">
          {question.options?.map((opt) => {
            const checked = ((value as string[]) || []).includes(opt);
            return (
              <label
                key={opt}
                className="flex items-center gap-1.5 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const current = (value as string[]) || [];
                    const next = checked
                      ? current.filter((v) => v !== opt)
                      : [...current, opt];
                    onChange(next);
                  }}
                  className="rounded border-input"
                />
                {opt}
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

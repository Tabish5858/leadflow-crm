"use client";

import { CheckCircle, Calendar, Clock, Video } from "lucide-react";
import { BookingMeetingType, AvailabilitySlot } from "./types";
import { formatDate, formatSlotWithTz } from "./utils";

interface BookingConfirmationProps {
  meetingType: BookingMeetingType;
  selectedDate: Date;
  selectedSlot: AvailabilitySlot;
  email: string;
}

export function BookingConfirmation({
  meetingType,
  selectedDate,
  selectedSlot,
  email,
}: BookingConfirmationProps) {
  const tz = meetingType.availability?.timezone || "UTC";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-lg mx-4 text-center">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Meeting booked!
        </h1>
        <p className="text-muted-foreground mb-8">
          You are scheduled with {meetingType.name}
        </p>

        {/* Meeting Details Card */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6 text-left">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {formatDate(selectedDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {formatSlotWithTz(selectedSlot.time, tz, selectedDate)} · {meetingType.duration} min
                </p>
              </div>
            </div>
            {meetingType.videoTool && (
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {meetingType.videoTool.replace("_", " ")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Email Notice */}
        <p className="text-sm text-muted-foreground">
          A calendar invitation has been sent to{" "}
          <strong className="text-foreground">{email}</strong>.
        </p>
      </div>
    </div>
  );
}

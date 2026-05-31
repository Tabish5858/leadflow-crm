"use client";

import { Loader2, AlertCircle, Clock } from "lucide-react";
import { AvailabilitySlot } from "./types";

interface BookingTimeSlotsProps {
  selectedDate: Date | null;
  slots: AvailabilitySlot[];
  slotsLoading: boolean;
  slotsError: string | null;
  selectedTime: string;
  onSelectTime: (time: string) => void;
}

function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
  }).format(date);
}

export function BookingTimeSlots({
  selectedDate,
  slots,
  slotsLoading,
  slotsError,
  selectedTime,
  onSelectTime,
}: BookingTimeSlotsProps) {
  if (!selectedDate) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          Select a date to see available times
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Date Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {formatDateShort(selectedDate)}
        </h3>
      </div>

      {/* Loading */}
      {slotsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : slotsError ? (
        <div className="flex items-center gap-2 py-6 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {slotsError}
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No available times on this day.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Try selecting a different date.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {slots.map((slot) => (
            <button
              key={slot.time}
              type="button"
              onClick={() => onSelectTime(slot.time)}
              className={`
                w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 border
                ${selectedTime === slot.time
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-foreground border-border hover:border-foreground/30 hover:bg-muted"
                }
              `}
            >
              {slot.display}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

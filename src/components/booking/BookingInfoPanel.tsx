"use client";

import { Globe, Clock, Video } from "lucide-react";
import { BookingMeetingType, AvailabilitySlot } from "./types";
import { getTimezoneAbbr, formatDate, formatSlotWithTz, getCommonTimezones, formatTimezoneDisplay } from "./utils";

interface BookingInfoPanelProps {
  meetingType: BookingMeetingType;
  workspaceName: string;
  selectedDate: Date | null;
  selectedTime: string | null;
  selectedSlot: AvailabilitySlot | null;
  onTimezoneChange?: (tz: string) => void;
}

export function BookingInfoPanel({
  meetingType,
  workspaceName,
  selectedDate,
  selectedTime,
  selectedSlot,
  onTimezoneChange,
}: BookingInfoPanelProps) {
  const tz = meetingType.availability?.timezone || "UTC";
  const displayDate = selectedDate || new Date();

  return (
    <div className="flex flex-col h-full">
      {/* Logo / Avatar */}
      <div className="mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="text-lg font-bold text-primary">
            {workspaceName?.charAt(0) || "M"}
          </span>
        </div>
      </div>

      {/* Workspace Name */}
      <p className="text-sm text-primary font-medium mb-1">{workspaceName}</p>

      {/* Meeting Title */}
      <h1 className="text-2xl font-bold text-foreground mb-3">
        {meetingType.name}
      </h1>

      {/* Description */}
      {meetingType.description && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          {meetingType.description}
        </p>
      )}

      {/* Selected Date & Time (shown after selection) */}
      {selectedDate && selectedTime && (
        <div className="mb-6 space-y-1">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatDate(selectedDate)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground ml-6">
            <span>
              {formatSlotWithTz(selectedTime, tz, selectedDate)} · {meetingType.duration} min
            </span>
          </div>
        </div>
      )}

      {/* Duration */}
      <div className="flex items-center gap-2 text-sm text-foreground mb-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span>{meetingType.duration}m</span>
      </div>

      {/* Video Tool */}
      {meetingType.videoTool && (
        <div className="flex items-center gap-2 text-sm text-foreground mb-4">
          {meetingType.videoTool === "google_meet" ? (
            <span className="text-green-500 text-base">📹</span>
          ) : meetingType.videoTool === "zoom" ? (
            <span className="text-blue-500 text-base">🎥</span>
          ) : (
            <Video className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="capitalize">
            {meetingType.videoTool.replace("_", " ")}
          </span>
        </div>
      )}

      {/* Timezone Dropdown */}
      <div className="mt-auto pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <select
            value={tz}
            onChange={(e) => onTimezoneChange?.(e.target.value)}
            className="text-sm bg-transparent border-none text-foreground focus:outline-none focus:ring-0 cursor-pointer appearance-none pr-4"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: "right 0 center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "1.2em",
            }}
          >
            {getCommonTimezones().map((tzOption) => (
              <option key={tzOption} value={tzOption}>
                {formatTimezoneDisplay(tzOption, displayDate)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

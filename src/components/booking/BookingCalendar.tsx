"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { generateMonthCalendar } from "./utils";

interface BookingCalendarProps {
  calendarYear: number;
  calendarMonth: number;
  selectedDate: Date | null;
  availableDates: Date[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (day: number) => void;
  canSelectNextMonth: boolean;
}

export function BookingCalendar({
  calendarYear,
  calendarMonth,
  selectedDate,
  availableDates,
  onPrevMonth,
  onNextMonth,
  onDayClick,
  canSelectNextMonth,
}: BookingCalendarProps) {
  const calendarGrid = generateMonthCalendar(calendarYear, calendarMonth);
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(calendarYear, calendarMonth));

  const isDateAvailable = (day: number) => {
    return availableDates.some(
      (d) =>
        d.getFullYear() === calendarYear &&
        d.getMonth() === calendarMonth &&
        d.getDate() === day
    );
  };

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === calendarYear &&
      selectedDate.getMonth() === calendarMonth &&
      selectedDate.getDate() === day
    );
  };

  const isPast = (day: number) => {
    const today = new Date();
    return (
      calendarYear < today.getFullYear() ||
      (calendarYear === today.getFullYear() &&
        calendarMonth < today.getMonth()) ||
      (calendarYear === today.getFullYear() &&
        calendarMonth === today.getMonth() &&
        day < today.getDate())
    );
  };

  return (
    <div>
      {/* Month Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            disabled={!canSelectNextMonth}
            className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarGrid.flat().map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="h-12" />;
          }

          const available = isDateAvailable(day);
          const selected = isDateSelected(day);
          const past = isPast(day);

          return (
            <button
              key={`day-${day}`}
              type="button"
              disabled={!available || past}
              onClick={() => onDayClick(day)}
              className={`
                h-12 rounded-lg text-sm font-medium transition-all duration-150
                ${selected
                  ? "bg-foreground text-background font-semibold"
                  : available && !past
                    ? "bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
                    : past
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : "text-muted-foreground cursor-not-allowed"
                }
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

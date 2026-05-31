/** Format date to readable string */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** Get timezone abbreviation for a given IANA timezone at a specific date */
export function getTimezoneAbbr(timezone: string, date?: Date): string {
  try {
    const targetDate = date || new Date();
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(targetDate);
    const gmtMatch = formatted.match(/GMT[+-]\d{2}:\d{2}/);
    if (gmtMatch) return gmtMatch[0];

    const short = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(targetDate);
    const parts = short.split(" ");
    const last = parts[parts.length - 1];
    if (last && last.length <= 5) return last;

    return timezone.split("/").pop() || timezone;
  } catch {
    return timezone;
  }
}

/** Format "HH:MM" to "9:00 AM" */
export function formatSlotTime(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

/** Format "HH:MM" to "9:00 AM GMT-04:00" using the meeting date */
export function formatSlotWithTz(time24: string, tz: string, date?: Date): string {
  try {
    return `${formatSlotTime(time24)} ${getTimezoneAbbr(tz, date)}`;
  } catch {
    return formatSlotTime(time24);
  }
}

/** Generate array of Dates for today + next 30 days that match daysOfWeek */
export function generateAvailableDates(daysOfWeek: number[]): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (daysOfWeek.includes(d.getDay())) {
      dates.push(d);
    }
  }
  return dates;
}

/** Compute timezone offset in minutes for a given date + IANA timezone */
export function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const utcNoon = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
  );
  const tzStr = utcNoon.toLocaleString("en-CA", {
    timeZone: timezone,
    hour12: false,
  });
  const [, tzTime] = tzStr.split(", ");
  const [tzH, tzM] = tzTime.split(":").map(Number);
  const tzMinutes = tzH * 60 + tzM;
  const utcMinutes = 12 * 60;
  return (utcMinutes - tzMinutes) * 60 * 1000;
}

/** Convert a Date + "HH:MM" (in meeting's timezone) to a UTC ISO string */
export function dateAndSlotToISO(date: Date, time24: string, timezone: string): string {
  const [h, m] = time24.split(":").map(Number);
  const offsetMs = getTimezoneOffsetMs(date, timezone);
  const localTimestamp = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    h,
    m,
    0,
    0
  );
  const utcTimestamp = localTimestamp + offsetMs;
  return new Date(utcTimestamp).toISOString();
}

/** Generate month calendar grid */
export function generateMonthCalendar(year: number, month: number): Array<Array<number | null>> {
  const weeks: Array<Array<number | null>> = [];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year + 1, 0, 0).getDate();

  let week: Array<number | null> = [];
  for (let d = 0; d < firstDay; d++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

/** Get common IANA timezones for the selector */
export function getCommonTimezones(): string[] {
  return [
    "Pacific/Honolulu",
    "America/Anchorage",
    "America/Los_Angeles",
    "America/Denver",
    "America/Chicago",
    "America/New_York",
    "America/Sao_Paulo",
    "Atlantic/Reykjavik",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Moscow",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Australia/Sydney",
    "Pacific/Auckland",
  ];
}

/** Format timezone for display like "GMT-04:00 (America/New_York)" */
export function formatTimezoneDisplay(tz: string, date?: Date): string {
  const abbr = getTimezoneAbbr(tz, date);
  return `${abbr} (${tz})`;
}

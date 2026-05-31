export interface BookingQuestion {
  id: string;
  question: string;
  type: "text" | "textarea" | "radio" | "checkbox" | "dropdown" | "phone" | "date";
  required: boolean;
  options?: string[];
}

export interface BookingMeetingType {
  id: string;
  name: string;
  duration: number;
  description: string;
  videoTool: string;
  availability: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    timezone: string;
  } | null;
  bookingQuestions: BookingQuestion[];
  confirmationPage: "default" | "redirect";
  redirectUrl: string;
}

export interface AvailabilitySlot {
  time: string; // "HH:MM" in meeting type's timezone
  display: string; // Human-readable like "9:00 AM"
  label: string; // With timezone like "9:00 AM EDT"
}

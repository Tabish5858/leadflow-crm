"use client";

import { ChecklistItem, ChecklistProgress } from "./checklist-item";

const items = [
  { id: "fork-clone", label: "Fork & clone the repository · 2 min" },
  { id: "firebase", label: "Create a Firebase project · 5 min" },
  { id: "cloudinary", label: "Set up Cloudinary · 3 min" },
  { id: "resend", label: "Configure Resend for email · 5 min" },
  { id: "google-calendar", label: "Connect Google Calendar · 5 min" },
  { id: "sentry", label: "Set up Sentry error tracking · 3 min" },
  { id: "env-vars", label: "Configure environment variables · 2 min" },
  { id: "deploy", label: "Deploy to Vercel · 5 min" },
];

export function SetupChecklist() {
  return (
    <div className="not-prose space-y-4">
      <ChecklistProgress items={items} />

      <div className="space-y-2 rounded-lg border border-neutral-800 bg-white/[2%] p-4">
        {items.map((item) => (
          <ChecklistItem key={item.id} id={item.id}>
            {item.label}
          </ChecklistItem>
        ))}
      </div>

    </div>
  );
}

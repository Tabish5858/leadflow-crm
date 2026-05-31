"use client";

import { Check } from "lucide-react";

export type BookingStep = "select" | "details" | "confirmed";

interface StepConfig {
  key: BookingStep;
  label: string;
}

const STEPS: StepConfig[] = [
  { key: "select", label: "Select Date & Time" },
  { key: "details", label: "Your Details" },
  { key: "confirmed", label: "Confirmed" },
];

interface BookingStepIndicatorProps {
  currentStep: BookingStep;
}

export function BookingStepIndicator({ currentStep }: BookingStepIndicatorProps) {
  const getStepIndex = (step: BookingStep): number =>
    STEPS.findIndex((s) => s.key === step);
  const currentIdx = getStepIndex(currentStep);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                    transition-all duration-300 ease-in-out
                    ${
                      isCompleted
                        ? "bg-foreground text-background"
                        : isActive
                          ? "bg-foreground text-background ring-4 ring-foreground/20"
                          : "bg-muted text-muted-foreground border border-border"
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`
                    text-xs mt-2 whitespace-nowrap transition-colors duration-300
                    ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line (not after the last step) */}
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-px mx-3 mb-6 relative">
                  <div
                    className="absolute inset-0 bg-muted-foreground/20 transition-all duration-500"
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-foreground transition-all duration-500"
                    style={{
                      width: isCompleted ? "100%" : isActive && currentIdx === idx ? "0%" : "0%",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Package, CheckCircle2 } from "lucide-react";
import type { Project, ProjectDeliveryFlow } from "@/types";
import { updateProject } from "@/lib/firebase/projects";
import { toast } from "@/lib/toast";

interface DeliveryFlowCardProps {
  project: Project;
  onProjectUpdated: () => void;
}

export default function DeliveryFlowCard({ project, onProjectUpdated }: DeliveryFlowCardProps) {
  const [saving, setSaving] = useState(false);
  const settings: ProjectDeliveryFlow = project.deliveryFlowSettings || {
    enableFeedback: false,
    enableReferrals: false,
    enableReviews: false,
    enableUpsell: false,
    referralMessage: "",
    reviewPlatforms: [],
    reviewMessage: "",
    onlyAsk5Star: false,
    upsellMessage: "",
    upsellServices: [],
  };

  const updateSetting = async (key: keyof ProjectDeliveryFlow, value: boolean | string | any[]) => {
    setSaving(true);
    try {
      await updateProject(project.id, {
        deliveryFlowSettings: { ...settings, [key]: value },
      } as any);
      toast.success("Delivery flow updated");
      onProjectUpdated();
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { key: "enableFeedback" as const, label: "Feedback", desc: "Collect client feedback on deliverables" },
    { key: "enableReferrals" as const, label: "Referrals", desc: "Ask for referrals after completion" },
    { key: "enableReviews" as const, label: "Reviews", desc: "Request reviews on platforms" },
    { key: "enableUpsell" as const, label: "Upsell", desc: "Offer additional services" },
  ];

  return (
    <div
      style={{ borderRadius: "8px" }}
      className="flex flex-col p-5 w-full bg-card border border-border hover:border-foreground/20 transition-colors"
    >
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Delivery Flow</h3>
      </div>

      {project.hasFinalPackage && (
        <div className="mb-3 flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <span className="text-xs text-green-700 dark:text-green-400">
            Final package delivered {project.finalPackageDeliveredAt
              ? new Date(project.finalPackageDeliveredAt.seconds * 1000).toLocaleDateString()
              : ""}
          </span>
        </div>
      )}

      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.key} className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">{step.label}</p>
              <p className="text-[10px] text-muted-foreground">{step.desc}</p>
            </div>
            <button
              onClick={() => updateSetting(step.key, !settings[step.key])}
              disabled={saving}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                settings[step.key] ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  settings[step.key] ? "translate-x-4" : ""
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Reviews config */}
      {settings.enableReviews && (
        <div className="mt-3 pt-3 border-t border-border">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.onlyAsk5Star}
              onChange={(e) => updateSetting("onlyAsk5Star", e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border"
            />
            <span className="text-xs text-muted-foreground">Only ask for 5-star reviews</span>
          </label>
        </div>
      )}
    </div>
  );
}

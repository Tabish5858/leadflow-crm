"use client";

import { useState } from "react";
import type { CustomField } from "@/types";
import { updateLead } from "@/lib/firebase/firestore";
import { useLeadStore } from "@/lib/stores/leadStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface SelectFieldCellProps {
  customField: CustomField;
  value: unknown;
  leadId: string;
}

const OPTION_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
];

function getOptionColor(option: string, index: number): string {
  return OPTION_COLORS[index % OPTION_COLORS.length];
}

function getCurrentCustomFields(leadId: string): Record<string, unknown> {
  const lead = useLeadStore.getState().leads.find((l) => l.id === leadId);
  return { ...(lead?.customFields || {}) };
}

function SelectCell({ customField, value, leadId }: SelectFieldCellProps) {
  const [open, setOpen] = useState(false);
  const selectedText = typeof value === "string" ? value : "";

  const handleChange = (newValue: string) => {
    const merged = {
      ...getCurrentCustomFields(leadId),
      [customField.id]: newValue,
    };
    updateLead(leadId, { customFields: merged });
    setOpen(false);
  };

  return (
    <Select value={selectedText} onValueChange={handleChange} open={open} onOpenChange={setOpen}>
      <SelectTrigger className="w-fit min-w-[56px] h-6 px-2 py-0 text-xs font-medium border-0 shadow-none hover:opacity-80 focus:ring-0 bg-muted/50 rounded-full">
        {selectedText ? (
          <span
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
              getOptionColor(selectedText, (customField.options || []).indexOf(selectedText))
            )}
          >
            {selectedText}
          </span>
        ) : (
          <span className="text-muted-foreground/40 text-[10px]">—</span>
        )}
      </SelectTrigger>
      <SelectContent>
        {(customField.options || []).map((option, i) => (
          <SelectItem key={option} value={option}>
            <span
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
                getOptionColor(option, i)
              )}
            >
              {option}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MultiSelectCell({ customField, value, leadId }: SelectFieldCellProps) {
  const [open, setOpen] = useState(false);
  const selectedValues: string[] = Array.isArray(value) ? value : [];

  const toggleOption = (option: string) => {
    const next = selectedValues.includes(option)
      ? selectedValues.filter((v) => v !== option)
      : [...selectedValues, option];
    const merged = {
      ...getCurrentCustomFields(leadId),
      [customField.id]: next,
    };
    updateLead(leadId, { customFields: merged });
  };

  const options = customField.options || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex flex-wrap gap-1 items-center min-w-[56px] cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {selectedValues.length > 0 ? (
            selectedValues.map((opt) => (
              <span
                key={opt}
                className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
                  getOptionColor(opt, options.indexOf(opt))
                )}
              >
                {opt}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground/50 text-sm">—</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-2"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
          {customField.name}
        </p>
        {options.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">No options defined</p>
        ) : (
          <div className="space-y-1">
            {options.map((option, i) => (
              <label
                key={option}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
              >
                <Checkbox
                  checked={selectedValues.includes(option)}
                  onCheckedChange={() => toggleOption(option)}
                />
                <span
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
                    getOptionColor(option, i)
                  )}
                >
                  {option}
                </span>
              </label>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function SelectFieldCell({ customField, value, leadId }: SelectFieldCellProps) {
  if (customField.type === "multiselect") {
    return <MultiSelectCell customField={customField} value={value} leadId={leadId} />;
  }
  return <SelectCell customField={customField} value={value} leadId={leadId} />;
}

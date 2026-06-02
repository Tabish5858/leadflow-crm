"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

/**
 * Accent Theme Context - dynamically switches the primary color palette
 * by updating --primary-50 through --primary-900 RGB channel CSS custom properties.
 *
 * Adapted from MyUni's ThemeContext for LeadFlow CRM.
 * Works alongside next-themes (dark/light mode toggle) - this handles
 * only the accent color, not the dark/light semantic tokens.
 */

/* ── Types ─────────────────────────────────────────────────────── */

export type AccentColor =
  | "orange"
  | "blue"
  | "green"
  | "purple"
  | "red"
  | "pink"
  | "teal"
  | "indigo"
  | "amber"
  | "cyan"
  | "lime"
  | "emerald"
  | "sky"
  | "violet"
  | "fuchsia"
  | "rose"
  | "yellow"
  | "slate";

export interface AccentOption {
  value: AccentColor;
  label: string;
  hex: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { value: "orange", label: "Orange", hex: "#F97316" },
  { value: "blue", label: "Blue", hex: "#3B82F6" },
  { value: "green", label: "Green", hex: "#10B981" },
  { value: "purple", label: "Purple", hex: "#8B5CF6" },
  { value: "red", label: "Red", hex: "#EF4444" },
  { value: "pink", label: "Pink", hex: "#EC4899" },
  { value: "teal", label: "Teal", hex: "#14B8A6" },
  { value: "indigo", label: "Indigo", hex: "#6366F1" },
  { value: "amber", label: "Amber", hex: "#F59E0B" },
  { value: "cyan", label: "Cyan", hex: "#06B6D4" },
  { value: "lime", label: "Lime", hex: "#84CC16" },
  { value: "emerald", label: "Emerald", hex: "#10B981" },
  { value: "sky", label: "Sky", hex: "#0EA5E9" },
  { value: "violet", label: "Violet", hex: "#8B5CF6" },
  { value: "fuchsia", label: "Fuchsia", hex: "#D946EF" },
  { value: "rose", label: "Rose", hex: "#F43F5E" },
  { value: "yellow", label: "Yellow", hex: "#EAB308" },
  { value: "slate", label: "Slate", hex: "#64748B" },
];

export const DEFAULT_ACCENT: AccentColor = "orange";

/* ── Color scales (hex → RGB channels) ──────────────────────────── */

const COLOR_SCALES: Record<AccentColor, Record<number, string>> = {
  orange: {
    50: "#FFF7ED", 100: "#FFEDD5", 200: "#FED7AA", 300: "#FDBA74",
    400: "#FB923C", 500: "#F97316", 600: "#EA580C", 700: "#C2410C",
    800: "#9A3412", 900: "#7C2D12",
  },
  blue: {
    50: "#EFF6FF", 100: "#DBEAFE", 200: "#BFDBFE", 300: "#93C5FD",
    400: "#60A5FA", 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8",
    800: "#1E40AF", 900: "#1E3A8A",
  },
  green: {
    50: "#ECFDF5", 100: "#D1FAE5", 200: "#A7F3D0", 300: "#6EE7B7",
    400: "#34D399", 500: "#10B981", 600: "#059669", 700: "#047857",
    800: "#065F46", 900: "#064E3B",
  },
  purple: {
    50: "#EEF2FF", 100: "#E0E7FF", 200: "#C7D2FE", 300: "#A5B4FC",
    400: "#818CF8", 500: "#6366F1", 600: "#4F46E5", 700: "#4338CA",
    800: "#3730A3", 900: "#312E81",
  },
  red: {
    50: "#FEF2F2", 100: "#FEE2E2", 200: "#FECACA", 300: "#FCA5A5",
    400: "#F87171", 500: "#EF4444", 600: "#DC2626", 700: "#B91C1C",
    800: "#991B1B", 900: "#7F1D1D",
  },
  pink: {
    50: "#FDF2F8", 100: "#FCE7F3", 200: "#FBCFE8", 300: "#F9A8D4",
    400: "#F472B6", 500: "#EC4899", 600: "#DB2777", 700: "#BE185D",
    800: "#9D174D", 900: "#831843",
  },
  teal: {
    50: "#F0FDFA", 100: "#CCFBF1", 200: "#99F6E4", 300: "#5EEAD4",
    400: "#2DD4BF", 500: "#14B8A6", 600: "#0D9488", 700: "#0F766E",
    800: "#115E59", 900: "#134E4A",
  },
  indigo: {
    50: "#EEF2FF", 100: "#E0E7FF", 200: "#C7D2FE", 300: "#A5B4FC",
    400: "#818CF8", 500: "#6366F1", 600: "#4F46E5", 700: "#4338CA",
    800: "#3730A3", 900: "#312E81",
  },
  amber: {
    50: "#FFFBEB", 100: "#FEF3C7", 200: "#FDE68A", 300: "#FCD34D",
    400: "#FBBF24", 500: "#F59E0B", 600: "#D97706", 700: "#B45309",
    800: "#92400E", 900: "#78350F",
  },
  cyan: {
    50: "#ECFEFF", 100: "#CFFAFE", 200: "#A5F3FC", 300: "#67E8F9",
    400: "#22D3EE", 500: "#06B6D4", 600: "#0891B2", 700: "#0E7490",
    800: "#155E75", 900: "#164E63",
  },
  lime: {
    50: "#F7FEE7", 100: "#ECFCCB", 200: "#D9F99D", 300: "#BEF264",
    400: "#A3E635", 500: "#84CC16", 600: "#65A30D", 700: "#4D7C0F",
    800: "#3F6212", 900: "#365314",
  },
  emerald: {
    50: "#ECFDF5", 100: "#D1FAE5", 200: "#A7F3D0", 300: "#6EE7B7",
    400: "#34D399", 500: "#10B981", 600: "#059669", 700: "#047857",
    800: "#065F46", 900: "#064E3B",
  },
  sky: {
    50: "#F0F9FF", 100: "#E0F2FE", 200: "#BAE6FD", 300: "#7DD3FC",
    400: "#38BDF8", 500: "#0EA5E9", 600: "#0284C7", 700: "#0369A1",
    800: "#075985", 900: "#0C4A6E",
  },
  violet: {
    50: "#F5F3FF", 100: "#EDE9FE", 200: "#DDD6FE", 300: "#C4B5FD",
    400: "#A78BFA", 500: "#8B5CF6", 600: "#7C3AED", 700: "#6D28D9",
    800: "#5B21B6", 900: "#4C1D95",
  },
  fuchsia: {
    50: "#FDF4FF", 100: "#FAE8FF", 200: "#F5D0FE", 300: "#F0ABFC",
    400: "#E879F9", 500: "#D946EF", 600: "#C026D3", 700: "#A21CAF",
    800: "#86198F", 900: "#701A75",
  },
  rose: {
    50: "#FFF1F2", 100: "#FFE4E6", 200: "#FECDD3", 300: "#FDA4AF",
    400: "#FB7185", 500: "#F43F5E", 600: "#E11D48", 700: "#BE123C",
    800: "#9F1239", 900: "#881337",
  },
  yellow: {
    50: "#FEFCE8", 100: "#FEF9C3", 200: "#FEF08A", 300: "#FDE047",
    400: "#FACC15", 500: "#EAB308", 600: "#CA8A04", 700: "#A16207",
    800: "#854D0E", 900: "#713F12",
  },
  slate: {
    50: "#F8FAFC", 100: "#F1F5F9", 200: "#E2E8F0", 300: "#CBD5E1",
    400: "#94A3B8", 500: "#64748B", 600: "#475569", 700: "#334155",
    800: "#1E293B", 900: "#0F172A",
  },
};

/* ── HSL accent definitions (for shadcn --primary and --ring tokens) ── */

interface HSLValue {
  h: string;   /* hue, e.g. "24" */
  s: string;   /* saturation, e.g. "94%" */
  l: string;   /* lightness, e.g. "58%" */
}

const ACCENT_HSL: Record<AccentColor, HSLValue> = {
  orange:   { h: "24",  s: "94%", l: "58%" },
  blue:     { h: "217", s: "91%", l: "60%" },
  green:    { h: "152", s: "55%", l: "42%" },
  purple:   { h: "239", s: "84%", l: "67%" },
  red:      { h: "0",   s: "84%", l: "60%" },
  pink:     { h: "330", s: "81%", l: "60%" },
  teal:     { h: "173", s: "80%", l: "40%" },
  indigo:   { h: "239", s: "84%", l: "67%" },
  amber:    { h: "38",  s: "92%", l: "50%" },
  cyan:     { h: "189", s: "94%", l: "43%" },
  lime:     { h: "78",  s: "92%", l: "45%" },
  emerald:  { h: "152", s: "55%", l: "42%" },
  sky:      { h: "199", s: "89%", l: "48%" },
  violet:   { h: "255", s: "92%", l: "76%" },
  fuchsia:  { h: "292", s: "84%", l: "61%" },
  rose:     { h: "347", s: "77%", l: "60%" },
  yellow:   { h: "48",  s: "96%", l: "53%" },
  slate:    { h: "215", s: "16%", l: "47%" },
};

/* ── Helpers ─────────────────────────────────────────────────────── */

/**
 * Write --color-primary-50 through --color-primary-900 as hex colors
 * AND update --primary (HSL) for shadcn component tokens (bg-primary,
 * text-primary, ring, etc.) so the entire UI accent changes.
 *
 * Tailwind v4 generates:
 *   .bg-primary-500  { background-color: var(--color-primary-500); }
 *   .bg-primary      { background-color: hsl(var(--primary)); }
 * We override both at runtime to switch accents.
 */
function applyAccentColors(accent: AccentColor): void {
  const scale = COLOR_SCALES[accent];
  const hsl = ACCENT_HSL[accent];
  if (!scale || !hsl) return;

  const root = document.documentElement;

  /* 1. Tonal scale (hex) - for bg-primary-50 through bg-primary-900 */
  Object.entries(scale).forEach(([shade, hex]) => {
    root.style.setProperty(`--color-primary-${shade}`, hex);
  });

  /* 2. Semantic HSL tokens - for shadcn components (bg-primary, text-primary-foreground, ring) */
  root.style.setProperty("--primary", `${hsl.h} ${hsl.s} ${hsl.l}`);
  root.style.setProperty("--ring", `${hsl.h} ${hsl.s} ${hsl.l}`);

  /* 3. Determine foreground contrast (white for dark-ish, dark for light-ish) */
  const lightness = parseInt(hsl.l);
  if (lightness > 60) {
    /* Light accent → dark text */
    root.style.setProperty("--primary-foreground", "220 14% 8%");
  } else {
    /* Dark accent → white text */
    root.style.setProperty("--primary-foreground", "0 0% 100%");
  }
}

/* ── Context ─────────────────────────────────────────────────────── */

interface AccentContextType {
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  isLoading: boolean;
}

const AccentContext = createContext<AccentContextType | undefined>(undefined);

export function AccentThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentColor>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("leadflow-accent") as AccentColor | null;
      if (stored && ACCENT_OPTIONS.some((o) => o.value === stored)) {
        return stored;
      }
    }
    return DEFAULT_ACCENT;
  });
  const [isLoading, setIsLoading] = useState(true);

  /* Apply on mount */
  useEffect(() => {
    applyAccentColors(accent);
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAccent = useCallback((newAccent: AccentColor) => {
    setAccentState(newAccent);
    applyAccentColors(newAccent);
    localStorage.setItem("leadflow-accent", newAccent);
  }, []);

  return (
    <AccentContext.Provider value={{ accent, setAccent, isLoading }}>
      {children}
    </AccentContext.Provider>
  );
}

export function useAccent(): AccentContextType {
  const ctx = useContext(AccentContext);
  if (!ctx) {
    throw new Error("useAccent must be used within an AccentThemeProvider");
  }
  return ctx;
}

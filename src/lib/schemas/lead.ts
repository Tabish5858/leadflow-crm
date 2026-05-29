import { z } from "zod";

export const leadSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  jobTitle: z.string().optional().or(z.literal("")),
  status: z.string().min(1, "Status is required"),
  source: z.string().optional().or(z.literal("")),
  niche: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  linkedin: z.string().url("Invalid URL").optional().or(z.literal("")),
  value: z.coerce.number().min(0, "Value must be positive").optional().or(z.literal(0)),
  currency: z.string().default("USD"),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().or(z.literal("")),
  expectedCloseAt: z.string().optional().or(z.literal("")),
});

export type LeadFormData = z.infer<typeof leadSchema>;

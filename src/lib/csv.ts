import type { Lead, CustomField } from "@/types";

const CSV_HEADERS = [
  "First Name",
  "Last Name",
  "Email",
  "Phone",
  "Company",
  "Job Title",
  "Status",
  "Source",
  "Value",
  "Currency",
  "Website",
  "LinkedIn",
  "Country",
  "City",
  "Tags",
  "Notes",
];

const CSV_HEADER_MAP: Record<string, keyof Lead> = {
  "first name": "firstName",
  "last name": "lastName",
  email: "email",
  phone: "phone",
  company: "company",
  "job title": "jobTitle",
  status: "status",
  source: "source",
  value: "value",
  currency: "currency",
  website: "website",
  linkedin: "linkedin",
  country: "country",
  city: "city",
  tags: "tags",
  notes: "notes",
};

export function leadsToCsv(leads: Lead[], customFields: CustomField[] = []): string {
  // Build headers: standard fields + custom field names
  const allHeaders = [...CSV_HEADERS, ...customFields.map((f) => f.name)];

  const rows = leads.map((lead) => {
    // Standard field values
    const standardValues = CSV_HEADERS.map((header) => {
      const key = CSV_HEADER_MAP[header.toLowerCase()] as keyof Lead;
      const value = lead[key];

      if (key === "value") {
        return value?.toString() || "";
      }
      if (key === "tags" && Array.isArray(value)) {
        return value.join("; ");
      }
      if (value === null || value === undefined) return "";
      return String(value);
    });

    // Custom field values
    const customValues = customFields.map((f) => {
      const val = lead.customFields?.[f.id];
      return val ? String(val) : "";
    });

    const allValues = [...standardValues, ...customValues];
    return allValues.map((v) => `"${v.replace(/"/g, '""')}"`).join(",");
  });

  return [allHeaders.map((h) => `"${h}"`).join(","), ...rows].join("\n");
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface CsvImportResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
}

export function parseCsv(content: string): CsvImportResult {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [], errors: ["Empty CSV file"] };
  }

  const errors: string[] = [];
  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length !== headers.length) {
      errors.push(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row);
  }

  return { headers, rows, errors };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}

export interface MappedLead {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  status: string;
  source: string | null;
  value: number | null;
  currency: string;
  website: string | null;
  linkedin: string | null;
  country: string | null;
  city: string | null;
  tags: string[];
  notes: string | null;
  /** Custom field values keyed by custom field ID. */
  customFields: Record<string, string>;
}

export function mapCsvRowToLead(
  row: Record<string, string>,
  columnMapping: Record<string, string>,
  workspaceCustomFields?: CustomField[],
): MappedLead | null {
  const getValue = (field: string): string => {
    const csvHeader = columnMapping[field];
    if (!csvHeader) return "";
    return row[csvHeader] || "";
  };

  const firstName = getValue("firstName");
  const lastName = getValue("lastName");
  const email = getValue("email");

  if (!firstName && !lastName && !email) {
    return null;
  }

  const valueStr = getValue("value");
  const tagsStr = getValue("tags");

  // Map custom field values from the CSV
  const customFields: Record<string, string> = {};
  if (workspaceCustomFields) {
    for (const field of workspaceCustomFields) {
      const csvHeader = columnMapping[`cf_${field.id}`];
      if (csvHeader) {
        const val = row[csvHeader]?.trim() || "";
        if (val) {
          customFields[field.id] = val;
        }
      }
    }
  }

  return {
    firstName,
    lastName,
    email,
    phone: getValue("phone") || null,
    company: getValue("company") || null,
    jobTitle: getValue("jobTitle") || null,
    status: getValue("status") || "new",
    source: getValue("source") || null,
    value: valueStr ? parseFloat(valueStr) || null : null,
    currency: getValue("currency") || "USD",
    website: getValue("website") || null,
    linkedin: getValue("linkedin") || null,
    country: getValue("country") || null,
    city: getValue("city") || null,
    tags: tagsStr ? tagsStr.split(";").map((t) => t.trim()).filter(Boolean) : [],
    notes: getValue("notes") || null,
    customFields,
  };
}

export const REQUIRED_FIELDS = ["firstName", "lastName", "email"] as const;

export const LEAD_FIELDS = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "jobTitle", label: "Job Title" },
  { key: "status", label: "Status" },
  { key: "source", label: "Source" },
  { key: "value", label: "Value" },
  { key: "currency", label: "Currency" },
  { key: "website", label: "Website" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "tags", label: "Tags" },
  { key: "notes", label: "Notes" },
] as const;

/**
 * Returns standard lead fields plus workspace custom fields for the CSV mapping UI.
 * Custom fields are prefixed with `cf_` to distinguish them from built-in fields.
 */
export function getLeadFieldsWithCustom(customFields: CustomField[] = []) {
  const standard = LEAD_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    isCustom: false,
  }));

  const custom = customFields.map((f) => ({
    key: `cf_${f.id}`,
    label: `${f.name} (${f.type})`,
    isCustom: true,
  }));

  return [...standard, ...custom];
}

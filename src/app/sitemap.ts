import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.tabishbinishfaq.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  // Core pages
  const core = [
    { url: baseUrl, priority: 1, freq: "weekly" as const },
    { url: `${baseUrl}/login`, priority: 0.4, freq: "monthly" as const },
    { url: `${baseUrl}/register`, priority: 0.4, freq: "monthly" as const },
    { url: `${baseUrl}/privacy`, priority: 0.3, freq: "yearly" as const },
    { url: `${baseUrl}/terms`, priority: 0.3, freq: "yearly" as const },
  ];

  // Feature pages (public-facing, indexable)
  const features = [
    { url: `${baseUrl}/features/projects`, priority: 0.8, freq: "monthly" as const },
    { url: `${baseUrl}/features/invoicing`, priority: 0.8, freq: "monthly" as const },
    { url: `${baseUrl}/features/time-tracking`, priority: 0.8, freq: "monthly" as const },
    { url: `${baseUrl}/features/client-portal`, priority: 0.8, freq: "monthly" as const },
    { url: `${baseUrl}/features/messaging`, priority: 0.7, freq: "monthly" as const },
  ];

  // Documentation
  const docs = [
    { url: `${baseUrl}/docs`, priority: 0.7, freq: "monthly" as const },
    { url: `${baseUrl}/docs/getting-started`, priority: 0.7, freq: "monthly" as const },
    { url: `${baseUrl}/docs/deploy`, priority: 0.7, freq: "monthly" as const },
    { url: `${baseUrl}/docs/architecture`, priority: 0.5, freq: "monthly" as const },
    { url: `${baseUrl}/docs/firebase-setup`, priority: 0.6, freq: "monthly" as const },
    { url: `${baseUrl}/docs/cloudinary-setup`, priority: 0.6, freq: "monthly" as const },
    { url: `${baseUrl}/docs/resend-setup`, priority: 0.6, freq: "monthly" as const },
    { url: `${baseUrl}/docs/google-calendar-setup`, priority: 0.6, freq: "monthly" as const },
    { url: `${baseUrl}/docs/sentry-setup`, priority: 0.5, freq: "monthly" as const },
    { url: `${baseUrl}/docs/env-variables`, priority: 0.6, freq: "monthly" as const },
  ];

  // Comparison pages
  const compare = [
    { url: `${baseUrl}/compare/twenty-vs-leadflow`, priority: 0.6, freq: "monthly" as const },
    { url: `${baseUrl}/compare/espocrm-vs-leadflow`, priority: 0.6, freq: "monthly" as const },
    { url: `${baseUrl}/compare/salesforce-vs-leadflow`, priority: 0.6, freq: "monthly" as const },
    { url: `${baseUrl}/compare/hubspot-vs-leadflow`, priority: 0.6, freq: "monthly" as const },
  ];

  // Blog
  const blog = [
    { url: `${baseUrl}/blog`, priority: 0.7, freq: "weekly" as const },
    { url: `${baseUrl}/blog/how-to-run-crm-on-free-tiers-firebase-vercel`, priority: 0.6, freq: "monthly" as const },
    { url: `${baseUrl}/blog/open-source-crm-without-docker`, priority: 0.6, freq: "monthly" as const },
    { url: `${baseUrl}/blog/leadflow-vs-twenty-crm-comparison`, priority: 0.6, freq: "monthly" as const },
  ];

  const all = [...core, ...features, ...docs, ...compare, ...blog];
  return all.map((p) => ({
    url: p.url,
    lastModified,
    changeFrequency: p.freq,
    priority: p.priority,
  }));
}

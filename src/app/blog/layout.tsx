import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "LeadFlow Blog | Open-Source CRM Guides, Tips & Comparisons",
  description:
    "Learn about open-source CRM, self-hosting, pipeline management, and team productivity. Guides, comparisons, and best practices from the LeadFlow team.",
  openGraph: {
    title: "LeadFlow Blog | Open-Source CRM Guides, Tips & Comparisons",
    description:
      "Learn about open-source CRM, self-hosting, pipeline management, and team productivity. Guides, comparisons, and best practices from the LeadFlow team.",
    url: "https://crm.tabishbinishfaq.dev/blog",
    type: "website",
  },
  keywords: [
    "open-source CRM blog",
    "CRM guides",
    "self-hosting CRM",
    "pipeline management",
    "CRM comparisons",
    "LeadFlow blog",
    "team productivity",
    "CRM best practices",
  ],
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        id="schema-blog-breadcrumb"
        strategy="afterInteractive"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://crm.tabishbinishfaq.dev/" },
              {
                "@type": "ListItem",
                position: 2,
                name: "Blog",
                item: "https://crm.tabishbinishfaq.dev/blog",
              },
            ],
          }),
        }}
      />
      {children}
    </>
  );
}

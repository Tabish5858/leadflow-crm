import { ThemeProvider } from "@/components/shared/theme-provider";
import { Providers } from "@/components/shared/providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crm.tabishbinishfaq.dev";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "LeadFlow - Open-Source CRM | Pipeline, Projects, Invoices & Client Portal",
    template: "%s | LeadFlow CRM",
  },
  description:
    "Open-source CRM with pipeline management, project tracking, invoicing, time tracking, messaging, and client portal — all in one platform. Self-host on any Node.js server or try instantly. No signup needed.",
  keywords: [
    "open source CRM",
    "self-hosted CRM",
    "free CRM software",
    "sales pipeline software",
    "client portal software",
    "project management CRM",
    "invoicing software",
    "time tracking CRM",
    "CRM for freelancers",
    "small business CRM",
  ],
  authors: [{ name: "LeadFlow Contributors" }],
  applicationName: "LeadFlow",
  creator: "LeadFlow",
  publisher: "LeadFlow",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "LeadFlow",
    title: "LeadFlow - Open-Source CRM with Pipeline, Projects, Invoices & Client Portal",
    description:
      "Pipeline management, projects, invoices, time tracking, messaging, and client portal — all open source. Self-host or try instantly. No signup needed.",
    images: [
      {
        url: `${baseUrl}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: "LeadFlow Open-Source CRM - Pipeline, Projects, Invoices & Client Portal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadFlow - Open-Source CRM",
    description:
      "Pipeline, projects, invoices, time tracking & client portal — all in one open-source platform.",
    images: [`${baseUrl}/og-image.svg`],
  },
  icons: {
    icon: "/branding/leadflow-logo.svg",
    apple: "/branding/leadflow-logo.svg",
  },
  alternates: {
    canonical: baseUrl,
  },
  category: "business",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${plusJakarta.variable} font-sans antialiased flex flex-col min-h-screen`}
      >
        {/* Skip-to-content link (accessibility) */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>

        {/* Ambient background glow - subtle primary accent */}
        <div className="fixed inset-0 z-[-1] pointer-events-none" aria-hidden="true">
          <div className="absolute top-[-20%] left-[15%] w-[65%] h-[600px] bg-primary-600/10 blur-[150px] rounded-full mix-blend-screen animate-pulse-slow" />
          <div className="absolute bottom-[-10%] right-[10%] w-[45%] h-[400px] bg-primary-400/5 blur-[120px] rounded-full mix-blend-screen animate-float" />
          <div className="absolute inset-0 bg-grid" />
        </div>

        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={300} skipDelayDuration={100}>
            <Providers>
              <main id="main-content" tabIndex={-1} className="flex-1">
                {children}
              </main>
              <Toaster />
            </Providers>
          </TooltipProvider>
        </ThemeProvider>

        {/* Structured Data: SoftwareApplication */}
        <Script
          id="schema-software-application"
          strategy="beforeInteractive"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "LeadFlow",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, Linux, macOS, Windows",
              description:
                "Open-source CRM with pipeline management, project tracking, invoicing, time tracking, messaging, and client portal. Self-host on any Node.js server.",
              url: baseUrl,
              sameAs: [
                "https://github.com/Tabish5858/Leadflow-CRM",
              ],
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                priceValidUntil: new Date(
                  Date.now() + 365 * 24 * 60 * 60 * 1000
                ).toISOString(),
                availability: "https://schema.org/InStock",
              },
              license:
                "https://github.com/Tabish5858/Leadflow-CRM/blob/main/LICENSE",
            }),
          }}
        />

        {/* Structured Data: Organization */}
        <Script
          id="schema-organization"
          strategy="beforeInteractive"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "LeadFlow",
              url: baseUrl,
              logo: `${baseUrl}/branding/leadflow-logo.svg`,
              sameAs: [
                "https://github.com/Tabish5858/Leadflow-CRM",
              ],
              description:
                "Open-source CRM platform for modern teams. Pipeline management, projects, invoices, time tracking, messaging, and client portal.",
            }),
          }}
        />

        {/* Google Analytics 4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
              send_page_view: true,
              page_title: document.title,
            });
          `}
        </Script>

        {/* Microsoft Clarity - user behavior analytics */}
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "wz6pp8z9em");
            `,
          }}
        />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

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

export const metadata: Metadata = {
  title: "LeadFlow — Open-Source CRM & Time Tracker",
  description:
    "A modern, lightweight CRM for freelancers, small teams, and agencies. Manage leads, track outreach, and analyze performance.",
  keywords: ["CRM", "time tracker", "lead management", "open source", "sales pipeline"],
  authors: [{ name: "LeadFlow Contributors" }],
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

        {/* Ambient background glow — subtle primary accent */}
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
            <main id="main-content" tabIndex={-1} className="flex-1">
              {children}
            </main>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

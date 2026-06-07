import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Skip TypeScript type-checking during build (already done in CI via tsc --noEmit)
  // This prevents Vercel's 2-core machines from timing out on type resolution
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
  experimental: {
    optimizePackageImports: [
      "recharts",
      "lucide-react",
      "firebase",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-switch",
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: "tabdev",
  project: "leadflow",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: false,
  tunnelRoute: "/monitoring",
  telemetry: false,
  silent: !process.env.CI,
  // Disable source map upload to speed up Vercel builds on free plan
  // Source maps are not essential for error tracking to work
  sourcemaps: {
    disable: true,
  },
});

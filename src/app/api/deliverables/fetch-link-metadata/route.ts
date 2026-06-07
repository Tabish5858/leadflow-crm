import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware";

// Blocklist of internal/private hosts to prevent SSRF
const BLOCKED_HOST_PATTERNS: readonly string[] = [
  "127.0.0.1",
  "localhost",
  "0.0.0.0",
  "169.254.169.254", // AWS/Azure/GCP metadata endpoint
  "metadata.google.internal", // GCP metadata
  "[::1]", // IPv6 loopback
] as const;

const BLOCKED_IP_RANGES = [
  { start: ipToInt("10.0.0.0"), end: ipToInt("10.255.255.255") },
  { start: ipToInt("172.16.0.0"), end: ipToInt("172.31.255.255") },
  { start: ipToInt("192.168.0.0"), end: ipToInt("192.168.255.255") },
  { start: ipToInt("127.0.0.0"), end: ipToInt("127.255.255.255") },
  { start: ipToInt("0.0.0.0"), end: ipToInt("0.255.255.255") },
  { start: ipToInt("169.254.0.0"), end: ipToInt("169.254.255.255") },
];

function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIp(hostname: string): boolean {
  // Check against blocklist first (covers hostnames and raw IPs)
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOST_PATTERNS.some((p) => lower === p || lower.endsWith(`.${p}`))) {
    return true;
  }

  // Check CIDR ranges for IP addresses
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    const ipInt = ipToInt(hostname);
    return BLOCKED_IP_RANGES.some((range) => ipInt >= range.start && ipInt <= range.end);
  }

  return false;
}

/**
 * Fetches metadata (title, description, favicon, site name, image) for a given URL.
 * Used by the deliverable version adding modal to show rich link previews.
 */
export async function POST(req: NextRequest) {
  return withAuth(req, async (ctx) => {
    try {
      const { url } = await req.json();

      if (!url || typeof url !== "string") {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
      }

      // Validate URL
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
      } catch {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }

      // Block non-HTTP protocols (file://, ftp://, gopher://, etc.)
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return NextResponse.json({ error: "Only HTTP and HTTPS URLs are allowed" }, { status: 400 });
      }

      // Block internal/private IPs and hostnames (SSRF prevention)
      if (isPrivateIp(parsedUrl.hostname)) {
        return NextResponse.json({ error: "Cannot fetch metadata from internal URLs" }, { status: 400 });
      }

      // Fetch the page and extract metadata
      const response = await fetch(parsedUrl.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LeadFlow/1.0; +https://leadflow.app)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(5000),
      });

      const html = await response.text();

      // Extract metadata using regex (simple, no parser needed)
      const getMeta = (name: string): string | null => {
        const patterns = [
          new RegExp(`<meta\\s+[^>]*property=["']og:${name}["'][^>]*content=["']([^"']*)["']`, "i"),
          new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"),
          new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*property=["']og:${name}["']`, "i"),
          new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["']`, "i"),
        ];
        for (const p of patterns) {
          const m = html.match(p);
          if (m?.[1]) return m[1];
        }
        return null;
      };

      const title =
        getMeta("title") ||
        html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ||
        parsedUrl.hostname;
      const description = getMeta("description");
      const image = getMeta("image");
      const siteName = getMeta("site_name");

      // Extract favicon
      const faviconMatch = html.match(
        /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i
      );
      let favicon = faviconMatch?.[1] || null;
      if (favicon && !favicon.startsWith("http")) {
        favicon = new URL(favicon, parsedUrl.origin).toString();
      }
      if (!favicon) {
        favicon = `${parsedUrl.origin}/favicon.ico`;
      }

      return NextResponse.json({
        success: true,
        metadata: {
          title: title?.trim() || parsedUrl.hostname,
          description: description?.trim() || null,
          image: image || null,
          favicon,
          siteName: siteName?.trim() || parsedUrl.hostname,
        },
      });
    } catch (error) {
      console.error("Link metadata fetch error:", error);
      // Return basic metadata on error
      return NextResponse.json({
        success: false,
        metadata: {
          title: new URL(req.headers.get("referer") || "https://example.com").hostname,
          description: null,
          image: null,
          favicon: null,
          siteName: null,
        },
      });
    }
  });
}

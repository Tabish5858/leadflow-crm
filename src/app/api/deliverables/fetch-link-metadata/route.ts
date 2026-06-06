import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api/middleware";

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

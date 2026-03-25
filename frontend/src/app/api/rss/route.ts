import { NextResponse } from "next/server";

/**
 * Subscriber-Only RSS Feed
 *
 * Produces an RSS 2.0 feed of the latest translated headlines.
 * Requires a valid Stripe customer ID with an active subscription.
 *
 * URL: /api/rss?token=cus_XXXXX
 *      /api/rss?token=cus_XXXXX&region=mexico
 *
 * The token is the subscriber's Stripe customer ID. The route checks
 * Stripe for an active subscription before serving the feed.
 */

const SITE_URL = "https://regionalpulsenews.com";
const ALL_REGIONS = ["south-america", "mexico", "central-america", "europe"];
const FETCH_TIMEOUT_MS = 8000;

const REGION_NAMES: Record<string, string> = {
  "south-america": "South America",
  mexico: "Mexico",
  "central-america": "Central America",
  europe: "Europe",
};

type BackendItem = {
  title: string;
  link: string;
  published_utc?: string;
  title_en?: string | null;
  summary_en?: string | null;
  summary?: string | null;
  source_name?: string;
};

type BackendCluster = {
  cluster_id: string;
  best_item: BackendItem;
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Check Stripe for an active subscription on this customer */
async function hasActiveSubscription(customerId: string): Promise<boolean> {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) return false;

  try {
    const res = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=active&limit=1`,
      { headers: { Authorization: `Bearer ${sk}` } }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return data?.data?.length > 0;
  } catch {
    return false;
  }
}

async function fetchRegion(
  region: string,
  host: string
): Promise<{ region: string; clusters: BackendCluster[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${host}/api/top?region=${region}&range=24h&limit=30`,
      { cache: "no-store", signal: controller.signal }
    );
    if (!res.ok) return { region, clusters: [] };
    const data = await res.json();
    return { region, clusters: data?.clusters ?? [] };
  } catch {
    return { region, clusters: [] };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const regionParam = searchParams.get("region");

  // --- Auth gate: must be a paying subscriber ---
  if (!token || !token.startsWith("cus_")) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Regional Pulse News — Subscription Required</title>
    <link>${SITE_URL}</link>
    <description>RSS feeds are available to subscribers. Visit ${SITE_URL} to subscribe for just $1.99/month.</description>
  </channel>
</rss>`,
      {
        status: 403,
        headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
      }
    );
  }

  const active = await hasActiveSubscription(token);
  if (!active) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Regional Pulse News — Subscription Expired</title>
    <link>${SITE_URL}</link>
    <description>Your subscription is no longer active. Visit ${SITE_URL} to resubscribe and restore your RSS feed.</description>
  </channel>
</rss>`,
      {
        status: 403,
        headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
      }
    );
  }

  // --- Build the feed ---
  const regions =
    regionParam && ALL_REGIONS.includes(regionParam)
      ? [regionParam]
      : ALL_REGIONS;

  const feedTitle =
    regions.length === 1
      ? `Regional Pulse News — ${REGION_NAMES[regions[0]] || regions[0]}`
      : "Regional Pulse News";

  const feedDescription =
    regions.length === 1
      ? `Latest translated headlines from ${REGION_NAMES[regions[0]] || regions[0]}`
      : "Latest translated headlines from Latin America and Europe";

  const requestUrl = new URL(request.url);
  const host = `${requestUrl.protocol}//${requestUrl.host}`;

  const results = await Promise.all(regions.map((r) => fetchRegion(r, host)));

  const seen = new Set<string>();
  const items: string[] = [];

  for (const { region, clusters } of results) {
    for (const c of clusters) {
      const item = c.best_item;
      if (!item?.title) continue;

      const title = item.title_en || item.title;
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
      const articleUrl = `${SITE_URL}/article/${encodeURIComponent(region)}/${encodeURIComponent(c.cluster_id)}/${slug}`;

      if (seen.has(articleUrl)) continue;
      seen.add(articleUrl);

      const description =
        item.summary_en || item.summary || "Read the full story on Regional Pulse News.";
      const pubDate = item.published_utc
        ? new Date(item.published_utc).toUTCString()
        : new Date().toUTCString();
      const source = item.source_name || "";

      items.push(`    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(articleUrl)}</link>
      <description>${escapeXml(typeof description === "string" ? description.slice(0, 500) : "")}</description>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <guid isPermaLink="true">${escapeXml(articleUrl)}</guid>${source ? `\n      <source url="${escapeXml(SITE_URL)}">${escapeXml(source)}</source>` : ""}
    </item>`);
    }
  }

  const selfUrl = `${SITE_URL}/api/rss?token=${token}${regionParam ? `&region=${regionParam}` : ""}`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(feedDescription)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>15</ttl>
${items.join("\n")}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "private, s-maxage=900, stale-while-revalidate=1800",
    },
  });
}

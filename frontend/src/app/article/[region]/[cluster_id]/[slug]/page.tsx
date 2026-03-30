import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Source = {
  source: string;
  link: string;
  published_utc?: string;
};

type BestItem = {
  title: string;
  title_en?: string | null;
  summary_en?: string | null;
  snippet_text?: string;
  link: string;
  source: string;
  published_utc?: string;
  region_key?: string;
  country_key?: string;
  country_code?: string;
  country_flag_url?: string;
  source_logo?: string;
  source_category_primary?: string;
};

type Cluster = {
  cluster_id: string;
  topic?: string;
  duplicates_count?: number;
  sources_count?: number;
  sources?: Source[];
  best_item: BestItem;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SITE_URL = "https://regionalpulsenews.com";

const REGION_LABELS: Record<string, string> = {
  "south-america": "South America",
  mexico: "Mexico",
  "central-america": "Central America",
  europe: "Europe",
};

function translateUrl(originalUrl: string): string {
  return `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(originalUrl)}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ */
/*  Data fetching                                                      */
/* ------------------------------------------------------------------ */

async function fetchCluster(
  region: string,
  clusterId: string
): Promise<Cluster | null> {
  const backend =
    process.env.BACKEND_URL || "http://127.0.0.1:8000";

  try {
    // Direct cluster lookup — works for any age article
    const res = await fetch(
      `${backend}/cluster/${encodeURIComponent(clusterId)}`,
      { next: { revalidate: 300 } } // ISR: revalidate every 5 min
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (data?.found && data?.cluster) {
      return data.cluster as Cluster;
    }
    return null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Metadata (server-side, for crawlers and AI engines)                */
/* ------------------------------------------------------------------ */

type PageProps = {
  params: Promise<{ region: string; cluster_id: string; slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { region, cluster_id } = await params;
  const cluster = await fetchCluster(region, cluster_id);

  if (!cluster) {
    return { title: "Article not found | Regional Pulse News" };
  }

  const item = cluster.best_item;
  const title = item.title_en || item.title;
  const description =
    item.summary_en ||
    item.snippet_text ||
    `${title} — from ${item.source}, translated for you by Regional Pulse News.`;

  const regionLabel = REGION_LABELS[region] || region;
  const pageUrl = `${SITE_URL}/article/${region}/${cluster_id}/${encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80))}`;

  return {
    title: `${title} | Regional Pulse News`,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Regional Pulse News",
      type: "article",
      publishedTime: item.published_utc,
      section: cluster.topic || regionLabel,
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default async function ArticlePage({ params }: PageProps) {
  const { region, cluster_id } = await params;
  const cluster = await fetchCluster(region, cluster_id);

  if (!cluster) {
    notFound();
  }

  const item = cluster.best_item;
  const title = item.title_en || item.title;
  const summary = item.summary_en;
  const snippet = item.snippet_text;
  const regionLabel = REGION_LABELS[region] || region;
  const pubDate = item.published_utc;
  const countryCode = item.country_code?.toUpperCase();
  const flagUrl = item.country_flag_url;
  const topic = cluster.topic;
  const sourceCount = cluster.sources_count || 1;
  const sources = cluster.sources || [];

  // JSON-LD: NewsArticle structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description: summary || snippet || title,
    datePublished: pubDate,
    dateModified: pubDate,
    author: {
      "@type": "Organization",
      name: "Regional Pulse News",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Regional Pulse News",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon-512.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/article/${region}/${cluster_id}`,
    },
    articleSection: topic || regionLabel,
    inLanguage: "en",
    isAccessibleForFree: true,
    image: `${SITE_URL}/og-image.png`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
        {/* Breadcrumb */}
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>/</span>
          <Link
            href={`/?region=${encodeURIComponent(region)}`}
            className="hover:underline"
          >
            {regionLabel}
          </Link>
          {countryCode && (
            <>
              <span>/</span>
              <span className="flex items-center gap-1">
                {flagUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={flagUrl}
                    alt={countryCode}
                    width={20}
                    height={14}
                    className="inline-block"
                  />
                )}
                {countryCode}
              </span>
            </>
          )}
        </nav>

        {/* Topic badge + timestamp */}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          {topic && (
            <span className="rounded-full bg-blue-100 px-3 py-0.5 font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              {topic}
            </span>
          )}
          {pubDate && (
            <time
              dateTime={pubDate}
              className="text-gray-500 dark:text-gray-400"
              title={formatDate(pubDate)}
            >
              {formatDate(pubDate)} · {relativeTime(pubDate)}
            </time>
          )}
        </div>

        {/* Headline */}
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-gray-950 dark:text-white sm:text-4xl">
          {title}
        </h1>

        {/* Original title if different */}
        {item.title_en && item.title !== item.title_en && (
          <p className="mt-2 text-sm italic text-gray-500 dark:text-gray-400">
            Original: {item.title}
          </p>
        )}

        {/* Summary */}
        {summary && (
          <section className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/50">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              AI-Translated Summary
            </h2>
            <p className="text-base leading-relaxed text-gray-800 dark:text-gray-200">
              {summary}
            </p>
          </section>
        )}

        {/* Snippet fallback */}
        {!summary && snippet && (
          <section className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/50">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Excerpt
            </h2>
            <p className="text-base leading-relaxed text-gray-800 dark:text-gray-200">
              {snippet}
            </p>
          </section>
        )}

        {/* Source info */}
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {sourceCount > 1
              ? `Reported by ${sourceCount} sources`
              : "Source"}
          </h2>

          <div className="space-y-3">
            {/* Primary source */}
            <div className="flex items-center gap-3">
              {item.source_logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.source_logo}
                  alt=""
                  width={20}
                  height={20}
                  className="rounded"
                />
              )}
              <span className="font-medium text-gray-900 dark:text-white">
                {item.source}
              </span>
            </div>

            {/* Additional sources */}
            {sources.length > 1 &&
              sources
                .filter((s) => s.link !== item.link)
                .map((s, i) => (
                  <div key={i} className="flex items-center gap-3 pl-1 text-sm text-gray-600 dark:text-gray-400">
                    <span>+</span>
                    <a
                      href={translateUrl(s.link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {s.source}
                    </a>
                    {s.published_utc && (
                      <span className="text-xs text-gray-400">
                        {relativeTime(s.published_utc)}
                      </span>
                    )}
                  </div>
                ))}
          </div>
        </section>

        {/* CTA buttons */}
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={translateUrl(item.link)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Open Translated Article ↗
          </a>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            View Original Source ↗
          </a>
        </div>

        {/* Disclaimer */}
        <p className="mt-8 text-xs leading-relaxed text-gray-400 dark:text-gray-500">
          This summary was generated by Regional Pulse News using automated translation.
          We link to the original source and do not reproduce full articles.
          For the complete story, visit the original publisher above.
        </p>

        {/* Back link */}
        <div className="mt-10 border-t border-gray-200 pt-6 dark:border-gray-800">
          <Link
            href={`/?region=${encodeURIComponent(region)}`}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Back to {regionLabel} headlines
          </Link>
        </div>
      </main>
    </>
  );
}

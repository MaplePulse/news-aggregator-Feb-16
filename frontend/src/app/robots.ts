import type { MetadataRoute } from "next";

// The Google News sitemap lives under /api/, which is otherwise off limits to
// crawlers. Allow that one path explicitly (the more specific rule wins) so
// Google can actually read the sitemap we point it to below.
const NEWS_SITEMAP_PATH = "/api/sitemap-news";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", NEWS_SITEMAP_PATH],
        disallow: ["/api/"],
      },
      {
        userAgent: "Googlebot-News",
        allow: ["/", NEWS_SITEMAP_PATH],
        disallow: ["/api/"],
      },
    ],
    sitemap: [
      "https://regionalpulsenews.com/sitemap.xml",
      "https://regionalpulsenews.com/api/sitemap-news",
    ],
  };
}

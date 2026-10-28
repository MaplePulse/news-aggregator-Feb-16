import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Umami Cloud (EU). The website ID isn't secret: it's visible in every page's HTML.
const UMAMI_SCRIPT_URL = "https://cloud.umami.is/script.js";
const UMAMI_WEBSITE_ID = "944c2141-080f-44f2-917c-93b54d9c9175";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Regional Pulse News",
  description: "Regional News, Translated for You. English-language news coverage from Latin America and Europe.",
  metadataBase: new URL("https://regionalpulsenews.com"),
  verification: {
    google: "YfnQP82JdSy9wAdS1EySEJbMjMj2y4tct8AJuDPNcVQ",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Regional Pulse News",
    description: "Regional News, Translated for You. English-language news coverage from Latin America and Europe.",
    url: "https://regionalpulsenews.com",
    siteName: "Regional Pulse News",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Regional Pulse News - Regional News, Translated for You",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Regional Pulse News",
    description: "Regional News, Translated for You. English-language news coverage from Latin America and Europe.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-1024.png", sizes: "1024x1024", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  alternates: {
    canonical: "https://regionalpulsenews.com",
  },
};

function ThemeInitScript() {
  const code = `
(function () {
  try {
    var saved = localStorage.getItem("theme");
    var theme = (saved === "light" || saved === "dark") ? saved : "dark";
    var root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  } catch (e) {}
})();
  `.trim();

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

// Reading time, for analytics. Umami's own visit time only counts the gap between
// the first and last page view, so a visitor who reads one page and leaves shows 0s.
// This counts the time a page is on screen, with each gap between scrolls/taps/keys
// capped at 2 minutes so a tab left open doesn't count the time away, and sends it
// as a "read_time" event when the page is hidden, closed, or swapped for another.
function ReadingTimeScript() {
  const code = `
(function () {
  try {
    var MAX_GAP = 120000;
    var ms = 0, lastAt = document.hidden ? 0 : Date.now(), path = location.pathname;
    function count() {
      var now = Date.now();
      if (lastAt) ms += Math.min(now - lastAt, MAX_GAP);
      lastAt = now;
    }
    function send() {
      var secs = Math.round(ms / 1000);
      ms = 0;
      if (secs >= 1 && window.umami && window.umami.track) {
        window.umami.track("read_time", { secs: secs, page: path.slice(0, 200) });
      }
    }
    function activity() {
      if (document.hidden) return;
      if (location.pathname !== path) {
        // Moved to another page in the site: the time so far belongs to the old one.
        count(); send(); path = location.pathname;
      } else count();
    }
    ["scroll", "pointerdown", "keydown", "touchstart", "wheel"].forEach(function (t) {
      window.addEventListener(t, activity, { passive: true, capture: true });
    });
    var moved = 0;
    window.addEventListener("mousemove", function () {
      var now = Date.now();
      if (now - moved > 5000) { moved = now; activity(); }
    }, { passive: true });
    window.addEventListener("popstate", activity);
    var push = history.pushState;
    history.pushState = function () {
      var r = push.apply(this, arguments);
      activity();
      return r;
    };
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (lastAt) { count(); lastAt = 0; } send(); }
      else { lastAt = Date.now(); if (location.pathname !== path) path = location.pathname; }
    });
    window.addEventListener("pagehide", function () {
      if (lastAt) { count(); lastAt = 0; }
      send();
    });
  } catch (e) {}
})();
  `.trim();

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

// Google Analytics beside Umami (the same snippet runs on all the owner's sites). Outside
// Europe GA counts visits with its usual cookie, never ads data. In Europe (EEA, UK,
// Switzerland, decided by Google from the IP) it sends cookieless pings only, unless the
// visitor taps Allow on the prompt, which visitors on a European time zone see once.
// Live site only; Do Not Track turns it off, like Umami. The choice can be changed on
// /privacy (window.siteConsent).
function GoogleAnalyticsScript() {
  const code = `
window.ANALYTICS_OFF = navigator.doNotTrack === '1' || window.doNotTrack === '1';
(function () {
  var GA_ID = 'G-E8VMKSTYET';
  var LIVE = ['regionalpulsenews.com', 'www.regionalpulsenews.com'];
  var PRIVACY_URL = '/privacy';
  var AUTO_PROMPT = true;

  var KEY = 'ga-consent';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { dataLayer.push(arguments); };

  var tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
  var inEurope = /^(Europe\\/|Atlantic\\/(Canary|Madeira|Azores|Reykjavik|Faroe)|Arctic\\/Longyearbyen|Asia\\/(Nicosia|Famagusta))/.test(tz);
  var read = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  var on = LIVE.indexOf(location.hostname) >= 0 && !window.ANALYTICS_OFF;

  var promptEl = null;
  window.siteConsent = {
    inEurope: inEurope,
    choice: read,
    set: function (c) {
      try { localStorage.setItem(KEY, c); } catch (e) {}
      gtag('consent', 'update', {analytics_storage: c === 'granted' ? 'granted' : 'denied'});
      if (promptEl) { promptEl.remove(); promptEl = null; }
    },
    showPrompt: function () {
      if (!on || !inEurope || read() || promptEl) return;
      var st = document.createElement('style');
      st.textContent = '.gac-bar{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:560px;margin:0 auto;' +
        'background:#1f2933;color:#f5f7fa;border-radius:12px;padding:14px 16px;box-shadow:0 6px 24px rgba(0,0,0,.35);' +
        'font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
        '.gac-bar a{color:#9fd3ff}.gac-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}' +
        '.gac-bar button{font:inherit;font-weight:600;border-radius:8px;padding:8px 16px;cursor:pointer;border:1px solid #52606d;background:transparent;color:#f5f7fa}' +
        '.gac-bar button.gac-yes{background:#f5f7fa;color:#1f2933;border-color:#f5f7fa}';
      document.head.appendChild(st);
      promptEl = document.createElement('div');
      promptEl.className = 'gac-bar';
      promptEl.setAttribute('role', 'dialog');
      promptEl.setAttribute('aria-label', 'Visit counting');
      promptEl.innerHTML = 'Can we count your visit with Google Analytics? It uses a cookie so we can tell new visitors ' +
        'from returning ones. No ads, nothing personal. <a href="' + PRIVACY_URL + '">More</a>' +
        '<div class="gac-btns"><button type="button" class="gac-no">No thanks</button>' +
        '<button type="button" class="gac-yes">Allow</button></div>';
      promptEl.querySelector('.gac-no').onclick = function () { siteConsent.set('denied'); };
      promptEl.querySelector('.gac-yes').onclick = function () { siteConsent.set('granted'); };
      document.body.appendChild(promptEl);
    }
  };
  if (!on) return;

  var EUROPE = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL',
    'PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH'];
  var noAds = {ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'};
  gtag('consent', 'default', Object.assign({analytics_storage: 'denied', region: EUROPE}, noAds));
  gtag('consent', 'default', Object.assign({analytics_storage: 'granted'}, noAds));
  var saved = read();
  if (saved) gtag('consent', 'update', {analytics_storage: saved === 'granted' ? 'granted' : 'denied'});

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  gtag('js', new Date());
  gtag('config', GA_ID, {allow_google_signals: false, allow_ad_personalization_signals: false});

  if (AUTO_PROMPT) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', siteConsent.showPrompt);
    else siteConsent.showPrompt();
  }
})();
  `.trim();

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

function ServiceWorkerRegisterScript() {
  const code = `
(function () {
  try {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {
        // silent fail (dev / incognito / etc.)
      });
    });
  } catch (e) {}
})();
  `.trim();

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Umami: cookie-free analytics. data-domains limits counting to the live
            site, so staging previews and local dev don't pollute the stats. */}
        <Script
          src={UMAMI_SCRIPT_URL}
          data-website-id={UMAMI_WEBSITE_ID}
          data-domains="regionalpulsenews.com,www.regionalpulsenews.com"
          data-do-not-track="true"
          strategy="afterInteractive"
        />
        <GoogleAnalyticsScript />
        <ThemeInitScript />
        <ReadingTimeScript />
        <ServiceWorkerRegisterScript />

        {/* Structured data: NewsMediaOrganization for Google News */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "NewsMediaOrganization",
              name: "Regional Pulse News",
              url: "https://regionalpulsenews.com",
              logo: {
                "@type": "ImageObject",
                url: "https://regionalpulsenews.com/icon-512.png",
                width: 512,
                height: 512,
              },
              sameAs: [],
              description:
                "English-language news aggregator covering Latin America and Europe. Translated headlines and summaries from regional sources.",
              foundingDate: "2025",
              actionableFeedbackPolicy: "https://regionalpulsenews.com/about",
              correctionsPolicy: "https://regionalpulsenews.com/about",
              ethicsPolicy: "https://regionalpulsenews.com/about",
              masthead: "https://regionalpulsenews.com/about",
              publishingPrinciples: "https://regionalpulsenews.com/about",
            }),
          }}
        />

        {/* Structured data: WebSite with SearchAction for sitelinks search */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Regional Pulse News",
              url: "https://regionalpulsenews.com",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://regionalpulsenews.com/?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />

        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#faf9f7" media="(prefers-color-scheme: light)" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#faf9f7] text-gray-950 dark:bg-black dark:text-white min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Best-effort cleanup only. The CSP sandbox header below is what actually
// stops scripts, since regex stripping can't catch every trick.
function stripDangerousTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<(object|embed|form|base|meta)\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:/gi, "$1=$2#");
}

function addBasicStyles(bodyHtml: string, title: string) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title || "Article")}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; line-height: 1.55; }
    h1 { font-size: 22px; margin: 0 0 14px; }
    a { word-break: break-word; }
    img { max-width: 100%; height: auto; }
    figure { margin: 18px 0; }
    .meta { color: #666; font-size: 12px; margin-bottom: 18px; }
    .content { max-width: 900px; }
  </style>
</head>
<body>
  <div class="content">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// The reader only exists for La Diaria links (see openTranslated in page.tsx).
// Anything else is refused so this route can't be used as an open proxy.
const ALLOWED_HOSTS = ["ladiaria.com.uy"];
const FETCH_TIMEOUT_MS = 10000;
const MAX_HTML_BYTES = 3 * 1024 * 1024;

function isAllowedHost(hostname: string) {
  const h = hostname.toLowerCase();
  return ALLOWED_HOSTS.some((d) => h === d || h.endsWith(`.${d}`));
}

function safeUrl(raw: string) {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (!isAllowedHost(u.hostname)) return null;
  return u;
}

// Third-party HTML is served from our origin, so lock it down:
// no scripts, no forms, opaque origin (no access to our localStorage).
const SANDBOX_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "Content-Security-Policy":
    "sandbox; default-src 'none'; img-src https: data:; style-src 'unsafe-inline' https:; font-src https: data:",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("url") || "";
  const u = safeUrl(raw);
  if (!u) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(u.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }

  // Redirects are followed, so re-check where we actually ended up.
  const finalUrl = safeUrl(res.url || u.toString());
  if (!finalUrl) {
    return NextResponse.json({ error: "Redirected to a disallowed host" }, { status: 400 });
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType && !contentType.includes("html")) {
    return NextResponse.json({ error: "Not an HTML page" }, { status: 415 });
  }
  if (Number(res.headers.get("content-length") || 0) > MAX_HTML_BYTES) {
    return NextResponse.json({ error: "Page too large" }, { status: 413 });
  }

  const html = (await res.text()).slice(0, MAX_HTML_BYTES);
  if (!html) {
    return NextResponse.json({ error: "Empty response" }, { status: 502 });
  }

  let cleaned = stripDangerousTags(html);

  // Best-effort: remove common overlay classes by keyword
  cleaned = cleaned.replace(
    /class="[^"]*(paywall|modal|overlay|subscribe|wall)[^"]*"/gi,
    'class=""'
  );

  const titleMatch = cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "Article";

  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyInner = bodyMatch ? bodyMatch[1] : cleaned;

  const header = `
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">
      Source: <a href="${escapeHtml(u.toString())}" target="_blank" rel="noreferrer">${escapeHtml(
    u.hostname
  )}</a>
    </div>
  `;

  const out = addBasicStyles(header + bodyInner, title);

  return new NextResponse(out, { headers: SANDBOX_HEADERS });
}
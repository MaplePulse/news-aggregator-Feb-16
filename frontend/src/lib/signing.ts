import crypto from "crypto";

/**
 * Server-only signing helpers for subscriber tokens and restore codes.
 *
 * Secret: APP_SIGNING_SECRET if set. Otherwise a key derived from
 * STRIPE_SECRET_KEY with a fixed label, so the raw Stripe key is never used
 * directly as an HMAC key and nothing breaks before the new env var exists.
 */
function signingKey(): Buffer | null {
  const own = (process.env.APP_SIGNING_SECRET || "").trim();
  if (own) return Buffer.from(own, "utf8");
  const sk = (process.env.STRIPE_SECRET_KEY || "").trim();
  if (!sk) return null;
  return crypto.createHmac("sha256", sk).update("rpn-app-signing-v1").digest();
}

export function hmacHex(label: string, payload: string): string | null {
  const key = signingKey();
  if (!key) return null;
  return crypto.createHmac("sha256", key).update(`${label}:${payload}`).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/**
 * Subscriber tokens: "v1.<payload>.<sig>", URL-safe.
 *  - scope "session": kept in the browser, unlocks the billing portal.
 *  - scope "rss": goes in feed URLs, only unlocks the RSS feed.
 * Keeping them apart means a feed URL shared with a reader app
 * can't be used to open someone's billing portal.
 */
export type TokenScope = "session" | "rss";

export function signSubscriberToken(customerId: string, scope: TokenScope): string | null {
  const payload = Buffer.from(JSON.stringify({ c: customerId, s: scope })).toString("base64url");
  const sig = hmacHex("subscriber", payload);
  if (!sig) return null;
  return `v1.${payload}.${Buffer.from(sig, "hex").toString("base64url")}`;
}

/** Returns the Stripe customer ID if the token is valid for this scope, else null. */
export function verifySubscriberToken(token: string, scope: TokenScope): string | null {
  const parts = (token || "").split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const [, payload, sig] = parts;
  const expected = hmacHex("subscriber", payload);
  if (!expected) return null;
  if (!safeEqual(Buffer.from(expected, "hex").toString("base64url"), sig)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data?.s !== scope || typeof data?.c !== "string" || !data.c.startsWith("cus_")) return null;
    return data.c;
  } catch {
    return null;
  }
}

/** Both tokens for a verified customer, for the browser to store. */
export function issueSubscriberTokens(customerId: string | null | undefined) {
  if (!customerId) return { token: null, rssToken: null };
  return {
    token: signSubscriberToken(customerId, "session"),
    rssToken: signSubscriberToken(customerId, "rss"),
  };
}

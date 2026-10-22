import { clientIp } from "@/lib/rateLimit";

/**
 * Headers for calls to the FastAPI backend's protected endpoints (/enrich, /feedback).
 * BACKEND_SHARED_SECRET must match the same env var on Render; when it's set
 * there, the backend refuses calls that don't carry it, so nobody can hit
 * those endpoints directly. X-Client-IP lets the backend rate-limit the real
 * visitor rather than Vercel's server address (it only trusts it alongside the secret).
 */
export function backendHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = (process.env.BACKEND_SHARED_SECRET || "").trim();
  if (secret) {
    headers["X-Backend-Key"] = secret;
    headers["X-Client-IP"] = clientIp(request);
  }
  return headers;
}

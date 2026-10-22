import crypto from "crypto";
import { hmacHex, safeEqual } from "@/lib/signing";

// 8 characters from 31 unambiguous symbols (no 0/O, 1/I/L) ≈ 8.5e11 combinations,
// so guessing a code within its 10-minute life isn't practical even without
// a shared attempt counter.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const RESTORE_CODE_LENGTH = 8;
export const RESTORE_CODE_TTL_S = 600;

export function generateRestoreCode(): string {
  let out = "";
  for (let i = 0; i < RESTORE_CODE_LENGTH; i++) {
    out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return out;
}

/** Uppercases and drops spaces/dashes so "abcd-efgh" matches "ABCDEFGH". */
export function normalizeRestoreCode(code: string): string {
  return (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Shown in the email as ABCD-EFGH for readability. */
export function formatRestoreCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function signRestoreToken(email: string, code: string, expiresAt: number): string | null {
  const hmac = hmacHex("restore", `${email}:${code}:${expiresAt}`);
  if (!hmac) return null;
  return Buffer.from(JSON.stringify({ email, expiresAt, hmac })).toString("base64url");
}

export type RestoreCheck = "ok" | "expired" | "invalid";

export function checkRestoreToken(token: string, email: string, code: string): RestoreCheck {
  let decoded: { email?: unknown; expiresAt?: unknown; hmac?: unknown } | null;
  try {
    decoded = JSON.parse(Buffer.from(token, "base64url").toString());
  } catch {
    return "invalid";
  }
  const { email: tokenEmail, expiresAt, hmac } = decoded || {};
  if (typeof tokenEmail !== "string" || typeof expiresAt !== "number" || typeof hmac !== "string") {
    return "invalid";
  }
  if (tokenEmail !== email) return "invalid";
  if (Math.floor(Date.now() / 1000) > expiresAt) return "expired";

  const expected = hmacHex("restore", `${email}:${normalizeRestoreCode(code)}:${expiresAt}`);
  if (!expected || !safeEqual(expected, hmac)) return "invalid";
  return "ok";
}

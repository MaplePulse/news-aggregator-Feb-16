import { NextResponse } from "next/server";
import { clientIp, isRateLimited } from "@/lib/rateLimit";
import { checkRestoreToken } from "@/lib/restoreCode";
import { issueSubscriberTokens } from "@/lib/signing";

export async function POST(request: Request) {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  if (isRateLimited(`verify-ip:${clientIp(request)}`, 10, 600)) {
    return NextResponse.json({ verified: false, reason: "rate_limited" }, { status: 429 });
  }

  let email: string, code: string, token: string;
  try {
    const body = await request.json();
    email = String(body.email || "").trim().toLowerCase();
    code = String(body.code || "").trim();
    token = String(body.token || "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!email || !code || !token) {
    return NextResponse.json({ error: "Email, code, and token required" }, { status: 400 });
  }

  const check = checkRestoreToken(token, email, code);
  if (check === "expired") {
    return NextResponse.json({ verified: false, reason: "expired" });
  }
  if (check !== "ok") {
    return NextResponse.json({ verified: false, reason: "invalid_code" });
  }

  try {
    // Code is valid. Look up the customer with an active subscription.
    const custRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=5`,
      { headers: { Authorization: `Bearer ${sk}` } }
    );
    const custData = await custRes.json();

    let customerId: string | null = null;

    if (custRes.ok && custData.data?.length) {
      for (const customer of custData.data) {
        const subRes = await fetch(
          `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customer.id)}&status=active&limit=1`,
          { headers: { Authorization: `Bearer ${sk}` } }
        );
        const subData = await subRes.json();
        if (subRes.ok && subData.data?.length > 0) {
          customerId = customer.id;
          break;
        }
      }
    }

    if (!customerId) {
      return NextResponse.json({ verified: true, subscribed: false });
    }

    return NextResponse.json({
      verified: true,
      subscribed: true,
      ...issueSubscriberTokens(customerId),
    });
  } catch {
    return NextResponse.json({ error: "Failed to verify code" }, { status: 500 });
  }
}

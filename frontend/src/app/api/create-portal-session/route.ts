import { NextResponse } from "next/server";
import { verifySubscriberToken } from "@/lib/signing";

export async function POST(request: Request) {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  // Requires the signed session token issued by verify-subscription or
  // verify-restore-code. A bare Stripe customer ID is not accepted: those
  // leak (old RSS URLs used them) and would open anyone's billing portal.
  let token: string;
  try {
    const body = await request.json();
    token = String(body.token || "");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const customerId = verifySubscriberToken(token, "session");
  if (!customerId) {
    return NextResponse.json({ error: "reauth_required" }, { status: 401 });
  }

  const origin = new URL(request.url).origin;

  try {
    const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sk}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: customerId,
        return_url: origin,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Stripe error" },
        { status: res.status }
      );
    }

    return NextResponse.json({ url: data.url });
  } catch {
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}

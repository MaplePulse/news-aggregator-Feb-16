import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  let email: string, code: string, token: string;
  try {
    const body = await request.json();
    email = (body.email || "").trim().toLowerCase();
    code = (body.code || "").trim();
    token = (body.token || "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!email || !code || !token) {
    return NextResponse.json({ error: "Email, code, and token required" }, { status: 400 });
  }

  try {
    // Decode and verify token
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString());
    const { email: tokenEmail, expiresAt, hmac } = decoded;

    if (tokenEmail !== email) {
      return NextResponse.json({ verified: false, reason: "invalid_code" });
    }

    if (Math.floor(Date.now() / 1000) > expiresAt) {
      return NextResponse.json({ verified: false, reason: "expired" });
    }

    // Verify HMAC: the code must match what was signed
    const payload = `${email}:${code}:${expiresAt}`;
    const expectedHmac = crypto.createHmac("sha256", sk).update(payload).digest("hex");

    if (hmac !== expectedHmac) {
      return NextResponse.json({ verified: false, reason: "invalid_code" });
    }

    // Code is valid. Look up customer for the response.
    const custRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=5`,
      { headers: { Authorization: `Bearer ${sk}` } }
    );
    const custData = await custRes.json();

    let customerId: string | null = null;
    let subscriptionId: string | null = null;

    if (custRes.ok && custData.data?.length) {
      for (const customer of custData.data) {
        const subRes = await fetch(
          `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customer.id)}&status=active&limit=1`,
          { headers: { Authorization: `Bearer ${sk}` } }
        );
        const subData = await subRes.json();
        if (subRes.ok && subData.data?.length > 0) {
          customerId = customer.id;
          subscriptionId = subData.data[0].id;
          break;
        }
      }
    }

    return NextResponse.json({
      verified: true,
      subscribed: true,
      customerId,
      subscriptionId,
    });
  } catch {
    return NextResponse.json({ verified: false, reason: "invalid_token" });
  }
}

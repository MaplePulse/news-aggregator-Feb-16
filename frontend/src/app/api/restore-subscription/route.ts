import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  let email: string;
  try {
    const body = await request.json();
    email = (body.email || "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  try {
    // Look up customer by email
    const custRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=5`,
      { headers: { Authorization: `Bearer ${sk}` } }
    );
    const custData = await custRes.json();

    if (!custRes.ok || !custData.data?.length) {
      return NextResponse.json({ subscribed: false, reason: "no_customer" });
    }

    // Check each matching customer for an active subscription
    for (const customer of custData.data) {
      const subRes = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customer.id)}&status=active&limit=1`,
        { headers: { Authorization: `Bearer ${sk}` } }
      );
      const subData = await subRes.json();

      if (subRes.ok && subData.data?.length > 0) {
        return NextResponse.json({
          subscribed: true,
          customerId: customer.id,
          subscriptionId: subData.data[0].id,
        });
      }
    }

    return NextResponse.json({ subscribed: false, reason: "no_active_subscription" });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to restore subscription", detail: String(e) },
      { status: 500 }
    );
  }
}

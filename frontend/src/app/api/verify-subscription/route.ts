import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  try {
    // Retrieve the checkout session to get customer + subscription info
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        headers: { Authorization: `Bearer ${sk}` },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Stripe error" },
        { status: res.status }
      );
    }

    if (data.payment_status !== "paid" && data.status !== "complete") {
      return NextResponse.json({ subscribed: false });
    }

    return NextResponse.json({
      subscribed: true,
      customerId: data.customer,
      subscriptionId: data.subscription,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to verify subscription", detail: String(e) },
      { status: 500 }
    );
  }
}

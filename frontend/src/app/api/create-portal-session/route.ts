import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  let customerId: string;
  try {
    const body = await request.json();
    customerId = body.customerId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!customerId) {
    return NextResponse.json({ error: "customerId required" }, { status: 400 });
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
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to create portal session", detail: String(e) },
      { status: 500 }
    );
  }
}

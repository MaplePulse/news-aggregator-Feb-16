import { NextResponse } from "next/server";
import crypto from "crypto";

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function signToken(email: string, code: string, expiresAt: number, secret: string): string {
  const payload = `${email}:${code}:${expiresAt}`;
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ email, expiresAt, hmac })).toString("base64url");
}

export async function POST(request: Request) {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
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
    // Look up customer by email in Stripe
    const custRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=5`,
      { headers: { Authorization: `Bearer ${sk}` } }
    );
    const custData = await custRes.json();

    if (!custRes.ok || !custData.data?.length) {
      return NextResponse.json({ sent: false, reason: "no_customer" });
    }

    // Check for active subscription
    let foundCustomer: string | null = null;
    for (const customer of custData.data) {
      const subRes = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customer.id)}&status=active&limit=1`,
        { headers: { Authorization: `Bearer ${sk}` } }
      );
      const subData = await subRes.json();
      if (subRes.ok && subData.data?.length > 0) {
        foundCustomer = customer.id;
        break;
      }
    }

    if (!foundCustomer) {
      return NextResponse.json({ sent: false, reason: "no_active_subscription" });
    }

    // Generate 6-digit code, valid for 10 minutes
    const code = generateCode();
    const expiresAt = Math.floor(Date.now() / 1000) + 600;
    const token = signToken(email, code, expiresAt, sk);

    // Send code via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Regional Pulse News <noreply@regionalpulsenews.com>",
        to: [email],
        subject: "Your verification code",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="margin: 0 0 8px; font-size: 20px; color: #111;">Restore your subscription</h2>
            <p style="margin: 0 0 24px; color: #555; font-size: 15px;">Enter this code on the website to restore your ad-free access:</p>
            <div style="background: #f0f4ff; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #2563eb;">${code}</span>
            </div>
            <p style="margin: 0; color: #888; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errData = await emailRes.json().catch(() => ({}));
      console.error("Resend error:", errData);
      return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
    }

    return NextResponse.json({ sent: true, token });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to process request", detail: String(e) },
      { status: 500 }
    );
  }
}

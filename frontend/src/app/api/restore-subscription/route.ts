import { NextResponse } from "next/server";
import { clientIp, isRateLimited } from "@/lib/rateLimit";
import {
  RESTORE_CODE_TTL_S,
  formatRestoreCode,
  generateRestoreCode,
  signRestoreToken,
} from "@/lib/restoreCode";

// Longer than a typical Stripe lookup + Resend send, so subscriber and
// non-subscriber replies take the same time.
const MIN_REPLY_MS = 2500;

export async function POST(request: Request) {
  if (isRateLimited(`restore-ip:${clientIp(request)}`, 5, 600)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

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

  if (!email || !email.includes("@") || email.length > 254) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // Stops the form being used to flood one person's inbox with codes.
  if (isRateLimited(`restore-email:${email}`, 3, 600)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  // The reply must look the same whether or not the email belongs to a subscriber,
  // so the form can't be used to find out who subscribes. Non-subscribers get a
  // token for a code nobody receives (any code they try is just "invalid"), and
  // every reply waits until MIN_REPLY_MS so timing doesn't give it away either.
  const started = Date.now();
  const reply = async (body: Record<string, unknown>, status = 200) => {
    const wait = MIN_REPLY_MS - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    return NextResponse.json(body, { status });
  };

  try {
    // Look up customer by email in Stripe
    const custRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=5`,
      { headers: { Authorization: `Bearer ${sk}` } }
    );
    const custData = await custRes.json();

    if (!custRes.ok) {
      return reply({ error: "Failed to process request" }, 502);
    }

    // Check for an active subscription
    let foundCustomer: string | null = null;
    for (const customer of custData.data || []) {
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

    // Generate an 8-character code, valid for 10 minutes
    const code = generateRestoreCode();
    const expiresAt = Math.floor(Date.now() / 1000) + RESTORE_CODE_TTL_S;
    const token = signRestoreToken(email, code, expiresAt);
    if (!token) {
      return reply({ error: "Signing not configured" }, 500);
    }

    if (!foundCustomer) {
      // Same shape as a real send; no email goes out.
      return reply({ sent: true, token });
    }

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
              <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #2563eb; font-family: ui-monospace, Menlo, Consolas, monospace;">${formatRestoreCode(code)}</span>
            </div>
            <p style="margin: 0; color: #888; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errData = await emailRes.json().catch(() => ({}));
      console.error("Resend error:", errData);
      return reply({ error: "Failed to process request" }, 502);
    }

    return reply({ sent: true, token });
  } catch {
    return reply({ error: "Failed to process request" }, 500);
  }
}

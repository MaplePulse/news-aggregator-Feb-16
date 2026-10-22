import { NextResponse } from "next/server";
import { backendHeaders } from "@/lib/backend";
import { clientIp, isRateLimited } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const backend = process.env.BACKEND_URL || "http://127.0.0.1:8000";
  const url = `${backend}/feedback`;

  // Each message is sent as an email from the feedback Gmail account; keep spam down.
  if (isRateLimited(`feedback-ip:${clientIp(request)}`, 5, 3600)) {
    return NextResponse.json({ error: "Too many messages. Please try again later." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const res = await fetch(url, {
      method: "POST",
      headers: backendHeaders(request),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach backend" }, { status: 502 });
  }
}

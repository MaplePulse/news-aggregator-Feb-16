import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const backend = process.env.BACKEND_URL || "http://127.0.0.1:8000";
  const region = request.nextUrl.searchParams.get("region") || "";
  const params = new URLSearchParams();
  if (region) params.set("region", region);
  const url = `${backend}/subdivisions?${params.toString()}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Failed to reach backend from Next.js subdivisions route",
        backend_url_used: backend,
        backend_request_url: url,
        detail: String(e),
      },
      { status: 502 }
    );
  }
}

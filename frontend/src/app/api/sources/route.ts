import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const region = searchParams.get("region") ?? "south-america";
  const subdivision = searchParams.get("subdivision");

  const backend = process.env.BACKEND_URL || "http://127.0.0.1:8000";

  const backendParams = new URLSearchParams();
  backendParams.set("region", region);

  if (subdivision) {
    backendParams.set("subdivision", subdivision);
  }

  const url = `${backend}/sources?${backendParams.toString()}`;

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
        error: "Failed to reach backend from Next.js API route",
        backend_url_used: backend,
        backend_request_url: url,
        detail: String(e),
      },
      { status: 502 }
    );
  }
}

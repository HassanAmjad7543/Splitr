import { NextResponse } from "next/server";

import { getShareView } from "@/lib/share";

/**
 * Public, unauthenticated JSON view of one member's balance.
 * All shaping and privacy filtering happens in lib/share.ts.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const view = await getShareView(token);
  if (!view) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(view, {
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}

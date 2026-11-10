import { ImageResponse } from "next/og";

import { site } from "@/lib/site";

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const row = (from: string, to: string, amount: string) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "18px 26px",
        border: "2px solid #1f2a25",
        borderRadius: 16,
        fontSize: 30,
      }}
    >
      <div style={{ display: "flex", gap: 12 }}>
        <span style={{ color: "#fb7185" }}>{from}</span>
        <span style={{ color: "#6b7a73" }}>→</span>
        <span style={{ color: "#34d399" }}>{to}</span>
      </div>
      <span>{amount}</span>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0b0f0d",
          color: "#ecfdf5",
          padding: 72,
          gap: 64,
          alignItems: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: "#10b981", display: "flex" }} />
            <span style={{ fontSize: 52, fontWeight: 700 }}>{site.name}</span>
          </div>
          <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.1, marginTop: 40 }}>
            Split the bill without making everyone sign up.
          </div>
          <div style={{ fontSize: 28, color: "#9fb3aa", marginTop: 24 }}>
            One organizer. A private link for everyone else.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 420 }}>
          <div style={{ fontSize: 22, color: "#9fb3aa", textTransform: "uppercase", letterSpacing: 2 }}>
            Settle up in 2 payments
          </div>
          {row("Charlie", "Alice", "Rs 400")}
          {row("Bob", "Alice", "Rs 100")}
        </div>
      </div>
    ),
    size,
  );
}

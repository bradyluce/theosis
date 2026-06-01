import { ImageResponse } from "next/og";

// Branded social card for the landing page (Next file-convention OG image).
// Drawn with positioned divs so it renders without bundling a font file —
// Satori needs `display: flex` on any element with children.

export const alt = "Theosis — Orthodox Christian study";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GILT = "#d4a857";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0908",
          color: "#f4ecd8",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 760,
            height: 760,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(212,168,87,0.22), rgba(212,168,87,0.04) 45%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Orthodox three-bar cross */}
        <div style={{ position: "relative", width: 132, height: 220, display: "flex" }}>
          <div style={{ position: "absolute", left: 62, top: 20, width: 9, height: 182, background: GILT, display: "flex" }} />
          <div style={{ position: "absolute", left: 46, top: 46, width: 40, height: 10, background: GILT, display: "flex" }} />
          <div style={{ position: "absolute", left: 32, top: 80, width: 68, height: 12, background: GILT, display: "flex" }} />
          <div style={{ position: "absolute", left: 40, top: 152, width: 52, height: 12, background: GILT, transform: "rotate(18deg)", display: "flex" }} />
        </div>

        <div style={{ marginTop: 44, fontSize: 92, letterSpacing: -2, display: "flex" }}>
          Theosis
        </div>
        <div style={{ marginTop: 16, fontSize: 30, color: "#b8ad95", display: "flex" }}>
          Orthodox Christian study, one verse at a time
        </div>
        <div
          style={{
            marginTop: 44,
            fontSize: 20,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: GILT,
            display: "flex",
          }}
        >
          Coming soon to the App Store
        </div>
      </div>
    ),
    { ...size },
  );
}

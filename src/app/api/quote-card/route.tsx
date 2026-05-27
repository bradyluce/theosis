import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

// Server-side rendered shareable card. 1080x1080 square — universal for
// IG, Twitter, Messages, and the iOS share sheet. Cream parchment palette
// (warm, daylight) intentionally diverges from the dark in-app theme so
// the image reads well on a stranger's feed.
//
// Query params (all optional, all UTF-8):
//   text         — body of the quote
//   attribution  — short line under the quote ("St. John Chrysostom")
//   ref          — secondary line ("Homily 7 on Matthew" or "Matthew 5:3")
//   kind         — "verse" | "father" (changes visual treatment)

// Try to load a single Newsreader weight from Google Fonts. The CSS
// response contains multiple @font-face blocks (vietnamese, latin-ext,
// latin) — we want the latin one, which is typically the last in the
// document. Returns null when anything in the chain fails so the route
// can degrade to satori's default font rather than 500-ing.
async function loadNewsreader(
  weight: number,
  style: "normal" | "italic",
): Promise<ArrayBuffer | null> {
  try {
    const italBit = style === "italic" ? "1" : "0";
    const cssUrl = `https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@${italBit},${weight}&display=swap`;
    const cssRes = await fetch(cssUrl, {
      headers: {
        // The CSS endpoint returns different formats per User-Agent. A
        // modern desktop UA gets WOFF2 in a single src() per block.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
      cache: "force-cache",
    });
    if (!cssRes.ok) {
      console.warn(
        `[quote-card] Newsreader CSS ${weight}/${style}: HTTP ${cssRes.status}`,
      );
      return null;
    }
    const css = await cssRes.text();
    // Prefer the latin block — comments precede each block, so we scan
    // for the latin comment first; fall back to any src() if the comment
    // structure has shifted.
    const latinMatch =
      /\/\*\s*latin\s*\*\/[^]*?src:\s*url\((https:\/\/[^)]+)\)/i.exec(css) ??
      /src:\s*url\((https:\/\/[^)]+)\)/.exec(css);
    if (!latinMatch) {
      console.warn(
        `[quote-card] Newsreader ${weight}/${style}: no src URL found in CSS`,
      );
      return null;
    }
    const fontRes = await fetch(latinMatch[1]);
    if (!fontRes.ok) {
      console.warn(
        `[quote-card] Newsreader font ${weight}/${style}: HTTP ${fontRes.status}`,
      );
      return null;
    }
    return await fontRes.arrayBuffer();
  } catch (err) {
    console.warn(
      `[quote-card] Newsreader ${weight}/${style} load failed:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") ?? "").slice(0, 600);
  const attribution = (searchParams.get("attribution") ?? "").slice(0, 120);
  const reference = (searchParams.get("ref") ?? "").slice(0, 120);
  const kind = (searchParams.get("kind") ?? "verse") as "verse" | "father";

  const [regular, italic, semibold] = await Promise.all([
    loadNewsreader(400, "normal"),
    loadNewsreader(500, "italic"),
    loadNewsreader(600, "normal"),
  ]);

  // Build the fonts array from whichever loads succeeded. ImageResponse
  // accepts an empty array and falls back to its bundled default —
  // ensures we never 500 the route just because Google Fonts hiccupped.
  const fonts: ConstructorParameters<typeof ImageResponse>[1] extends infer Opts
    ? Opts extends { fonts?: infer F }
      ? NonNullable<F>
      : never
    : never = [];
  if (regular)
    fonts.push({
      name: "Newsreader",
      data: regular,
      weight: 400,
      style: "normal",
    });
  if (italic)
    fonts.push({
      name: "Newsreader",
      data: italic,
      weight: 500,
      style: "italic",
    });
  if (semibold)
    fonts.push({
      name: "Newsreader",
      data: semibold,
      weight: 600,
      style: "normal",
    });

  // When no fonts loaded, the rendered card uses satori's default font.
  // The visual is less branded but the share still works — better than
  // a hard fail.
  const fontFamily = fonts.length > 0 ? "Newsreader" : "serif";

  const len = text.length;
  const fontSize = len < 120 ? 64 : len < 240 ? 54 : len < 380 ? 46 : 38;

  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "100px",
            backgroundColor: "#F4ECD7",
            backgroundImage:
              "radial-gradient(ellipse at top left, rgba(255,255,255,0.55), transparent 60%), radial-gradient(ellipse at bottom right, rgba(212,168,87,0.10), transparent 70%)",
            fontFamily,
            color: "#1B1715",
          }}
        >
          {/* Top eyebrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              fontSize: "20px",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "#B8924B",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: "44px",
                height: "1px",
                backgroundColor: "#B8924B",
              }}
            />
            <span>{kind === "verse" ? "Holy Scripture" : "The Fathers"}</span>
          </div>

          {/* Body — flex 1 so it vertically centers between header and footer */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              paddingTop: "40px",
              paddingBottom: "40px",
            }}
          >
            <p
              style={{
                fontFamily,
                fontSize: `${fontSize}px`,
                lineHeight: 1.32,
                letterSpacing: "-0.005em",
                color: "#1B1715",
                fontStyle: kind === "verse" ? "normal" : "italic",
                fontWeight: 400,
                textIndent: kind === "father" ? "-18px" : 0,
              }}
            >
              {kind === "father" ? `“${text}”` : text}
            </p>
          </div>

          {/* Footer: attribution + wordmark */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: "32px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
                flex: 1,
              }}
            >
              {attribution ? (
                <p
                  style={{
                    fontSize: "30px",
                    fontWeight: 600,
                    color: "#1B1715",
                    margin: 0,
                    fontFamily,
                  }}
                >
                  {attribution}
                </p>
              ) : null}
              {reference ? (
                <p
                  style={{
                    fontSize: "24px",
                    color: "#6B5D4F",
                    margin: 0,
                    marginTop: "4px",
                    fontFamily,
                    fontStyle: "italic",
                  }}
                >
                  {reference}
                </p>
              ) : null}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <span
                style={{
                  fontSize: "26px",
                  fontFamily,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  color: "#1B1715",
                }}
              >
                theosis
              </span>
              <span
                style={{
                  fontSize: "16px",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "#B8924B",
                  marginTop: "2px",
                  fontWeight: 500,
                }}
              >
                read with the Fathers
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1080,
        fonts,
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      },
    );
  } catch (err) {
    // Surface the real error in Vercel logs; respond with a JSON error
    // body so the client can show "Couldn't load preview" cleanly rather
    // than a giant HTML error page.
    console.error(
      "[quote-card] ImageResponse failed:",
      err instanceof Error ? err.message : err,
    );
    return new Response(
      JSON.stringify({
        error:
          err instanceof Error
            ? err.message
            : "Quote card render failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

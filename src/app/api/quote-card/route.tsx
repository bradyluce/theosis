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

async function loadNewsreader(weight: 400 | 500 | 600): Promise<ArrayBuffer> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,${weight};1,${weight}&display=swap`,
    {
      headers: {
        // Force a TTF/WOFF2 response (Googlefonts returns different sources by UA).
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
      cache: "force-cache",
    },
  ).then((r) => r.text());
  const match = css.match(/src:\s*url\((https:\/\/[^)]+)\)/);
  if (!match) throw new Error(`Failed to extract Newsreader ${weight} URL from Google Fonts CSS`);
  return fetch(match[1]).then((r) => r.arrayBuffer());
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = (searchParams.get("text") ?? "").slice(0, 600);
  const attribution = (searchParams.get("attribution") ?? "").slice(0, 120);
  const reference = (searchParams.get("ref") ?? "").slice(0, 120);
  const kind = (searchParams.get("kind") ?? "verse") as "verse" | "father";

  const [regular, italic, semibold] = await Promise.all([
    loadNewsreader(400),
    loadNewsreader(500),
    loadNewsreader(600),
  ]);

  // Pick a body font size based on length so long passages still fit. These
  // numbers are calibrated for the 880-px text column inside the 1080-px
  // canvas (100-px padding each side).
  const len = text.length;
  const fontSize = len < 120 ? 64 : len < 240 ? 54 : len < 380 ? 46 : 38;

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
          fontFamily: "Newsreader",
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
              fontFamily: "Newsreader",
              fontSize: `${fontSize}px`,
              lineHeight: 1.32,
              letterSpacing: "-0.005em",
              color: "#1B1715",
              fontStyle: kind === "verse" ? "normal" : "italic",
              fontWeight: 400,
              // Hanging open-quote for father quotes — purely visual flair.
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
                  fontFamily: "Newsreader",
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
                  fontFamily: "Newsreader",
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
                fontFamily: "Newsreader",
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
      fonts: [
        { name: "Newsreader", data: regular, weight: 400, style: "normal" },
        { name: "Newsreader", data: italic, weight: 500, style: "italic" },
        { name: "Newsreader", data: semibold, weight: 600, style: "normal" },
      ],
      headers: {
        // Cache aggressively — the same (text, attribution, ref, kind) always
        // produces the same image. Bust by changing query params.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}

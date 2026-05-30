// Build the app icon set from the supplied brand icon (a gold Orthodox cross
// on a near-black field). Supersedes the chevron stopgap.
//
//   - icon.png                    : 1024 full-bleed OPAQUE iOS/app icon (iOS
//                                   icons can't be transparent — keep the dark
//                                   field as the design intends).
//   - splash-icon.png             : the gold cross keyed onto transparency,
//                                   trimmed + centered, so it reads on any
//                                   splash background.
//   - android-icon-foreground.png : same cross on transparency with an adaptive
//                                   safe-zone margin, to composite over the
//                                   adaptive background color.
//
// The cross is extracted from its dark field by a luminance key (gold is bright,
// the field is dark), with a soft ramp for anti-aliased edges.
//
// Run from the repo root:  node scripts/media/build-app-icons.mjs <source.webp>

import sharp from "sharp";
import path from "node:path";

const SRC = path.resolve(process.argv[2] ?? "apps/mobile/assets/source/app-icon-source.webp");
const DIR = path.resolve("apps/mobile/assets/images");
const SIZE = 1024;

function toHex(n) {
  return n.toString(16).padStart(2, "0");
}

// Luminance-key the bright cross onto transparency.
async function extractCross() {
  const { data, info } = await sharp(SRC)
    .resize(SIZE, SIZE, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const LOW = 45;
  const HIGH = 90;
  for (let i = 0; i < out.length; i += info.channels) {
    const lum = 0.2126 * out[i] + 0.7152 * out[i + 1] + 0.0722 * out[i + 2];
    let alpha;
    if (lum <= LOW) alpha = 0;
    else if (lum >= HIGH) alpha = 255;
    else alpha = Math.round(((lum - LOW) / (HIGH - LOW)) * 255);
    out[i + 3] = alpha;
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toBuffer();
}

async function centeredOnTransparent(crossPng, scale) {
  const trimmed = await sharp(crossPng).trim().toBuffer();
  const mark = await sharp(trimmed)
    .resize(Math.round(SIZE * scale), Math.round(SIZE * scale), {
      fit: "inside",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();
  return sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
}

const meta = await sharp(SRC).metadata();
// Sample the top-left pixel for the dark field color (used for the adaptive +
// splash background so everything matches the icon).
const corner = await sharp(SRC).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
const bgHex = `#${toHex(corner[0])}${toHex(corner[1])}${toHex(corner[2])}`;

// 1. iOS / app icon — opaque, full-bleed, dark field preserved.
await sharp(SRC).resize(SIZE, SIZE, { fit: "cover" }).flatten().png().toFile(path.join(DIR, "icon.png"));

// 2 + 3. Transparent cross for splash + adaptive foreground.
const cross = await extractCross();
await sharp(await centeredOnTransparent(cross, 0.62)).toFile(path.join(DIR, "splash-icon.png"));
const foreground = await centeredOnTransparent(cross, 0.52);
await sharp(foreground).toFile(path.join(DIR, "android-icon-foreground.png"));

// 4. Android themed-icon monochrome: the same cross silhouette recolored solid
// white (Android tints it). Keeps the monochrome consistent with the new cross
// instead of the old chevron.
{
  const { data, info } = await sharp(foreground)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(path.join(DIR, "android-icon-monochrome.png"));
}

console.log(`source: ${meta.width}x${meta.height} ${meta.format}`);
console.log(`sampled background color: ${bgHex}`);
console.log("Wrote icon.png, splash-icon.png, android-icon-foreground.png");

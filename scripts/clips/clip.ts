/**
 * YouTube → TikTok clip pipeline.
 *
 *   npm run clips -- <youtube-url-or-id>
 *
 * Downloads a YouTube video + auto-captions via yt-dlp, asks Claude to pick
 * five 25–60s segments that should perform as Orthodox-niche TikTok shorts,
 * and renders each as a vertical 1080×1920 mp4 with burned-in captions via
 * ffmpeg. Output lands in content/clips/<video-id>/.
 *
 * Prerequisites:
 *   - yt-dlp on PATH
 *   - ffmpeg on PATH (winget install Gyan.FFmpeg)
 *   - ANTHROPIC_API_KEY in .env.local
 */

import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { config as dotenv } from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

dotenv({ path: ".env.local", override: true });
dotenv({ path: ".env", override: false });

// ── Types ────────────────────────────────────────────────────────────────────

interface VttCue {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

interface ClipSelection {
  start_seconds: number;
  end_seconds: number;
  hook_line: string;
  rationale: string;
  theme: string;
  tiktok_caption: string;
}

interface VideoMetadata {
  id: string;
  title: string;
  uploader: string;
  durationSeconds: number;
}

// ── CLI / paths ──────────────────────────────────────────────────────────────

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

function parseYouTubeInput(input: string): string {
  if (VIDEO_ID_RE.test(input)) return input;
  const url = new URL(input);
  const v = url.searchParams.get("v");
  if (v && VIDEO_ID_RE.test(v)) return v;
  // youtu.be/<id> or youtube.com/shorts/<id>
  const segments = url.pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  if (last && VIDEO_ID_RE.test(last)) return last;
  throw new Error(`Could not parse a YouTube video ID from: ${input}`);
}

// ── Toolchain discovery ──────────────────────────────────────────────────────

function findOnPath(exe: string): string | null {
  try {
    const cmd = process.platform === "win32" ? `where ${exe}` : `which ${exe}`;
    const out = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return out.split(/\r?\n/)[0].trim() || null;
  } catch {
    return null;
  }
}

function findFfmpeg(): string {
  const onPath = findOnPath("ffmpeg");
  if (onPath) return onPath;
  // Winget fallback — locations Gyan.FFmpeg gets installed to.
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
    const wingetRoot = path.join(local, "Microsoft", "WinGet", "Packages");
    if (fs.existsSync(wingetRoot)) {
      const gyanDirs = fs
        .readdirSync(wingetRoot)
        .filter((d) => d.startsWith("Gyan.FFmpeg"));
      for (const dir of gyanDirs) {
        const candidates = fs
          .readdirSync(path.join(wingetRoot, dir))
          .filter((d) => d.startsWith("ffmpeg-"));
        for (const c of candidates) {
          const bin = path.join(wingetRoot, dir, c, "bin", "ffmpeg.exe");
          if (fs.existsSync(bin)) return bin;
        }
      }
    }
  }
  throw new Error(
    "ffmpeg not found. Install with: winget install -e --id Gyan.FFmpeg",
  );
}

const FFMPEG = findFfmpeg();

// ── Shell helpers ────────────────────────────────────────────────────────────

function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string; quiet?: boolean } = {},
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d: Buffer) => {
      const s = d.toString();
      stderr += s;
      if (!opts.quiet) process.stderr.write(s);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else
        reject(
          new Error(
            `${cmd} ${args.join(" ")} exited with code ${code}\n${stderr}`,
          ),
        );
    });
  });
}

// ── yt-dlp ───────────────────────────────────────────────────────────────────

async function fetchMetadata(videoId: string): Promise<VideoMetadata> {
  const { stdout } = await run(
    "yt-dlp",
    [
      "--no-warnings",
      "--skip-download",
      "--print-json",
      `https://www.youtube.com/watch?v=${videoId}`,
    ],
    { quiet: true },
  );
  const meta = JSON.parse(stdout);
  return {
    id: meta.id,
    title: meta.title,
    uploader: meta.uploader,
    durationSeconds: Number(meta.duration),
  };
}

function findMergedVideo(outDir: string): string | null {
  if (!fs.existsSync(outDir)) return null;
  const merged = fs
    .readdirSync(outDir)
    .find((f) => /^source\.(mp4|mkv|webm)$/.test(f));
  return merged ? path.join(outDir, merged) : null;
}

function findVtt(outDir: string): string | null {
  if (!fs.existsSync(outDir)) return null;
  const vtt = fs
    .readdirSync(outDir)
    .find((f) => f.startsWith("source.") && f.endsWith(".vtt"));
  return vtt ? path.join(outDir, vtt) : null;
}

function findSplitStreams(
  outDir: string,
): { video: string; audio: string } | null {
  if (!fs.existsSync(outDir)) return null;
  const files = fs.readdirSync(outDir);
  // yt-dlp un-merged streams: source.f<format-code>.{mp4,m4a,webm,opus}
  const video = files.find((f) => /^source\.f\d+\.(mp4|webm)$/.test(f));
  const audio = files.find(
    (f) => /^source\.f\d+\.(m4a|opus|webm)$/.test(f) && f !== video,
  );
  if (!video || !audio) return null;
  return {
    video: path.join(outDir, video),
    audio: path.join(outDir, audio),
  };
}

async function mergeStreams(
  video: string,
  audio: string,
  outDir: string,
): Promise<string> {
  const out = path.join(outDir, "source.mp4");
  await run(FFMPEG, ["-y", "-i", video, "-i", audio, "-c", "copy", out], {
    quiet: true,
  });
  fs.unlinkSync(video);
  fs.unlinkSync(audio);
  return out;
}

async function downloadVideoAndCaptions(
  videoId: string,
  outDir: string,
): Promise<{ videoPath: string; vttPath: string }> {
  fs.mkdirSync(outDir, { recursive: true });

  // Fast path: everything already on disk from a prior run.
  let videoPath = findMergedVideo(outDir);
  let vttPath = findVtt(outDir);
  if (videoPath && vttPath) {
    console.log(`      (using cached download)`);
    return { videoPath, vttPath };
  }

  // Recovery path: a prior yt-dlp run left split streams behind (its merge
  // step failed). Merge them ourselves and skip re-downloading.
  if (!videoPath) {
    const split = findSplitStreams(outDir);
    if (split) {
      console.log(`      (merging cached split streams)`);
      videoPath = await mergeStreams(split.video, split.audio, outDir);
    }
  }

  if (!videoPath || !vttPath) {
    // Cap at 1080p mp4 — plenty for vertical crop, keeps download fast.
    await run("yt-dlp", [
      "--no-warnings",
      "--no-progress",
      "--ffmpeg-location",
      FFMPEG,
      "-f",
      "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[ext=mp4]",
      "--write-auto-subs",
      "--sub-lang",
      "en",
      "--sub-format",
      "vtt",
      "--merge-output-format",
      "mp4",
      "-o",
      path.join(outDir, "source.%(ext)s"),
      `https://www.youtube.com/watch?v=${videoId}`,
    ]);
  }

  // Re-detect after yt-dlp. If the merge step silently failed, do it ourselves.
  videoPath = findMergedVideo(outDir);
  if (!videoPath) {
    const split = findSplitStreams(outDir);
    if (split) {
      console.log(`      (yt-dlp merge missing; merging streams)`);
      videoPath = await mergeStreams(split.video, split.audio, outDir);
    }
  }
  if (!videoPath) {
    throw new Error(`No video file found in ${outDir} after yt-dlp.`);
  }

  vttPath = findVtt(outDir);
  if (!vttPath) {
    throw new Error(
      "No English auto-captions found. The video may have captions disabled.",
    );
  }
  return { videoPath, vttPath };
}

// ── VTT parsing ──────────────────────────────────────────────────────────────

function parseTimestamp(ts: string): number {
  // 00:00:03.500 or 00:03.500
  const parts = ts.split(":");
  let h = 0,
    m = 0,
    s = 0;
  if (parts.length === 3) {
    h = Number(parts[0]);
    m = Number(parts[1]);
    s = Number(parts[2]);
  } else {
    m = Number(parts[0]);
    s = Number(parts[1]);
  }
  return h * 3600 + m * 60 + s;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    )
    .replace(/&amp;/g, "&"); // last — otherwise &amp;gt; would lose its &
}

function stripVttInlineTags(text: string): string {
  return decodeHtmlEntities(
    text
      .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, "")
      .replace(/<\/?c[^>]*>/g, "")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/>>+\s*/g, "") // YouTube's speaker-change marker in podcast captions
    .replace(/\s+/g, " ")
    .trim();
}

function parseVtt(vttContent: string): VttCue[] {
  const lines = vttContent.split(/\r?\n/);
  const cues: VttCue[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(
      /^(\d{2}:\d{2}(?::\d{2})?\.\d{3})\s*-->\s*(\d{2}:\d{2}(?::\d{2})?\.\d{3})/,
    );
    if (match) {
      const start = parseTimestamp(match[1]);
      const end = parseTimestamp(match[2]);
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "") {
        textLines.push(lines[i]);
        i++;
      }
      // YT auto-caption cues often have two lines: the previous cue's tail (no
      // tags) and the new word stream (with inline timing tags). Take the
      // tagged line if present so we preserve word boundaries.
      const cleaned = textLines
        .map(stripVttInlineTags)
        .filter((t) => t.length > 0);
      const text = cleaned[cleaned.length - 1] ?? "";
      if (text) cues.push({ startSeconds: start, endSeconds: end, text });
    }
    i++;
  }
  return cues;
}

function transcriptForClaude(cues: VttCue[]): string {
  // De-dup adjacent identical lines (YT progressive cues often repeat).
  const out: string[] = [];
  let lastText = "";
  for (const cue of cues) {
    if (cue.text === lastText) continue;
    lastText = cue.text;
    const t = Math.floor(cue.startSeconds);
    const mm = String(Math.floor(t / 60)).padStart(2, "0");
    const ss = String(t % 60).padStart(2, "0");
    out.push(`[${mm}:${ss}] ${cue.text}`);
  }
  return out.join("\n");
}

// ── Claude clip selection ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a short-form video curator for Theosis, an Orthodox Christian study app. Your task: identify segments from a long-form Orthodox Christian YouTube video that would perform exceptionally well as TikTok shorts (25-60 seconds each). The exact number of clips to return will be specified in the user message.

WHAT MAKES A GREAT ORTHODOX SHORT:

1. STRONG HOOK (first 1-2 seconds matter most). A great hook is one of:
   - A striking, counter-intuitive statement ("The early Church didn't believe in original sin the way the West does.")
   - A patristic citation that lands on its own ("St. John Chrysostom said...")
   - A direct question that draws the viewer in ("Why do Orthodox Christians kiss icons?")
   - A vivid contrast (East vs West, ancient vs modern, monastic vs worldly)
   - A confessional / personal moment from the speaker

2. SELF-CONTAINED. The viewer should understand the clip without watching what came before. If the speaker refers to "this", "what we just discussed", or "as I said earlier", that's a fail — pick a different segment.

3. ONE CLEAR PAYOFF. Each clip should deliver exactly one of:
   - A theological insight (Christology, ecclesiology, theosis, sacraments, Trinity)
   - A patristic citation or vignette from a Father's life
   - A liturgical / spiritual practice explained
   - A clear apologetic point (vs Protestantism, Catholicism, secularism, neopaganism)
   - A pastoral encouragement
   - A bold civilizational / cultural claim
   - A story about a saint, monk, martyr, or elder

4. RHETORICALLY ALIVE. The speaker is engaged, varied in tone, not droning. Skip dry list-readings of dates or technical exegesis without rhetorical weight.

5. NATURAL BOUNDARIES. Start at the beginning of the hook line. End at the natural close of the thought — never mid-sentence.

WHAT TO AVOID:
- "Thanks for watching" / "please subscribe" / sponsor reads / housekeeping
- Stream-of-context statements that depend on the prior 5 minutes
- Q&A clarifications without the underlying point
- Long setup with no payoff
- Repetitive content — don't pick multiple clips that all make the same point. Aim for variety across themes and across the video's runtime.

THEMES (for tagging): patristic | liturgical | apologetic | spiritual-life | dogmatic | scriptural | historical | ascetic | sacramental | mystical | pastoral

You will receive a timestamped transcript. The format is [MM:SS] followed by the spoken text. Return the requested number of clips, ordered best-first. Each clip should be 25-60 seconds long. When asked for many clips (15+), spread your picks across the full duration of the video — early, middle, and late — and explore every theme that fits, not just the strongest one or two.

FIELDS PER CLIP:

- hook_line: The first 5-10 spoken words of the clip, verbatim from the transcript. Used for internal logging.

- rationale: One sentence explaining why this clip will perform on TikTok.

- theme: One tag from the list above.

- tiktok_caption: This is critical — it will be used VERBATIM as both the filename and the TikTok description (when you import a video file to TikTok, the filename becomes the default description). Format:
    * A punchy hook line (can rephrase the clip's spoken hook for virality — a question, contrast, or striking claim works best)
    * Followed by 4-6 relevant hashtags
    * Mix general (#orthodox #orthodoxy #christianity #faith), creator/source-specific (e.g. #pageau #symbolicworld for Jonathan Pageau, #fatherjosiah for Trenham, #lordofspirits for the De Young/Damick podcast), and topic-specific (#patristics #scripture #icons #saints #liturgy #theosis #earlychurch #catholicvsorthodox etc.)
    * Max 150 characters total
    * NO emojis, NO quotation marks, NO slashes, NO colons, NO asterisks, NO pipe characters, NO question marks at the end (these break Windows filenames). Periods, commas, dashes, ampersands, and # are fine.
    * Hashtags at the END separated by single spaces
    * Example: "Eden is the holy church - patristic typology Pageau gets right #orthodox #pageau #symbolicworld #patristics #earlychurch"
    * Example: "Why the Orthodox kiss icons and Protestants miss the point #orthodox #icons #apologetics #orthodoxy"`;

const CLIP_SCHEMA = {
  type: "object",
  properties: {
    clips: {
      type: "array",
      items: {
        type: "object",
        properties: {
          start_seconds: { type: "number" },
          end_seconds: { type: "number" },
          hook_line: {
            type: "string",
            description: "First 5-10 spoken words of the clip",
          },
          rationale: {
            type: "string",
            description: "One sentence on why this clip will perform",
          },
          theme: {
            type: "string",
            description:
              "One of: patristic, liturgical, apologetic, spiritual-life, dogmatic, scriptural, historical, ascetic, sacramental, mystical, pastoral",
          },
          tiktok_caption: {
            type: "string",
            description:
              "Filename + TikTok description verbatim. Punchy hook + 4-6 hashtags. Max 150 chars. No emojis, quotes, slashes, colons, asterisks, pipes, or question marks. Periods/commas/dashes/ampersands OK. Hashtags at end.",
          },
        },
        required: [
          "start_seconds",
          "end_seconds",
          "hook_line",
          "rationale",
          "theme",
          "tiktok_caption",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["clips"],
  additionalProperties: false,
};

async function selectClips(
  client: Anthropic,
  meta: VideoMetadata,
  transcript: string,
  clipCount: number,
): Promise<ClipSelection[]> {
  const totalSec = Math.floor(meta.durationSeconds);
  const mm = Math.floor(totalSec / 60);
  const ss = String(totalSec % 60).padStart(2, "0");
  const userMessage = `Video: "${meta.title}" by ${meta.uploader} (${Math.round(meta.durationSeconds / 60)} min)

HARD CONSTRAINTS:
- The video is exactly ${totalSec} seconds long (${mm}:${ss}). DO NOT pick any clip whose start_seconds or end_seconds exceeds ${totalSec}. Every timestamp must correspond to a line that actually appears in the transcript below — do not extrapolate.
- Return exactly ${clipCount} clips, ordered best-first. Spread them across the full video runtime — early, middle, and late.
- Every clip's hook_line must match the spoken words at start_seconds in the transcript. If you cannot find a strong moment in a region, pick a weaker one within bounds rather than inventing a timestamp.

Transcript:
${transcript}`;

  // Stream because max_tokens > ~16K triggers the SDK's timeout guard.
  // Sonnet 4.6 + adaptive thinking over-explores this task — at both
  // effort:high and effort:medium it burned all 64K output on thinking alone
  // and never reached the JSON output. The docs recommend disabling thinking
  // for content-generation tasks ("similar or better performance vs Sonnet
  // 4.5 no-thinking"). Clip selection is exactly that — pattern-match for
  // hooks across the transcript, generate captions, emit JSON.
  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    thinking: { type: "disabled" },
    system: SYSTEM_PROMPT,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: CLIP_SCHEMA },
    },
    messages: [{ role: "user", content: userMessage }],
  });
  const response = await stream.finalMessage();

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    const blockTypes = response.content.map((b) => b.type).join(", ");
    throw new Error(
      `No text block in Claude response. stop_reason=${response.stop_reason}, block types=[${blockTypes}], usage=${JSON.stringify(response.usage)}`,
    );
  }
  const parsed = JSON.parse(textBlock.text) as { clips: ClipSelection[] };

  // Drop clips Claude hallucinated past the video end (or otherwise invalid).
  const valid = parsed.clips.filter(
    (c) =>
      c.start_seconds >= 0 &&
      c.end_seconds > c.start_seconds &&
      c.end_seconds <= meta.durationSeconds + 1,
  );
  if (valid.length < parsed.clips.length) {
    console.log(
      `      (dropped ${parsed.clips.length - valid.length} clips with out-of-bounds timestamps)`,
    );
  }
  return valid;
}

// ── ffmpeg rendering ─────────────────────────────────────────────────────────

// Sanitize a TikTok caption for use as a Windows-safe filename. Strips chars
// that would break path resolution; preserves hashtags, ampersands, commas,
// periods, and dashes (all valid in NTFS).
function captionToFilename(caption: string): string {
  return caption
    .replace(/[<>:"\/\\|?*\r\n\t]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function uniqueFilename(dir: string, baseName: string, ext: string): string {
  let candidate = path.join(dir, `${baseName}${ext}`);
  let n = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${baseName} (${n})${ext}`);
    n++;
  }
  return candidate;
}

function fmtAssTime(sec: number): string {
  // ASS uses H:MM:SS.CS (centiseconds)
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const wholeSec = Math.floor(sec % 60);
  const cs = Math.round((sec - Math.floor(sec)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(wholeSec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

// Generate an ASS subtitle file with explicit PlayResX=1080 / PlayResY=1920 so
// FontSize and MarginV are in actual video pixels — not the libass default
// PlayResY=288 script units, which is what made MarginV=380 render off-screen.
// Captions sit in the lower blur band below the letterboxed video (y=1264-1920).
function buildClipAss(
  cues: VttCue[],
  startSec: number,
  endSec: number,
): string {
  const clipped = cues.filter(
    (c) => c.endSeconds > startSec && c.startSeconds < endSec,
  );
  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "ScaledBorderAndShadow: yes",
    "WrapStyle: 0",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    // Bold white text, thick black outline, bottom-center, ~260px from bottom
    // → baseline lands at y≈1660 (centered in the lower blur band, y=1264-1920)
    "Style: Default,Arial,72,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,5,0,2,80,80,260,1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  const events: string[] = [];
  let lastText = "";
  for (const cue of clipped) {
    if (cue.text === lastText) continue;
    lastText = cue.text;
    const offsetStart = Math.max(0, cue.startSeconds - startSec);
    const offsetEnd = Math.min(endSec - startSec, cue.endSeconds - startSec);
    if (offsetEnd <= offsetStart) continue;
    // ASS commas separate fields; escape any in the text.
    const text = cue.text.replace(/,/g, "‚").replace(/\r?\n/g, " ");
    events.push(
      `Dialogue: 0,${fmtAssTime(offsetStart)},${fmtAssTime(offsetEnd)},Default,,0,0,0,,${text}`,
    );
  }
  return [...header, ...events, ""].join("\n");
}

async function renderClip(
  videoPath: string,
  outPath: string,
  assPath: string,
  clip: ClipSelection,
): Promise<void> {
  // ffmpeg's subtitles filter wants forward slashes on Windows, and any colon
  // inside the path needs to be escaped (filter argument separator).
  const subsArg = assPath.replace(/\\/g, "/").replace(/:/g, "\\:");
  // Blur-pad letterbox: fit 16:9 source at full width inside the 9:16 frame,
  // with a blurred copy filling the top/bottom gap. Standard podcast-clip look —
  // preserves both speakers' faces instead of slicing them off with a center crop.
  // The ASS file carries explicit PlayRes=1080×1920 so captions land in the
  // lower blur band where they don't overlap the speakers.
  const hasCaptions = fs.existsSync(assPath) && fs.statSync(assPath).size > 0;
  const captionFilter = hasCaptions
    ? `;[stacked]subtitles='${subsArg}'[outv]`
    : "";
  const outLabel = hasCaptions ? "[outv]" : "[stacked]";
  const filterComplex = [
    `[0:v]split=2[main][bg]`,
    `[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5[blur]`,
    `[main]scale=1080:-2:flags=lanczos[fg]`,
    `[blur][fg]overlay=(W-w)/2:(H-h)/2[stacked]${captionFilter}`,
  ].join(";");
  await run(
    FFMPEG,
    [
      "-y",
      "-loglevel",
      "error",
      "-stats",
      "-ss",
      String(clip.start_seconds),
      "-to",
      String(clip.end_seconds),
      "-i",
      videoPath,
      "-filter_complex",
      filterComplex,
      "-map",
      outLabel,
      "-map",
      "0:a?",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "22",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outPath,
    ],
    { quiet: true },
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: npm run clips -- <youtube-url-or-id>");
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY not set. Add it to .env.local (see .env.example).",
    );
    process.exit(1);
  }

  const videoId = parseYouTubeInput(input);
  const outDir = path.join("content", "clips", videoId);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`[1/5] Fetching metadata for ${videoId}…`);
  const meta = await fetchMetadata(videoId);
  console.log(
    `      ${meta.title} — ${meta.uploader} (${Math.round(meta.durationSeconds / 60)} min)`,
  );

  console.log(`[2/5] Downloading video + captions…`);
  const { videoPath, vttPath } = await downloadVideoAndCaptions(
    videoId,
    outDir,
  );

  console.log(`[3/5] Parsing transcript…`);
  const vttContent = fs.readFileSync(vttPath, "utf8");
  const cues = parseVtt(vttContent);
  console.log(`      ${cues.length} caption cues`);
  const transcript = transcriptForClaude(cues);

  // clips.json acts as a cache: if it exists, skip the Claude API call and
  // render straight from the cached picks. This lets you resume after a
  // rendering failure, re-render with different style settings without paying
  // for Claude again, or hand-edit clip selections before rendering.
  const clipsJsonPath = path.join(outDir, "clips.json");
  let clips: ClipSelection[];
  if (fs.existsSync(clipsJsonPath)) {
    const cached = JSON.parse(fs.readFileSync(clipsJsonPath, "utf8")) as {
      clips: ClipSelection[];
    };
    clips = cached.clips;
    console.log(
      `[4/5] Using cached clip selections (${clips.length} clips from clips.json)…`,
    );
  } else {
    // 1 clip per 4 min of runtime — caller's formula. Floor, clamped to 1.
    const durationMinutes = meta.durationSeconds / 60;
    const clipCount = Math.max(1, Math.floor(durationMinutes / 4));
    console.log(
      `[4/5] Asking Claude to pick ${clipCount} clips (${durationMinutes.toFixed(0)} min / 4)…`,
    );
    const client = new Anthropic();
    clips = await selectClips(client, meta, transcript, clipCount);
    fs.writeFileSync(
      clipsJsonPath,
      JSON.stringify({ video: meta, clips }, null, 2),
    );
  }
  for (const [i, c] of clips.entries()) {
    const dur = (c.end_seconds - c.start_seconds).toFixed(1);
    const at = `${Math.floor(c.start_seconds / 60)}:${String(Math.floor(c.start_seconds % 60)).padStart(2, "0")}`;
    console.log(
      `      ${String(i + 1).padStart(2)}. [${c.theme}] @${at} ${dur}s — ${c.tiktok_caption}`,
    );
  }

  console.log(`[5/5] Rendering ${clips.length} clips with ffmpeg…`);
  for (const [i, clip] of clips.entries()) {
    const baseName =
      captionToFilename(clip.tiktok_caption) || `clip-${i + 1}`;
    const outPath = uniqueFilename(outDir, baseName, ".mp4");
    // Write .ass to a temp location with an ASCII-safe name — embedding the
    // tiktok_caption (which may contain apostrophes) into ffmpeg's
    // -filter_complex single-quoted subtitle path breaks the filter parser.
    const tmpAss = path.join(
      os.tmpdir(),
      `theosis-clip-${process.pid}-${i}.ass`,
    );
    fs.writeFileSync(
      tmpAss,
      buildClipAss(cues, clip.start_seconds, clip.end_seconds),
    );
    console.log(`      → ${path.basename(outPath)}`);
    try {
      await renderClip(videoPath, outPath, tmpAss, clip);
    } finally {
      if (fs.existsSync(tmpAss)) fs.unlinkSync(tmpAss);
    }
  }

  console.log(`\nDone. ${clips.length} clips written to ${outDir}/`);
}

main().catch((err) => {
  console.error("\n[error]", err.message);
  process.exit(1);
});

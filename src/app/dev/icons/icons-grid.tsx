"use client";

import { useMemo, useState } from "react";

export type IconEntry = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  license: string;
  attribution: string;
  sourceUrl: string;
  caption?: string;
  fileSize: number;
  minDim: number;
  aspect: number;
  kind: "feast" | "saint" | "saint-manual";
};

type SortKey = "min-dim-asc" | "min-dim-desc" | "size-asc" | "aspect" | "id-asc";
type KindFilter = "all" | "feast" | "saint";

const SMALL_THRESHOLD = 400;
const TINY_FILE_KB = 25;
const ODD_ASPECT_HIGH = 1.6;
const ODD_ASPECT_LOW = 1 / ODD_ASPECT_HIGH;

export default function IconsGrid({ entries }: { entries: IconEntry[] }) {
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortKey>("min-dim-asc");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [onlySuspicious, setOnlySuspicious] = useState(false);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const decorated = useMemo(() => {
    return entries.map((e) => {
      const flags: string[] = [];
      if (e.minDim === 0) flags.push("missing");
      else if (e.minDim < SMALL_THRESHOLD) flags.push("small");
      if (e.fileSize > 0 && e.fileSize < TINY_FILE_KB * 1024) flags.push("tiny");
      if (e.aspect > ODD_ASPECT_HIGH) flags.push("wide");
      else if (e.aspect < ODD_ASPECT_LOW) flags.push("tall");
      return { ...e, autoFlags: flags };
    });
  }, [entries]);

  const filtered = useMemo(() => {
    let list = decorated;
    if (kindFilter === "feast") list = list.filter((e) => e.kind === "feast");
    else if (kindFilter === "saint") list = list.filter((e) => e.kind !== "feast");
    if (onlySuspicious) list = list.filter((e) => e.autoFlags.length > 0);
    if (onlyFlagged) list = list.filter((e) => flagged.has(e.id));
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((e) => e.id.toLowerCase().includes(q));
    }
    const sorted = [...list];
    switch (sort) {
      case "min-dim-asc":
        sorted.sort((a, b) => a.minDim - b.minDim);
        break;
      case "min-dim-desc":
        sorted.sort((a, b) => b.minDim - a.minDim);
        break;
      case "size-asc":
        sorted.sort((a, b) => a.fileSize - b.fileSize);
        break;
      case "aspect":
        sorted.sort((a, b) => Math.abs(Math.log(b.aspect)) - Math.abs(Math.log(a.aspect)));
        break;
      case "id-asc":
        sorted.sort((a, b) => a.id.localeCompare(b.id));
        break;
    }
    return sorted;
  }, [decorated, sort, kindFilter, onlySuspicious, onlyFlagged, query, flagged]);

  function toggle(id: string) {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyFlagged() {
    const list = Array.from(flagged).sort();
    await navigator.clipboard.writeText(JSON.stringify(list, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif", color: "#18181b" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          background: "#fafafaee",
          backdropFilter: "blur(6px)",
          padding: "12px 0",
          marginBottom: 16,
          zIndex: 10,
          borderBottom: "1px solid #e4e4e7",
        }}
      >
        <h1 style={{ margin: "0 0 8px 0", fontSize: 18 }}>
          Icon audit — {filtered.length} of {entries.length}
        </h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
          <label>
            Sort{" "}
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="min-dim-asc">Smallest dimension ↑</option>
              <option value="min-dim-desc">Largest dimension ↓</option>
              <option value="size-asc">File size ↑</option>
              <option value="aspect">Most extreme aspect</option>
              <option value="id-asc">ID (A→Z)</option>
            </select>
          </label>
          <label>
            Kind{" "}
            <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as KindFilter)}>
              <option value="all">All</option>
              <option value="feast">Feasts only</option>
              <option value="saint">Saints only</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={onlySuspicious}
              onChange={(e) => setOnlySuspicious(e.target.checked)}
            />{" "}
            Only auto-flagged
          </label>
          <label>
            <input
              type="checkbox"
              checked={onlyFlagged}
              onChange={(e) => setOnlyFlagged(e.target.checked)}
            />{" "}
            Only my flags
          </label>
          <input
            type="search"
            placeholder="Filter by id…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ padding: "4px 6px", border: "1px solid #d4d4d8", borderRadius: 4 }}
          />
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <span>
              <strong>{flagged.size}</strong> flagged
            </span>
            <button
              onClick={copyFlagged}
              disabled={flagged.size === 0}
              style={{
                padding: "4px 10px",
                border: "1px solid #d4d4d8",
                borderRadius: 4,
                background: copied ? "#bbf7d0" : "#fff",
                cursor: flagged.size === 0 ? "not-allowed" : "pointer",
              }}
            >
              {copied ? "Copied!" : "Copy IDs"}
            </button>
            <button
              onClick={() => setFlagged(new Set())}
              disabled={flagged.size === 0}
              style={{
                padding: "4px 10px",
                border: "1px solid #d4d4d8",
                borderRadius: 4,
                background: "#fff",
                cursor: flagged.size === 0 ? "not-allowed" : "pointer",
              }}
            >
              Clear
            </button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#71717a", marginTop: 6 }}>
          Click a tile to flag/unflag. Click the image to open the full-size file. Click the id to open the Wikimedia source. Auto-flags: small (&lt; {SMALL_THRESHOLD}px), tiny (file &lt; {TINY_FILE_KB}KB), wide/tall (aspect &gt; {ODD_ASPECT_HIGH.toFixed(1)}).
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {filtered.map((e) => {
          const isFlagged = flagged.has(e.id);
          return (
            <div
              key={e.id}
              onClick={() => toggle(e.id)}
              style={{
                cursor: "pointer",
                border: isFlagged ? "3px solid #dc2626" : "1px solid #d4d4d8",
                borderRadius: 8,
                background: isFlagged ? "#fef2f2" : "#fff",
                padding: 8,
                fontSize: 12,
                position: "relative",
                userSelect: "none",
              }}
            >
              <a
                href={e.src}
                target="_blank"
                rel="noreferrer"
                onClick={(ev) => ev.stopPropagation()}
                style={{ display: "block" }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    background:
                      "repeating-conic-gradient(#f4f4f5 0% 25%, #fff 0% 50%) 50%/20px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 6,
                    overflow: "hidden",
                    borderRadius: 4,
                    position: "relative",
                  }}
                >
                  {e.minDim === 0 ? (
                    <span style={{ color: "#dc2626", fontWeight: 600 }}>missing file</span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.src}
                      alt={e.alt}
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      loading="lazy"
                    />
                  )}
                  {/* Center crosshairs to make off-center icons obvious. */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                      background:
                        "linear-gradient(transparent calc(50% - 1px), rgba(220,38,38,0.18) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)), linear-gradient(90deg, transparent calc(50% - 1px), rgba(220,38,38,0.18) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px))",
                    }}
                  />
                </div>
              </a>
              {e.sourceUrl ? (
                <a
                  href={e.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(ev) => ev.stopPropagation()}
                  style={{
                    fontWeight: 600,
                    wordBreak: "break-all",
                    color: "#1d4ed8",
                    textDecoration: "none",
                  }}
                  title="Open Wikimedia source"
                >
                  {e.id}
                </a>
              ) : (
                <span style={{ fontWeight: 600, wordBreak: "break-all" }}>{e.id}</span>
              )}
              <div style={{ color: "#52525b", marginTop: 2 }}>
                {e.width}×{e.height}
                {e.fileSize > 0 && <> · {(e.fileSize / 1024).toFixed(0)} KB</>}
              </div>
              <div style={{ color: "#71717a", marginTop: 2 }}>
                {e.license} · {e.kind === "feast" ? "feast" : "saint"}
              </div>
              {e.autoFlags.length > 0 && (
                <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {e.autoFlags.map((flag) => (
                    <span
                      key={flag}
                      style={{
                        padding: "1px 6px",
                        background:
                          flag === "missing"
                            ? "#fecaca"
                            : flag === "tiny" || flag === "small"
                              ? "#fef08a"
                              : "#e0e7ff",
                        borderRadius: 3,
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

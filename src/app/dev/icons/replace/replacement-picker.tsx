"use client";

import { useMemo, useState } from "react";

export type CandidateView = {
  wikimediaTitle: string;
  thumbUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  license: string;
  artist: string;
};

export type FlaggedRow = {
  id: string;
  currentSrc: string;
  currentAlt: string;
  currentCaption: string;
  currentWidth: number;
  currentHeight: number;
  currentSourceUrl: string;
  seedName: string;
  queries: string[];
  candidates: CandidateView[];
};

type Decision =
  | { kind: "replace"; candidate: CandidateView }
  | { kind: "delete" }
  | { kind: "skip" };

export default function ReplacementPicker({
  rows,
  fetchedAt,
}: {
  rows: FlaggedRow[];
  fetchedAt: string;
}) {
  const [decisions, setDecisions] = useState<Map<string, Decision>>(new Map());
  const [hideDecided, setHideDecided] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const counts = useMemo(() => {
    let replace = 0;
    let del = 0;
    for (const d of decisions.values()) {
      if (d.kind === "replace") replace++;
      else if (d.kind === "delete") del++;
    }
    return { replace, del, undecided: rows.length - replace - del, total: rows.length };
  }, [decisions, rows.length]);

  const visibleRows = useMemo(() => {
    if (!hideDecided) return rows;
    return rows.filter((r) => !decisions.has(r.id));
  }, [rows, hideDecided, decisions]);

  function decide(id: string, decision: Decision | null) {
    setDecisions((prev) => {
      const next = new Map(prev);
      if (decision === null) next.delete(id);
      else next.set(id, decision);
      return next;
    });
  }

  function escTs(s: string): string {
    return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  async function copyReplacements() {
    const lines: string[] = [
      "// Replacement entries for scripts/ingest/icons/sources.ts.",
      "// Paste these into the iconSources array (or a new sources-replace.ts),",
      "// then run: npm run ingest:icons",
      "",
    ];
    for (const row of rows) {
      const d = decisions.get(row.id);
      if (d?.kind !== "replace") continue;
      const alt = row.currentAlt || `Orthodox icon of ${row.seedName}.`;
      const caption = row.currentCaption || row.seedName;
      lines.push(`  {`);
      lines.push(`    id: "${row.id}",`);
      lines.push(`    wikimediaTitle: "${escTs(d.candidate.wikimediaTitle)}",`);
      lines.push(`    alt: "${escTs(alt)}",`);
      lines.push(`    caption: "${escTs(caption)}",`);
      lines.push(`  },`);
    }
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied("replacements");
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyDeletes() {
    const deletes: string[] = [];
    for (const row of rows) {
      if (decisions.get(row.id)?.kind === "delete") deletes.push(row.id);
    }
    const text =
      "// IDs to remove from sources.ts / sources-auto.ts, then re-run ingest:\n" +
      deletes.map((id) => `"${id}",`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied("deletes");
    setTimeout(() => setCopied(null), 2000);
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
        <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
          <h1 style={{ margin: 0, fontSize: 18 }}>Icon replacement picker</h1>
          <span style={{ fontSize: 12, color: "#71717a" }}>
            {fetchedAt ? `candidates fetched ${new Date(fetchedAt).toLocaleString()}` : "no candidates yet"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", fontSize: 13, marginTop: 8 }}>
          <span>
            <strong>{counts.replace}</strong> replacements
          </span>
          <span>
            <strong>{counts.del}</strong> deletes
          </span>
          <span style={{ color: "#71717a" }}>
            {counts.undecided} undecided of {counts.total}
          </span>
          <label>
            <input
              type="checkbox"
              checked={hideDecided}
              onChange={(e) => setHideDecided(e.target.checked)}
            />{" "}
            Hide decided
          </label>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              onClick={copyReplacements}
              disabled={counts.replace === 0}
              style={{
                padding: "4px 10px",
                border: "1px solid #d4d4d8",
                borderRadius: 4,
                background: copied === "replacements" ? "#bbf7d0" : "#fff",
                cursor: counts.replace === 0 ? "not-allowed" : "pointer",
              }}
            >
              {copied === "replacements" ? "Copied!" : `Copy ${counts.replace} replacements`}
            </button>
            <button
              onClick={copyDeletes}
              disabled={counts.del === 0}
              style={{
                padding: "4px 10px",
                border: "1px solid #d4d4d8",
                borderRadius: 4,
                background: copied === "deletes" ? "#bbf7d0" : "#fff",
                cursor: counts.del === 0 ? "not-allowed" : "pointer",
              }}
            >
              {copied === "deletes" ? "Copied!" : `Copy ${counts.del} deletes`}
            </button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#71717a", marginTop: 6 }}>
          Click a candidate to pick it. Click again to unpick. Use the trash button to mark the binding for deletion (UI falls back to initials).
        </div>
      </header>

      {visibleRows.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "#71717a" }}>
          {rows.length === 0
            ? "No flagged icons. Run the audit first."
            : "All decided. Toggle 'Hide decided' off to review again."}
        </div>
      )}

      {visibleRows.map((row) => (
        <RowView
          key={row.id}
          row={row}
          decision={decisions.get(row.id)}
          onDecide={(d) => decide(row.id, d)}
        />
      ))}
    </div>
  );
}

function RowView({
  row,
  decision,
  onDecide,
}: {
  row: FlaggedRow;
  decision: Decision | undefined;
  onDecide: (d: Decision | null) => void;
}) {
  const isDelete = decision?.kind === "delete";
  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        gap: 16,
        padding: 12,
        marginBottom: 12,
        border: "1px solid #e4e4e7",
        borderRadius: 8,
        background: isDelete ? "#fef2f2" : decision?.kind === "replace" ? "#f0fdf4" : "#fff",
      }}
    >
      <div>
        <div
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            background: "repeating-conic-gradient(#f4f4f5 0% 25%, #fff 0% 50%) 50%/16px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 4,
            overflow: "hidden",
            marginBottom: 6,
          }}
        >
          {row.currentSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.currentSrc}
              alt={row.currentAlt}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              loading="lazy"
            />
          ) : (
            <span style={{ color: "#dc2626" }}>(missing)</span>
          )}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, wordBreak: "break-all" }}>{row.id}</div>
        <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>
          {row.currentWidth}×{row.currentHeight}
        </div>
        <div style={{ fontSize: 11, color: "#71717a" }}>{row.seedName}</div>
        {row.currentSourceUrl && (
          <a
            href={row.currentSourceUrl}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 11, color: "#2563eb" }}
          >
            current src ↗
          </a>
        )}
        <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
          <button
            onClick={() => onDecide(isDelete ? null : { kind: "delete" })}
            style={{
              padding: "3px 8px",
              border: "1px solid #d4d4d8",
              borderRadius: 4,
              background: isDelete ? "#fecaca" : "#fff",
              cursor: "pointer",
              fontSize: 11,
            }}
            title="Mark for removal — UI will fall back to initials"
          >
            {isDelete ? "✓ delete" : "🗑 delete"}
          </button>
        </div>
      </div>

      <div>
        {row.candidates.length === 0 ? (
          <div style={{ fontSize: 12, color: "#71717a", padding: 12 }}>
            No candidates found. Searched: {row.queries.map((q) => `"${q}"`).join(", ") || "(no queries)"}.
            Consider marking for deletion.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: "#71717a", marginBottom: 6 }}>
              {row.candidates.length} candidates · searched: {row.queries.map((q) => `"${q}"`).join(", ")}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 8,
              }}
            >
              {row.candidates.map((c) => {
                const picked =
                  decision?.kind === "replace" && decision.candidate.wikimediaTitle === c.wikimediaTitle;
                return (
                  <div
                    key={c.wikimediaTitle}
                    onClick={() =>
                      onDecide(picked ? null : { kind: "replace", candidate: c })
                    }
                    style={{
                      border: picked ? "3px solid #16a34a" : "1px solid #d4d4d8",
                      borderRadius: 6,
                      padding: 4,
                      cursor: "pointer",
                      background: picked ? "#dcfce7" : "#fff",
                      fontSize: 10,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        background:
                          "repeating-conic-gradient(#f4f4f5 0% 25%, #fff 0% 50%) 50%/14px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 4,
                        overflow: "hidden",
                        marginBottom: 4,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.thumbUrl}
                        alt={c.wikimediaTitle}
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                        loading="lazy"
                      />
                    </div>
                    <div style={{ color: "#52525b" }}>
                      {c.width}×{c.height}
                    </div>
                    <div style={{ color: "#71717a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.wikimediaTitle}>
                      {c.wikimediaTitle.replace(/^File:/, "")}
                    </div>
                    <a
                      href={`https://commons.wikimedia.org/wiki/${encodeURIComponent(c.wikimediaTitle)}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(ev) => ev.stopPropagation()}
                      style={{ color: "#2563eb" }}
                    >
                      commons ↗
                    </a>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

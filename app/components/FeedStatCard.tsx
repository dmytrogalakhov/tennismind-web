"use client";

import { useRef } from "react";
import { toPng } from "html-to-image";
import type { FeedCardType } from "@/lib/feed";
import { formatDate } from "@/lib/analyses";

type Props = {
  type: FeedCardType;
  title: string;
  body: string;
  tags: string[];
  date: string;
};

const TYPE_CONFIG: Record<FeedCardType, { icon: string; label: string; color: string }> = {
  stat:    { icon: "📊", label: "STAT",    color: "#a855f7" },
  gear:    { icon: "🏸", label: "GEAR",    color: "#22d3ee" },
  form:    { icon: "📈", label: "FORM",    color: "#4ade80" },
  history: { icon: "📅", label: "HISTORY", color: "#fbbf24" },
  upset:   { icon: "⚡", label: "UPSET",   color: "#f472b6" },
};

function extractKeyFact(title: string, body: string): string {
  const combined = title + " " + body.split(".")[0];

  // percentage comparison: "78%" or "15.5% → 14.9%"
  const pctCompare = combined.match(/(\d+\.?\d*%)\s*(?:→|to)\s*(\d+\.?\d*%)/);
  if (pctCompare) return `${pctCompare[1]} → ${pctCompare[2]}`;

  // standalone percentage
  const pct = combined.match(/(\d+\.?\d*)%/);
  if (pct) return `${pct[1]}%`;

  // "N consecutive" / "N straight" / "N in a row"
  const consecutive = combined.match(/(\d+)\s+(?:consecutive|straight|in[- ]a[- ]row)/i);
  if (consecutive) return `${consecutive[1]} in a row`;

  // "N-match" / "N-game" / "N-set" in title
  const nMatch = title.match(/(\d+)-(?:match|game|set)/i);
  if (nMatch) return nMatch[1];

  // any meaningful number in title (skip common tournament tier numbers)
  const SKIP = new Set(["1000", "500", "250"]);
  const titleNums = (title.match(/\b(\d+)\b/g) ?? []).filter((n) => !SKIP.has(n));
  if (titleNums.length) return titleNums[0];

  // any number from first body sentence
  const firstSentence = body.split(".")[0];
  const bodyNums = (firstSentence.match(/\b(\d+)\b/g) ?? []).filter((n) => !SKIP.has(n));
  if (bodyNums.length) return bodyNums[0];

  // fall back to first three significant words from title
  return title
    .split(" ")
    .filter((w) => w.length > 3)
    .slice(0, 3)
    .join(" ");
}

export default function FeedStatCard({ type, title, body, tags, date }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.stat;
  const keyFact = extractKeyFact(title, body);

  async function handleDownload() {
    if (!cardRef.current) return;
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
    const a = document.createElement("a");
    a.download = `tennismind-${title.slice(0, 40).replace(/\s+/g, "-").toLowerCase()}.png`;
    a.href = dataUrl;
    a.click();
  }

  return (
    <div className="relative group">
      {/* Card — inline styles so html-to-image captures them faithfully */}
      <div
        ref={cardRef}
        style={{
          background: "#0a0015",
          border: "1px solid rgba(191,90,242,0.3)",
          borderRadius: 16,
          padding: 32,
          minHeight: 300,
          maxWidth: 600,
          width: "100%",
          boxSizing: "border-box",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Type label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 28,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>{cfg.icon}</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: cfg.color,
            }}
          >
            {cfg.label}
          </span>
        </div>

        {/* Key fact — BIG */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: "#BF5AF2",
            lineHeight: 1.05,
            marginBottom: 14,
            letterSpacing: "-0.02em",
          }}
        >
          {keyFact}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#ffffff",
            lineHeight: 1.4,
            marginBottom: 18,
          }}
        >
          {title}
        </div>

        {/* Body — clamped to 3 lines visually */}
        <div
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.6)",
            lineHeight: 1.65,
            marginBottom: 28,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {body}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 16,
            gap: 12,
          }}
        >
          {/* Wordmark */}
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", flexShrink: 0 }}>
            <span style={{ color: "#ffffff" }}>Tennis</span>
            <span style={{ color: "#BF5AF2" }}>Mind</span>
          </span>

          {/* Tags + date */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  padding: "2px 8px",
                  borderRadius: 999,
                }}
              >
                {tag}
              </span>
            ))}
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.25)",
                flexShrink: 0,
              }}
            >
              {formatDate(date)}
            </span>
          </div>
        </div>
      </div>

      {/* Download button — only shown on hover, not part of export */}
      <button
        onClick={handleDownload}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-2 text-white/50 hover:text-white"
        aria-label="Download as PNG"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </div>
  );
}

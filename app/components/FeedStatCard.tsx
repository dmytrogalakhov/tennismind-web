"use client";

import { useRef, useState, useEffect } from "react";
import { toPng } from "html-to-image";
import type { FeedCardType } from "@/lib/feed";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

type Props = {
  type: FeedCardType;
  title: string;
  body: string;
  tags: string[];
  date: string;
  keyNumber?: string;
};

const TYPE_CONFIG: Record<FeedCardType, { icon: string; label: string; color: string }> = {
  stat:    { icon: "📊", label: "STAT",    color: "#a855f7" },
  gear:    { icon: "🏸", label: "GEAR",    color: "#22d3ee" },
  form:    { icon: "📈", label: "FORM",    color: "#4ade80" },
  history: { icon: "📅", label: "HISTORY", color: "#fbbf24" },
  upset:   { icon: "⚡", label: "UPSET",   color: "#f472b6" },
};

// 3 lines × 1.65 line-height × 14px font-size
const COLLAPSED_HEIGHT = 3 * 1.65 * 14;

export default function FeedStatCard({ type, title, body, tags, date, keyNumber }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.stat;

  // Measure after mount whether the body actually exceeds 3 lines
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    setOverflows(el.scrollHeight > COLLAPSED_HEIGHT + 2);
  }, [body]);

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
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Type label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{cfg.icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: cfg.color }}>
            {cfg.label}
          </span>
        </div>

        {/* Key number — only shown when provided in frontmatter */}
        {keyNumber && (
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
            {keyNumber}
          </div>
        )}

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

        {/* Body — animates between collapsed and expanded via max-height */}
        <div
          ref={bodyRef}
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.6)",
            lineHeight: 1.65,
            overflow: "hidden",
            maxHeight: expanded ? "600px" : `${COLLAPSED_HEIGHT}px`,
            transition: "max-height 0.3s ease",
            marginBottom: overflows ? 12 : 28,
          }}
        >
          {body}
        </div>

        {/* Read more / Show less toggle */}
        {overflows && (
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              marginBottom: 28,
              color: "#BF5AF2",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.02em",
              opacity: 0.8,
            }}
          >
            {expanded ? "Show less ↑" : "Read more ↓"}
          </button>
        )}

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
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", flexShrink: 0 }}>
            <span style={{ color: "#ffffff" }}>Tennis</span>
            <span style={{ color: "#BF5AF2" }}>Mind</span>
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
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
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
              {formatDate(date)}
            </span>
          </div>
        </div>
      </div>

      {/* Download button — shown on hover only, outside the export ref */}
      <button
        onClick={handleDownload}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-2 text-white/50 hover:text-white"
        aria-label="Download as PNG"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </div>
  );
}

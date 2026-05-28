"use client";

import React, { useRef, useState, useEffect } from "react";
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
  imageUrl?: string;
  lang?: string;
};

const TYPE_CONFIG: Record<FeedCardType, { icon: string; label: string; color: string; borderColor: string; readMoreColor: string }> = {
  stat:    { icon: "📊", label: "STAT",    color: "#a855f7", borderColor: "rgba(168,85,247,0.3)",   readMoreColor: "#a855f7" },
  gear:    { icon: "🏸", label: "GEAR",    color: "#22d3ee", borderColor: "rgba(34,211,238,0.25)",  readMoreColor: "#22d3ee" },
  form:    { icon: "📈", label: "FORM",    color: "#4ade80", borderColor: "rgba(74,222,128,0.25)",  readMoreColor: "#4ade80" },
  history: { icon: "📅", label: "HISTORY", color: "#fbbf24", borderColor: "rgba(251,191,36,0.25)",  readMoreColor: "#fbbf24" },
  upset:   { icon: "⚡", label: "UPSET",   color: "#f472b6", borderColor: "rgba(244,114,182,0.25)", readMoreColor: "#f472b6" },
  news:       { icon: "📰", label: "NEWS",         color: "#e5e5e5", borderColor: "rgba(255,255,255,0.15)", readMoreColor: "#BF5AF2" },
  recap:      { icon: "📋", label: "DAILY RECAP",  color: "#C84E1C", borderColor: "rgba(200,78,28,0.3)",   readMoreColor: "#C84E1C" },
  prediction: { icon: "🔮", label: "MATCH PREVIEW", color: "#FFD700", borderColor: "rgba(255,215,0,0.25)",  readMoreColor: "#FFD700" },
};

const COLLAPSED_HEIGHT = 3 * 1.65 * 14;

const RECAP_HEADER_SET = new Set(["MEN'S DRAW", "WOMEN'S DRAW", "STAT OF THE DAY"]);
const PREDICTION_HEADER_RE = /^(?:WHY [^\n]+ (?:WINS|COULD UPSET)|THE KEY MATCHUP|PREDICTION)$/;
const SECTION_HEADER_REGEX = /(MEN'S DRAW|WOMEN'S DRAW|STAT OF THE DAY|WHY [^\n]+ (?:WINS|COULD UPSET)|THE KEY MATCHUP|PREDICTION)/;

function renderStructuredBody(text: string, headerColor: string) {
  const parts = text.split(SECTION_HEADER_REGEX);
  const nodes: React.ReactNode[] = [];
  let hasContent = false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    if (RECAP_HEADER_SET.has(part) || PREDICTION_HEADER_RE.test(part)) {
      if (hasContent) {
        nodes.push(
          <hr key={`d${i}`} style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "14px 0 0" }} />
        );
      }
      nodes.push(
        <div key={`h${i}`} style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: headerColor, marginTop: 12, marginBottom: 8 }}>
          {part}
        </div>
      );
    } else {
      nodes.push(
        <p key={`p${i}`} style={{ margin: 0 }}>
          {part}
        </p>
      );
    }
    hasContent = true;
  }

  return <>{nodes}</>;
}

export default function FeedStatCard({ type, title, body, tags, date, keyNumber, imageUrl, lang }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.stat;
  const isNews = type === "news" || type === "recap";

  const needsTranslation = lang === "de" || lang === "uk";
  // Start empty when translation needed — never show English to non-EN users
  const [displayTitle, setDisplayTitle] = useState(needsTranslation ? "" : title);
  const [displayBody, setDisplayBody] = useState(needsTranslation ? "" : body);
  const [translating, setTranslating] = useState(needsTranslation);
  const [translateFailed, setTranslateFailed] = useState(false);

  useEffect(() => {
    if (!needsTranslation) return;
    setTranslating(true);
    setTranslateFailed(false);
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, targetLanguage: lang }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("translate failed");
        const { translatedTitle, translatedBody } = await res.json() as {
          translatedTitle: string;
          translatedBody: string;
        };
        setDisplayTitle(translatedTitle);
        setDisplayBody(translatedBody);
      })
      .catch(() => {
        // Fall back to English and show failure note
        setDisplayTitle(title);
        setDisplayBody(body);
        setTranslateFailed(true);
      })
      .finally(() => setTranslating(false));
  }, [title, body, lang, needsTranslation]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    setOverflows(el.scrollHeight > COLLAPSED_HEIGHT + 2);
  }, [displayBody]);

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
      {/* Card — block layout, overflow:hidden clips image to card border-radius */}
      <div
        ref={cardRef}
        style={{
          background: "#0a0015",
          border: `1px solid ${cfg.borderColor}`,
          borderRadius: isNews ? 4 : 16,
          overflow: "hidden",
          maxWidth: 600,
          width: "100%",
          boxSizing: "border-box",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        }}
      >
        {/* Image — top of card, full width, fixed height, cropped cleanly */}
        {imageUrl && (
          <div style={{ width: "100%", aspectRatio: "3/2", overflow: "hidden" }}>
            <img
              src={imageUrl}
              alt={title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "top",
                display: "block",
              }}
            />
          </div>
        )}

        {/* Content — stacked below image */}
        <div style={{ padding: 24 }}>
          {/* Type label */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{cfg.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: cfg.color }}>
              {cfg.label}
            </span>
          </div>

          {/* Key number */}
          {keyNumber && (
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: cfg.color,
                lineHeight: 1.05,
                marginBottom: 12,
                letterSpacing: "-0.02em",
              }}
            >
              {keyNumber}
            </div>
          )}

          {/* Title — skeleton while translating */}
          {translating ? (
            <div className="animate-pulse mb-3">
              <div className="h-4 bg-white/10 rounded w-4/5 mb-2" />
              <div className="h-4 bg-white/10 rounded w-2/3" />
            </div>
          ) : (
            <div
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "#ffffff",
                lineHeight: 1.4,
                marginBottom: 10,
              }}
            >
              {displayTitle}
            </div>
          )}

          {/* Body — skeleton while translating */}
          {translating ? (
            <div className="animate-pulse mb-5">
              <div className="h-3 bg-white/10 rounded w-full mb-2" />
              <div className="h-3 bg-white/10 rounded w-full mb-2" />
              <div className="h-3 bg-white/10 rounded w-3/4" />
            </div>
          ) : (
            <>
              <div
                ref={bodyRef}
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.6)",
                  lineHeight: 1.65,
                  overflow: "hidden",
                  maxHeight: expanded ? "600px" : `${COLLAPSED_HEIGHT}px`,
                  transition: "max-height 0.3s ease",
                  marginBottom: overflows ? 8 : 20,
                }}
              >
                {SECTION_HEADER_REGEX.test(displayBody)
                  ? renderStructuredBody(displayBody, type === "prediction" ? "#FFD700" : "#C84E1C")
                  : displayBody}
              </div>
              {translateFailed && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8, fontStyle: "italic" }}>
                  (English original)
                </div>
              )}
            </>
          )}

          {/* Read more / Show less */}
          {overflows && (
            <button
              onClick={() => setExpanded((e) => !e)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                marginBottom: 20,
                color: cfg.readMoreColor,
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
              borderTop: "1px solid rgba(255,255,255,0.08)",
              paddingTop: 14,
              textAlign: "right",
            }}
          >
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
              {formatDate(date)}
            </span>
          </div>
        </div>
      </div>

      {/* Download button */}
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

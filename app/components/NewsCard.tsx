"use client";

import React, { useRef, useState, useEffect } from "react";
import { toPng } from "html-to-image";
import type { FeedCardType } from "@/lib/feed";
import TagPill from "./TagPill";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(iso: string): string {
  const datePart = iso.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
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

const TYPE_CONFIG: Partial<Record<FeedCardType, { icon: string; label: string }>> = {
  news:   { icon: "📰", label: "News" },
  recap:  { icon: "📋", label: "Daily Recap" },
};

// Recap section headers — green on light background
const RECAP_HEADER_SET = new Set(["MEN'S DRAW", "WOMEN'S DRAW", "STAT OF THE DAY"]);
const SECTION_HEADER_REGEX = /(MEN'S DRAW|WOMEN'S DRAW|STAT OF THE DAY)/;

function renderRecapBody(text: string) {
  const parts = text.split(SECTION_HEADER_REGEX);
  const nodes: React.ReactNode[] = [];
  let hasContent = false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    if (RECAP_HEADER_SET.has(part)) {
      if (hasContent) {
        nodes.push(
          <hr key={`d${i}`} style={{ border: "none", borderTop: "1px solid var(--color-line)", margin: "12px 0 0" }} />
        );
      }
      nodes.push(
        <div key={`h${i}`} style={{
          fontFamily: "var(--font-sans), system-ui, sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--color-green)",
          marginTop: 10,
          marginBottom: 6,
        }}>
          {part}
        </div>
      );
    } else {
      nodes.push(<p key={`p${i}`} style={{ margin: 0 }}>{part}</p>);
    }
    hasContent = true;
  }

  return <>{nodes}</>;
}

const COLLAPSED_HEIGHT = 3 * 1.6 * 18; // 3 lines at body-card size
const SANS: React.CSSProperties["fontFamily"] = "var(--font-sans), system-ui, sans-serif";
const SERIF: React.CSSProperties["fontFamily"] = "var(--font-serif), Georgia, 'Times New Roman', serif";

export default function NewsCard({ type, title, body, tags, date, keyNumber, imageUrl, lang }: Props) {
  const cardRef  = useRef<HTMLDivElement>(null);
  const bodyRef  = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded]   = useState(false);
  const [overflows, setOverflows] = useState(false);
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.news!;

  const needsTranslation = lang === "de" || lang === "uk";
  const [displayTitle, setDisplayTitle] = useState(needsTranslation ? "" : title);
  const [displayBody, setDisplayBody]   = useState(needsTranslation ? "" : body);
  const [translating, setTranslating]   = useState(needsTranslation);
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

  const isRecap = type === "recap";

  return (
    <div className="relative group">
      <div
        ref={cardRef}
        style={{
          background: "var(--color-bisque)",
          border: "1px solid var(--color-line)",
          borderRadius: "var(--radius-card)",
          overflow: "hidden",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Hero image — 1200×630 (1.91:1). No fixed height; img drives the box. */}
        {imageUrl && (
          <div style={{ width: "100%" }}>
            <img
              src={imageUrl}
              alt={title}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        )}

        <div style={{ padding: "1.25rem" }}>
          {/* Type badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>{cfg.icon}</span>
            <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--color-green)", textTransform: "uppercase" as const }}>
              {cfg.label}
            </span>
          </div>

          {/* Key number */}
          {keyNumber && (
            <div style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 700, color: "var(--color-clay)", lineHeight: 1.0, marginBottom: "0.625rem", letterSpacing: "-0.02em" }}>
              {keyNumber}
            </div>
          )}

          {/* Title */}
          {translating ? (
            <div style={{ marginBottom: "0.75rem" }}>
              <div style={{ height: 16, background: "var(--color-line)", borderRadius: 4, width: "80%", marginBottom: 8 }} />
              <div style={{ height: 16, background: "var(--color-line)", borderRadius: 4, width: "60%" }} />
            </div>
          ) : (
            <h2 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: "var(--color-ink)", lineHeight: 1.3, margin: "0 0 0.625rem", letterSpacing: "-0.01em" }}>
              {displayTitle}
            </h2>
          )}

          {/* Body */}
          {translating ? (
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ height: 13, background: "var(--color-line)", borderRadius: 4, width: "100%", marginBottom: 8 }} />
              <div style={{ height: 13, background: "var(--color-line)", borderRadius: 4, width: "100%", marginBottom: 8 }} />
              <div style={{ height: 13, background: "var(--color-line)", borderRadius: 4, width: "70%" }} />
            </div>
          ) : (
            <>
              <div
                ref={bodyRef}
                style={{
                  fontFamily: SERIF,
                  fontSize: "var(--text-body-card)",
                  color: "var(--color-ink)",
                  lineHeight: "var(--leading-body-card)",
                  overflow: "hidden",
                  maxHeight: expanded ? "2000px" : `${COLLAPSED_HEIGHT}px`,
                  transition: "max-height 0.3s ease",
                  marginBottom: overflows ? "0.5rem" : "1.25rem",
                  opacity: 0.88,
                }}
              >
                {isRecap && SECTION_HEADER_REGEX.test(displayBody)
                  ? renderRecapBody(displayBody)
                  : displayBody}
              </div>
              {translateFailed && (
                <div style={{ fontFamily: SANS, fontSize: 11, color: "var(--color-muted)", marginBottom: "0.5rem", fontStyle: "italic" }}>
                  (English original)
                </div>
              )}
            </>
          )}

          {/* Read more */}
          {overflows && (
            <button
              onClick={() => setExpanded((e) => !e)}
              style={{ background: "none", border: "none", padding: 0, marginBottom: "1.25rem", color: "var(--color-clay)", fontFamily: SANS, fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: "0.02em", textDecoration: "underline", textUnderlineOffset: 2 }}
            >
              {expanded ? "Show less ↑" : "Read more ↓"}
            </button>
          )}

          {/* Bottom bar */}
          <div style={{ borderTop: "1px solid var(--color-line)", paddingTop: "0.875rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" as const }}>
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" as const }}>
              {tags.slice(0, 3).map((tag) => (
                <TagPill key={tag} tag={tag} />
              ))}
            </div>
            <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--color-muted)" }}>
              {formatDate(date)}
            </span>
          </div>
        </div>
      </div>

      {/* Download button — appears on hover */}
      <button
        onClick={handleDownload}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-sand/80 hover:bg-sand border border-line rounded-lg p-2 text-muted hover:text-green"
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

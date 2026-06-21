"use client";

import React, { useRef, useState, useEffect } from "react";
import type { FeedCardType } from "@/lib/feed";

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

const TYPE_CONFIG: Record<FeedCardType, { icon: string; label: string }> = {
  stat:       { icon: "📊", label: "Stat" },
  gear:       { icon: "🏸", label: "Gear" },
  form:       { icon: "📈", label: "Form" },
  history:    { icon: "📅", label: "History" },
  upset:      { icon: "⚡", label: "Upset" },
  news:       { icon: "📰", label: "News" },
  recap:      { icon: "📋", label: "Recap" },
  prediction: { icon: "🔮", label: "Match Preview" },
  video:      { icon: "🎬", label: "Video" },
};

// 3 lines at body line-height
const COLLAPSED_HEIGHT = 3 * 1.7 * 15;

const SANS: React.CSSProperties["fontFamily"] = "var(--font-sans), system-ui, sans-serif";
const SERIF: React.CSSProperties["fontFamily"] = "var(--font-serif), Georgia, 'Times New Roman', serif";

export default function InsightCard({ type, title, body, tags, date, keyNumber, imageUrl, lang }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.stat;

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

  return (
    <article
      style={{
        background: "var(--color-bisque)",
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Hero image */}
      {imageUrl && (
        <div style={{ width: "100%", aspectRatio: "3/2", overflow: "hidden" }}>
          <img
            src={imageUrl}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
          />
        </div>
      )}

      <div style={{ padding: "1.25rem" }}>
        {/* Type badge — Inter sans, green, uppercase */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>{cfg.icon}</span>
          <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--color-green)", textTransform: "uppercase" as const }}>
            {cfg.label}
          </span>
        </div>

        {/* Key number — Newsreader serif, clay */}
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
              {displayBody}
            </div>
            {translateFailed && (
              <div style={{ fontFamily: SANS, fontSize: 11, color: "var(--color-muted)", marginBottom: "0.5rem", fontStyle: "italic" }}>
                (English original)
              </div>
            )}
          </>
        )}

        {/* Read more — clay link, Inter sans */}
        {overflows && (
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{ background: "none", border: "none", padding: 0, marginBottom: "1.25rem", color: "var(--color-clay)", fontFamily: SANS, fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: "0.02em", textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            {expanded ? "Show less ↑" : "Read more ↓"}
          </button>
        )}

        {/* Bottom bar — tags left, date right */}
        <div style={{ borderTop: "1px solid var(--color-line)", paddingTop: "0.875rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" as const }}>
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" as const }}>
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                style={{ fontFamily: SANS, fontSize: 11, fontWeight: 500, color: "var(--color-green)", background: "var(--color-sand)", borderRadius: "999px", padding: "2px 8px" }}
              >
                {tag}
              </span>
            ))}
          </div>
          <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--color-muted)" }}>
            {formatDate(date)}
          </span>
        </div>
      </div>
    </article>
  );
}

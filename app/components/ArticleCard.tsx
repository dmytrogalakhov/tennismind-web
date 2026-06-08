"use client";

import { useRef, useState, useEffect } from "react";
import type { Article } from "@/lib/articles";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

const COLLAPSED_HEIGHT = 3 * 1.6 * 18;
const SANS: React.CSSProperties["fontFamily"] = "var(--font-sans), system-ui, sans-serif";
const SERIF: React.CSSProperties["fontFamily"] = "var(--font-serif), Georgia, 'Times New Roman', serif";

export default function ArticleCard({ article }: { article: Article }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    setOverflows(el.scrollHeight > COLLAPSED_HEIGHT + 2);
  }, []);

  const paragraphs = article.body.split(/\n\n+/).filter(Boolean);

  return (
    <div
      style={{
        background: "var(--color-bisque)",
        border: "1px solid var(--color-line)",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ padding: "1.25rem" }}>
        {/* Type badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>✍️</span>
          <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--color-green)", textTransform: "uppercase" as const }}>
            Article
          </span>
          {article.tournament && (
            <span style={{ fontFamily: SANS, fontSize: 11, color: "var(--color-muted)", marginLeft: 4 }}>
              {article.tournament}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: "var(--color-ink)", lineHeight: 1.3, margin: "0 0 0.5rem", letterSpacing: "-0.01em" }}>
          {article.title}
        </h2>

        {/* Subtitle */}
        {article.subtitle && (
          <div style={{ fontFamily: SERIF, fontSize: 15, fontStyle: "italic", color: "var(--color-muted)", lineHeight: 1.5, marginBottom: "0.875rem" }}>
            {article.subtitle}
          </div>
        )}

        {/* Body */}
        <div
          ref={bodyRef}
          style={{
            fontFamily: SERIF,
            fontSize: "var(--text-body-card)",
            color: "var(--color-ink)",
            lineHeight: "var(--leading-body-card)",
            overflow: "hidden",
            maxHeight: expanded ? "4000px" : `${COLLAPSED_HEIGHT}px`,
            transition: "max-height 0.4s ease",
            marginBottom: overflows ? "0.5rem" : "1.25rem",
            opacity: 0.88,
          }}
        >
          {paragraphs.map((para, i) => (
            <p key={i} style={{ margin: i === 0 ? 0 : "0.875rem 0 0" }}>
              {para.replace(/\n/g, " ")}
            </p>
          ))}
        </div>

        {/* Read more */}
        {overflows && (
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{ background: "none", border: "none", padding: 0, marginBottom: "1.25rem", color: "var(--color-clay)", fontFamily: SANS, fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: "0.02em", textDecoration: "underline", textUnderlineOffset: 2 }}
          >
            {expanded ? "Show less ↑" : "Read more ↓"}
          </button>
        )}

        {/* Substack link — shown when expanded */}
        {expanded && article.substack_url && (
          <div style={{ marginBottom: "1.25rem" }}>
            <a
              href={article.substack_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: SANS, fontSize: 12, color: "var(--color-muted)", textDecoration: "underline", textUnderlineOffset: 2 }}
            >
              Read on Substack →
            </a>
          </div>
        )}

        {/* Bottom bar */}
        <div style={{ borderTop: "1px solid var(--color-line)", paddingTop: "0.875rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" as const }}>
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" as const }}>
            {article.tags.slice(0, 3).map((tag) => (
              <span key={tag} style={{ fontFamily: SANS, fontSize: 11, fontWeight: 500, color: "var(--color-green)", background: "var(--color-sand)", borderRadius: "999px", padding: "2px 8px" }}>
                {tag}
              </span>
            ))}
          </div>
          <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--color-muted)" }}>
            {formatDate(article.date)}
            {article.readTime ? ` · ${article.readTime} read` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

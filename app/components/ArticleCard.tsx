"use client";

import { useRef, useState } from "react";
import type { Article } from "@/lib/articles";
import TagPill from "./TagPill";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(iso: string): string {
  const datePart = iso.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

const SANS: React.CSSProperties["fontFamily"]  = "var(--font-sans), system-ui, sans-serif";
const SERIF: React.CSSProperties["fontFamily"] = "var(--font-serif), Georgia, 'Times New Roman', serif";

const TOGGLE_STYLE: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--color-clay)",
  fontFamily: "var(--font-sans), system-ui, sans-serif",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  letterSpacing: "0.02em",
  textDecoration: "underline",
  textUnderlineOffset: 2,
};

export default function ArticleCard({ article }: { article: Article }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  const bodyId = `article-body-${article.slug}`;

  function expand() { setExpanded(true); }
  function collapse() {
    setExpanded(false);
    setTimeout(() => rowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  const paragraphs = article.body.split(/\n\n+/).filter(Boolean);

  return (
    <div
      ref={rowRef}
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

        {/* Top row — clicking metadata expands (collapsed) or collapses (expanded) */}
        <button
          onClick={() => expanded ? collapse() : expand()}
          aria-expanded={expanded}
          aria-controls={bodyId}
          style={{
            display: "block",
            width: "100%",
            background: "none",
            border: "none",
            padding: 0,
            margin: 0,
            textAlign: "left",
            cursor: "pointer",
            font: "inherit",
            color: "inherit",
          }}
        >
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>

            {/* Square title cover */}
            <div style={{
              flexShrink: 0,
              width: "clamp(140px, 18vw, 200px)",
              aspectRatio: "1 / 1",
              borderRadius: "8px",
              overflow: "hidden",
            }}>
              <img
                src={`/api/article-cover/${article.slug}`}
                alt=""
                aria-hidden="true"
                style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
              />
            </div>

            {/* Right column: eyebrow + dek + Read more (collapsed only) */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: "0.25rem" }}>

              <div style={{
                fontFamily: SANS,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-clay)",
                marginBottom: "0.75rem",
              }}>
                {article.category}
                {article.tournament && (
                  <span style={{ color: "var(--color-muted)", marginLeft: "0.5rem", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                    · {article.tournament}
                  </span>
                )}
              </div>

              {article.subtitle && (
                <p style={{
                  fontFamily: SERIF,
                  fontSize: 14,
                  fontStyle: "normal",
                  fontWeight: 400,
                  color: "#241C15",
                  lineHeight: 1.55,
                  margin: "0 0 0.75rem",
                }}>
                  {article.subtitle}
                </p>
              )}

              {!expanded && (
                <span style={TOGGLE_STYLE}>Read more ↓</span>
              )}
            </div>
          </div>
        </button>

        {/* Bottom bar — tags + date, distinct meta footer */}
        <div style={{
          borderTop: "1px solid #D4C9B5",
          marginTop: "1.5rem",
          paddingTop: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
            {article.tags.slice(0, 3).map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
          <span style={{ fontFamily: SANS, fontSize: 12, color: "#4A4540", fontWeight: 500 }}>
            {formatDate(article.date)}
            {article.readTime ? ` · ${article.readTime} read` : ""}
          </span>
        </div>

        {/* Expandable body */}
        <div
          id={bodyId}
          role="region"
          aria-label={article.title}
          style={{
            display: "grid",
            gridTemplateRows: expanded ? "1fr" : "0fr",
            transition: "grid-template-rows 0.35s ease",
          }}
        >
          <div style={{ overflow: "hidden" }}>
            <div style={{ paddingTop: "1.25rem" }}>
              {paragraphs.map((para, i) => (
                <p key={i} style={{
                  fontFamily: SERIF,
                  fontSize: "var(--text-body-card)",
                  color: "var(--color-ink)",
                  lineHeight: "var(--leading-body-card)",
                  opacity: 0.88,
                  margin: i === 0 ? 0 : "0.875rem 0 0",
                }}>
                  {para.replace(/\n/g, " ")}
                </p>
              ))}

              {/* Read less — end of body, scrolls back to card top */}
              <div style={{ marginTop: "1.25rem" }}>
                <button onClick={collapse} style={TOGGLE_STYLE}>
                  Read less ↑
                </button>
              </div>

              {article.substack_url && (
                <div style={{ marginTop: "0.75rem" }}>
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
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

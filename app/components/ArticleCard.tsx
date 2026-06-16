"use client";

import { useRef, useState } from "react";
import type { Article } from "@/lib/articles";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(iso: string): string {
  const datePart = iso.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

const SANS: React.CSSProperties["fontFamily"]  = "var(--font-sans), system-ui, sans-serif";
const SERIF: React.CSSProperties["fontFamily"] = "var(--font-serif), Georgia, 'Times New Roman', serif";

export default function ArticleCard({ article, first }: { article: Article; first?: boolean }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  const paragraphs = article.body.split(/\n\n+/).filter(Boolean);

  return (
    <div
      style={{
        borderTop: first ? "none" : "1px solid var(--color-line)",
        paddingTop: first ? 0 : "1.75rem",
      }}
    >
      {/* Row: thumbnail left + text right */}
      <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>

        {/* Square cover thumbnail */}
        <div
          style={{
            flexShrink: 0,
            width: "clamp(140px, 18vw, 200px)",
            aspectRatio: "1 / 1",
            borderRadius: "10px",
            overflow: "hidden",
            background: "var(--color-clay)",
          }}
        >
          <img
            src={`/api/article-cover/${article.slug}`}
            alt=""
            aria-hidden="true"
            style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
          />
        </div>

        {/* Text column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Eyebrow */}
          <div style={{
            fontFamily: SANS,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-clay)",
            marginBottom: "0.4rem",
          }}>
            {article.category}
            {article.tournament && (
              <span style={{ color: "var(--color-muted)", marginLeft: "0.5rem", fontWeight: 400 }}>
                · {article.tournament}
              </span>
            )}
          </div>

          {/* Headline — expand toggle */}
          <button
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            style={{
              display: "block",
              background: "none",
              border: "none",
              padding: 0,
              margin: "0 0 0.5rem",
              textAlign: "left",
              cursor: "pointer",
              width: "100%",
            }}
          >
            <span style={{
              fontFamily: SERIF,
              fontSize: "clamp(16px, 2.2vw, 20px)",
              fontWeight: 700,
              color: "var(--color-ink)",
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
            }}>
              {article.title}
            </span>
          </button>

          {/* Dek */}
          {article.subtitle && (
            <p style={{
              fontFamily: SERIF,
              fontSize: 14,
              fontStyle: "italic",
              color: "var(--color-muted)",
              lineHeight: 1.5,
              margin: 0,
            }}>
              {article.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Expandable body — full row width */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: expanded ? "1fr" : "0fr",
          transition: "grid-template-rows 0.35s ease",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div
            ref={bodyRef}
            style={{
              paddingTop: "1.25rem",
              paddingBottom: "0.25rem",
            }}
          >
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

            {/* Meta row */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.5rem",
              marginTop: "1rem",
            }}>
              <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                {article.tags.slice(0, 3).map((tag) => (
                  <span key={tag} style={{
                    fontFamily: SANS,
                    fontSize: 11,
                    fontWeight: 500,
                    color: "var(--color-green)",
                    background: "var(--color-sand)",
                    borderRadius: "999px",
                    padding: "2px 8px",
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--color-muted)" }}>
                  {formatDate(article.date)}
                  {article.readTime ? ` · ${article.readTime} read` : ""}
                </span>
                {article.substack_url && (
                  <a
                    href={article.substack_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: SANS, fontSize: 12, color: "var(--color-muted)", textDecoration: "underline", textUnderlineOffset: 2 }}
                  >
                    Substack →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

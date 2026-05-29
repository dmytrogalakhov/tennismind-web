"use client";

import { useRef, useState, useEffect } from "react";
import type { Article } from "@/lib/articles";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

const COLLAPSED_HEIGHT = 3 * 1.65 * 14;
const ACCENT = "#BF5AF2";

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
        background: "#0a0015",
        border: "1px solid rgba(191,90,242,0.25)",
        borderRadius: 16,
        overflow: "hidden",
        maxWidth: 600,
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div style={{ padding: 24 }}>
        {/* Type label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>✍️</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: ACCENT }}>
            ARTICLE
          </span>
          {article.tournament && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginLeft: 4 }}>
              {article.tournament}
            </span>
          )}
        </div>

        {/* Title */}
        <div style={{ fontSize: 17, fontWeight: 600, color: "#ffffff", lineHeight: 1.4, marginBottom: 8 }}>
          {article.title}
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 14, fontStyle: "italic", color: "rgba(255,255,255,0.55)", lineHeight: 1.55, marginBottom: 14 }}>
          {article.subtitle}
        </div>

        {/* Body */}
        <div
          ref={bodyRef}
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.6)",
            lineHeight: 1.65,
            overflow: "hidden",
            maxHeight: expanded ? "4000px" : `${COLLAPSED_HEIGHT}px`,
            transition: "max-height 0.4s ease",
            marginBottom: overflows ? 8 : 20,
          }}
        >
          {paragraphs.map((para, i) => (
            <p key={i} style={{ margin: i === 0 ? 0 : "14px 0 0" }}>
              {para.replace(/\n/g, " ")}
            </p>
          ))}
        </div>

        {/* Read more / Show less */}
        {overflows && (
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              marginBottom: 20,
              color: ACCENT,
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

        {/* Substack link — only shown when expanded */}
        {expanded && article.substack_url && (
          <div style={{ marginBottom: 20 }}>
            <a
              href={article.substack_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.35)",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
            >
              Read on Substack →
            </a>
          </div>
        )}

        {/* Tags */}
        {article.tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {article.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.05)",
                  padding: "3px 10px",
                  borderRadius: 999,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom bar */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14, textAlign: "right" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
            {formatDate(article.date)}
            {article.readTime ? ` · ${article.readTime} read` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

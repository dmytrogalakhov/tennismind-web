/**
 * renderArticleCard — terracotta article card for the articles index + OG/social image.
 * SVG → PNG via @resvg/resvg-js. Text measurement via opentype.js.
 * Output: 1536×806 px (design space 1200×630, rendered at 1.28×).
 * Aspect ratio 1200:630 = 1.905:1 (standard OG/share image).
 *
 * Field is clay-deep (#9E4023); all structural elements flip to cream/warm-white.
 * Same pipeline as newsCard.ts — shared fonts util (latin + latin-ext merged TTFs).
 */

import { Resvg } from "@resvg/resvg-js";
import * as opentype from "opentype.js";
import { FONT_PATHS, FONT_FILES, loadCardFont } from "./fonts";

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  field:      "#9E4023",  // clay-deep — background field
  greenDeep:  "#0D2C20",  // ball fill, outer frame
  cream:      "#F4ECDC",  // inner frame, eyebrow, rule, ball ring
  warmWhite:  "#F8F1E2",  // headline, wordmark
  dekTint:    "#F0E3CC",  // dek text (slightly warmer than cream)
} as const;

// ── Canvas dimensions (design space 1200×630, OG-compatible) ────────────────
const W     = 1200;
const H     = 630;
const SCALE = 1.28; // → 1536 × 806 output

// ── Content margins ──────────────────────────────────────────────────────────
const PAD_H     = 72;
const CONTENT_W = W - PAD_H * 2; // 1056 px

// ── Vertical layout anchors (design coordinates) ─────────────────────────────
// Category label baseline:  150
// Headline block start:     248  (58px font, 70px leading, up to 2 lines)
// Cream rule:              ~362  (slides down 70px for each extra headline line)
// Dek line 1 baseline:     ~416  (rule + 54)
// Dek line 2 baseline:     ~452  (dek line 1 + 36)
// Footer baseline:          558
const CAT_Y        = 150;
const HL_START_Y   = 248;
const HL_FONT      = 58;
const HL_LEADING   = 70;
const MAX_HL_LINES = 2;
const RULE_Y_BASE  = 362;
const DEK_OFFSET   = 54;
const DEK_LEADING  = 36;
const FOOTER_Y     = 558;

// ── Helpers ──────────────────────────────────────────────────────────────────
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const loadOT = loadCardFont;

function measureText(font: opentype.Font | null, text: string, size: number): number {
  if (font) {
    try {
      return font.getAdvanceWidth(text, size);
    } catch { /* fall through */ }
  }
  return text.length * size * 0.52;
}

function wrapLines(
  font: opentype.Font | null,
  text: string,
  size: number,
  maxW: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measureText(font, candidate, size) <= maxW) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function resolveHeadline(
  font: opentype.Font | null,
  text: string,
): { lines: string[]; size: number } {
  for (const sz of [HL_FONT, 52, 46] as const) {
    const lines = wrapLines(font, text, sz, CONTENT_W);
    if (lines.length <= MAX_HL_LINES) return { lines, size: sz };
  }
  return { lines: wrapLines(font, text, 46, CONTENT_W).slice(0, MAX_HL_LINES), size: 46 };
}

function resolveDek(
  font: opentype.Font | null,
  text: string,
): { lines: string[]; size: number } {
  for (const sz of [28, 25] as const) {
    const lines = wrapLines(font, text, sz, CONTENT_W);
    if (lines.length <= 2) return { lines, size: sz };
  }
  return { lines: wrapLines(font, text, 25, CONTENT_W).slice(0, 2), size: 25 };
}

// ── SVG builder ──────────────────────────────────────────────────────────────
function buildSvg(
  data: { category: string; headline: string; dek: string },
  font600: opentype.Font | null,
  fontItalic: opentype.Font | null,
): string {
  const { category, headline, dek } = data;

  const { lines: hlLines, size: hlSize } = resolveHeadline(font600, headline);
  const { lines: dekLines, size: dekSize } = resolveDek(fontItalic ?? font600, dek);

  const ruleY = RULE_Y_BASE + (hlLines.length - 1) * HL_LEADING;
  const dekY1 = ruleY + DEK_OFFSET;

  const hlSvg = hlLines
    .map(
      (line, i) =>
        `  <text x="${PAD_H}" y="${HL_START_Y + i * HL_LEADING}" ` +
        `font-family="Newsreader" font-weight="600" font-size="${hlSize}" ` +
        `fill="${C.warmWhite}" letter-spacing="-1">${esc(line)}</text>`,
    )
    .join("\n");

  const dekSvg = dekLines
    .map(
      (line, i) =>
        `  <text x="80" y="${dekY1 + i * DEK_LEADING}" ` +
        `font-family="Newsreader" font-weight="600" font-style="italic" font-size="${dekSize}" ` +
        `fill="${C.dekTint}">${esc(line)}</text>`,
    )
    .join("\n");

  // Ball lockup (bottom-left): green-deep fill, cream ring, cream seam
  const bx = PAD_H;
  const by = FOOTER_Y - 10;
  const br = 11;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <!-- Field -->
  <rect width="${W}" height="${H}" rx="16" fill="${C.field}"/>

  <!-- Outer frame: green-deep at 55% opacity, 2px -->
  <rect x="11" y="11" width="${W - 22}" height="${H - 22}" rx="13"
        fill="none" stroke="${C.greenDeep}" stroke-opacity="0.55" stroke-width="2"/>

  <!-- Inner frame: cream at 32% opacity, 1.5px -->
  <rect x="19" y="19" width="${W - 38}" height="${H - 38}" rx="11"
        fill="none" stroke="${C.cream}" stroke-opacity="0.32" stroke-width="1.5"/>

  <!-- Category eyebrow: Inter 700, cream -->
  <text x="${PAD_H}" y="${CAT_Y}"
        font-family="Inter" font-weight="700" font-size="34"
        fill="${C.cream}" letter-spacing="4">${esc(category.toUpperCase())}</text>

  <!-- Headline: Newsreader 600, warm-white -->
${hlSvg}

  <!-- Rule: cream at 55% opacity, 2.5px -->
  <rect x="${PAD_H}" y="${ruleY}" width="${CONTENT_W}" height="2.5" rx="1.25"
        fill="${C.cream}" fill-opacity="0.55"/>

  <!-- Dek: Newsreader italic, warm tint, up to 2 lines -->
${dekSvg}

  <!-- Lockup: ball (green-deep fill + cream ring + cream seam) -->
  <circle cx="${bx + br}" cy="${by}" r="${br}" fill="${C.greenDeep}"/>
  <circle cx="${bx + br}" cy="${by}" r="${br}"
          fill="none" stroke="${C.cream}" stroke-width="1.8"/>
  <path d="M${bx + 3},${by} Q${bx + br},${by - 8} ${bx + br * 2 - 3},${by}"
        fill="none" stroke="${C.cream}" stroke-width="1.5" stroke-opacity="0.75"/>
  <path d="M${bx + 3},${by} Q${bx + br},${by + 8} ${bx + br * 2 - 3},${by}"
        fill="none" stroke="${C.cream}" stroke-width="1.5" stroke-opacity="0.75"/>

  <!-- Wordmark: Newsreader 600, warm-white -->
  <text x="${bx + br * 2 + 12}" y="${FOOTER_Y + 4}"
        font-family="Newsreader" font-weight="600" font-size="32"
        fill="${C.warmWhite}">TennisMind</text>

</svg>`;
}

// ── Public API ────────────────────────────────────────────────────────────────
export type ArticleCategory = "ANALYSIS" | "FEATURE" | "INSIGHT" | "OPINION";

export interface ArticleCardData {
  category: ArticleCategory;
  headline: string;
  dek: string;        // subtitle sentence; target ≤110 chars for clean 2-line wrap
}

export function renderArticleCard(data: ArticleCardData): Buffer {
  const font600    = loadOT(FONT_PATHS.newsreader600);
  const fontItalic = loadOT(FONT_PATHS.newsreader600italic);

  const svg = buildSvg(data, font600, fontItalic);

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: Math.round(W * SCALE) },
    font: {
      fontFiles:       FONT_FILES,
      loadSystemFonts: false,
      serifFamily:     "Newsreader",
      sansSerifFamily: "Inter",
    },
  });

  return Buffer.from(resvg.render().asPng());
}

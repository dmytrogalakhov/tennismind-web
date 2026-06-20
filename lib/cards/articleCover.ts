/**
 * renderArticleCover — square title cover for the articles index list.
 * 1080×1080 px: eyebrow + headline (700 Bold, vertically centred) + rule + lockup. No dek.
 * Separate from articleCard.ts (1200×630 landscape hero/OG).
 */

import { Resvg } from "@resvg/resvg-js";
import * as opentype from "opentype.js";
import { FONT_FILES, FONT_PATHS, loadCardFont } from "./fonts";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  field:     "#9E4023",
  greenDeep: "#0D2C20",
  cream:     "#F4ECDC",
  warmWhite: "#F8F1E2",
} as const;

// ── Canvas ────────────────────────────────────────────────────────────────────
const W     = 1080;
const H     = 1080;
const SCALE = 1.0;

// ── Layout anchors ────────────────────────────────────────────────────────────
const PAD       = 96;
const CONTENT_W = W - PAD * 2;   // 888 px

// Eyebrow baseline
const EYE_Y = 225;

// Vertical zone available for the headline block:
//   top of zone = just below eyebrow (EYE_Y + some breathing room)
//   bottom of zone = just above lockup
const ZONE_TOP    = EYE_Y + 60;   // ~285
const LOCK_Y      = 962;
const LOCK_HEIGHT = 44;            // approximate cap-height of the lockup text
const ZONE_BOTTOM = LOCK_Y - LOCK_HEIGHT - 60;  // ~858

// Rule gap below last headline line
const RULE_GAP = 45;

// Upward bias: shift headline above true centre toward the upper third
const VERTICAL_BIAS = 60;

// Frame insets
const OUTER_INS = 14;
const INNER_INS = 25;
const OUTER_R   = 18;
const INNER_R   = 13;

// Lockup ball icon
const ICON_R  = 14;
const ICON_CX = PAD + ICON_R;

// ── Headline size ladder (80 → 68 → 58, up to 4 lines) ───────────────────────
const HL_CONFIGS = [
  { size: 80, leading: 94 },
  { size: 68, leading: 82 },
  { size: 58, leading: 70 },
] as const;
const MAX_HL_LINES = 4;

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function measureText(font: opentype.Font | null, text: string, size: number): number {
  if (font) {
    try { return font.getAdvanceWidth(text, size); } catch { /* fall through */ }
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
): { lines: string[]; size: number; leading: number } {
  for (const { size, leading } of HL_CONFIGS) {
    const lines = wrapLines(font, text, size, CONTENT_W);
    if (lines.length <= MAX_HL_LINES) return { lines, size, leading };
  }
  const { size, leading } = HL_CONFIGS[2];
  return {
    lines:   wrapLines(font, text, size, CONTENT_W).slice(0, MAX_HL_LINES),
    size,
    leading,
  };
}

// ── SVG builder ───────────────────────────────────────────────────────────────
function buildSvg(
  category: string,
  headline: string,
  font700: opentype.Font | null,
): string {
  const { lines, size, leading } = resolveHeadline(font700, headline);

  // Block height: from first baseline to bottom of last line (~0.25em descender)
  const blockH = (lines.length - 1) * leading + size;

  // Position the block in the available zone, biased above centre
  const zoneH    = ZONE_BOTTOM - ZONE_TOP;
  const hlStartY = ZONE_TOP + Math.round((zoneH - blockH) / 2) + size - VERTICAL_BIAS;

  // Rule follows the block
  const ruleY = hlStartY + (lines.length - 1) * leading + RULE_GAP;

  const hlSvg = lines
    .map((line, i) =>
      `  <text x="${PAD}" y="${hlStartY + i * leading}" ` +
      `font-family="Newsreader" font-weight="700" font-size="${size}" ` +
      `fill="${C.warmWhite}" letter-spacing="-1">${esc(line)}</text>`,
    )
    .join("\n");

  // Lockup seam paths
  const si = ICON_R * 0.6;
  const seamUp   = `M${ICON_CX - si},${LOCK_Y} Q${ICON_CX},${LOCK_Y - si * 0.75} ${ICON_CX + si},${LOCK_Y}`;
  const seamDown = `M${ICON_CX - si},${LOCK_Y} Q${ICON_CX},${LOCK_Y + si * 0.75} ${ICON_CX + si},${LOCK_Y}`;
  const wordmarkX = ICON_CX + ICON_R + 14;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">

  <!-- Field -->
  <rect width="${W}" height="${H}" rx="20" fill="${C.field}"/>

  <!-- Outer frame: green-deep @0.55, 3px -->
  <rect x="${OUTER_INS}" y="${OUTER_INS}"
        width="${W - OUTER_INS * 2}" height="${H - OUTER_INS * 2}"
        rx="${OUTER_R}" fill="none"
        stroke="${C.greenDeep}" stroke-opacity="0.55" stroke-width="3"/>

  <!-- Inner frame: cream @0.32, 2px -->
  <rect x="${INNER_INS}" y="${INNER_INS}"
        width="${W - INNER_INS * 2}" height="${H - INNER_INS * 2}"
        rx="${INNER_R}" fill="none"
        stroke="${C.cream}" stroke-opacity="0.32" stroke-width="2"/>

  <!-- Eyebrow: Inter 700, cream -->
  <text x="${PAD}" y="${EYE_Y}"
        font-family="Inter" font-weight="700" font-size="44"
        fill="${C.cream}" letter-spacing="6">${esc(category.toUpperCase())}</text>

  <!-- Headline: Newsreader 700 Bold, warm cream, vertically centred, dynamic size+wrap -->
${hlSvg}

  <!-- Rule: cream @0.55, 2.5px, fixed gap below headline block -->
  <rect x="${PAD}" y="${ruleY}" width="${CONTENT_W}" height="2.5" rx="1.25"
        fill="${C.cream}" fill-opacity="0.55"/>

  <!-- Lockup: ball icon -->
  <circle cx="${ICON_CX}" cy="${LOCK_Y}" r="${ICON_R}" fill="${C.greenDeep}"/>
  <circle cx="${ICON_CX}" cy="${LOCK_Y}" r="${ICON_R}"
          fill="none" stroke="${C.cream}" stroke-width="2"/>
  <path d="${seamUp}"   fill="none" stroke="${C.cream}" stroke-width="1.5" stroke-opacity="0.75"/>
  <path d="${seamDown}" fill="none" stroke="${C.cream}" stroke-width="1.5" stroke-opacity="0.75"/>

  <!-- Lockup: wordmark -->
  <text x="${wordmarkX}" y="${LOCK_Y + 14}"
        font-family="Newsreader" font-weight="600" font-size="44"
        fill="${C.warmWhite}">TennisMind</text>

</svg>`;
}

// ── Public API ─────────────────────────────────────────────────────────────────
export type ArticleCoverCategory = "ANALYSIS" | "FEATURE" | "INSIGHT" | "OPINION";

export interface ArticleCoverData {
  category: ArticleCoverCategory;
  headline: string;
}

export function renderArticleCover(data: ArticleCoverData): Buffer {
  const font700 = loadCardFont(FONT_PATHS.newsreader700);

  const svg = buildSvg(data.category, data.headline, font700);

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

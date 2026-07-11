/**
 * matchStatsCard.ts — broadcast-inspired match stats card.
 * Field: Green (#123A2A, court green, news card family).
 */

import { Resvg } from "@resvg/resvg-js";
import { FONT_FILES, FONT_PATHS, loadCardFont } from "./fonts";

const W     = 1200;
const H     = 700;
const SCALE = 1.28; // → 1536px wide output

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(" ", max);
  return cut > 0 ? text.slice(0, cut) + "…" : text.slice(0, max) + "…";
}

function wrapTake(text: string): [string, string | null] {
  const t = text.trim();
  const LINE = 88;
  if (t.length <= LINE) return [t, null];
  const cut = t.lastIndexOf(" ", LINE);
  const line1 = cut > 0 ? t.slice(0, cut) : t.slice(0, LINE);
  const rest  = t.slice(line1.length).trim();
  return [line1, truncateAtWord(rest, LINE)];
}

function surnameFontSize(s: string): number {
  if (s.length <= 9)  return 54;
  if (s.length <= 14) return 44;
  return 36;
}

export interface MatchStatRow {
  label:       string;   // ALL CAPS
  winnerValue: string;
  loserValue:  string;
  winnerLeads: boolean;
}

export interface MatchStatsCardData {
  winner: { surname: string; fullName: string; country: string };
  loser:  { surname: string; fullName: string; country: string };
  score:  string;
  event:  string;
  stats:  MatchStatRow[];
  take:   string;
}

const ROW_TOPS      = [234, 273, 312, 351, 390, 429, 468, 507] as const;
const ROW_BASELINES = ROW_TOPS.map(t => t + 27);

function buildSvg(data: MatchStatsCardData): string {
  const { winner, loser, score, event, stats, take } = data;

  const rows = stats.slice(0, 8);
  const [takeLine1, takeLine2] = wrapTake((take || "").trim());

  const wSz = surnameFontSize(winner.surname);
  const lSz = surnameFontSize(loser.surname);

  const wDetail = `${winner.fullName}  ·  ${winner.country}`;
  const lDetail = `${loser.fullName}  ·  ${loser.country}`;

  const statRowsSvg = rows.map((row, i) => {
    const top      = ROW_TOPS[i];
    const baseline = ROW_BASELINES[i];
    const isEven   = i % 2 === 0;
    const isTotalPts = row.label.toUpperCase().includes("TOTAL POINTS");

    const wLeads   = row.winnerLeads;
    const wWeight  = wLeads ? "700" : "500";
    const wOpacity = wLeads ? "1.0" : "0.28";
    const wColor   = isTotalPts ? "#C0512F" : "#F4ECDC";

    const lWeight  = wLeads ? "500" : "700";
    const lOpacity = wLeads ? "0.28" : "1.0";

    const bg = isEven
      ? `<rect x="0" y="${top}" width="${W}" height="39" fill="#F4ECDC" fill-opacity="0.035"/>`
      : "";

    return `
    ${bg}
    <text x="330" y="${baseline}" text-anchor="end"
          font-family="Inter" font-weight="${wWeight}" font-size="22"
          fill="${wColor}" fill-opacity="${wOpacity}">${esc(row.winnerValue)}</text>
    <text x="600" y="${baseline}" text-anchor="middle"
          font-family="Inter" font-weight="700" font-size="13"
          letter-spacing="3" fill="#F4ECDC" fill-opacity="0.42">${esc(row.label)}</text>
    <text x="870" y="${baseline}"
          font-family="Inter" font-weight="${lWeight}" font-size="22"
          fill="#F4ECDC" fill-opacity="${lOpacity}">${esc(row.loserValue)}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <clipPath id="card">
      <rect width="${W}" height="${H}" rx="18"/>
    </clipPath>
  </defs>

  <g clip-path="url(#card)">

    <!-- FIELD -->
    <rect width="${W}" height="${H}" fill="#123A2A"/>

    <!-- TOP BAR -->
    <rect x="0" y="0" width="${W}" height="5" fill="#C0512F"/>

    <!-- HEADER -->
    <text x="600" y="50" text-anchor="middle"
          font-family="Inter" font-weight="700" font-size="18"
          fill="#C0512F" letter-spacing="7">MATCH STATS</text>
    <text x="600" y="74" text-anchor="middle"
          font-family="Inter" font-weight="500" font-size="14"
          fill="#F4ECDC" fill-opacity="0.45" letter-spacing="2">${esc(event)}</text>
    <line x1="0" y1="90" x2="${W}" y2="90"
          stroke="#F4ECDC" stroke-opacity="0.18" stroke-width="1"/>

    <!-- PLAYERS -->
    <text x="80" y="148"
          font-family="Newsreader" font-weight="600" font-size="${wSz}"
          fill="#F4ECDC">${esc(winner.surname)}</text>
    <text x="80" y="174"
          font-family="Inter" font-weight="500" font-size="14"
          fill="#F4ECDC" fill-opacity="0.45" letter-spacing="3">${esc(wDetail)}</text>

    <text x="600" y="142" text-anchor="middle"
          font-family="Inter" font-weight="700" font-size="42"
          fill="#C0512F" letter-spacing="5">${esc(score)}</text>

    <!-- WINNER badge -->
    <rect x="532" y="153" width="136" height="26" rx="13"
          fill="#C0512F" fill-opacity="0.15"
          stroke="#C0512F" stroke-opacity="0.60" stroke-width="1"/>
    <text x="600" y="171" text-anchor="middle"
          font-family="Inter" font-weight="700" font-size="11"
          fill="#C0512F" letter-spacing="4">WINNER</text>

    <text x="1120" y="148" text-anchor="end"
          font-family="Newsreader" font-weight="600" font-size="${lSz}"
          fill="#F4ECDC" fill-opacity="0.32">${esc(loser.surname)}</text>
    <text x="1120" y="174" text-anchor="end"
          font-family="Inter" font-weight="500" font-size="14"
          fill="#F4ECDC" fill-opacity="0.25" letter-spacing="3">${esc(lDetail)}</text>

    <!-- COLUMN HEADER BAND -->
    <rect x="0" y="192" width="${W}" height="42" fill="#0D2C20"/>

    <!-- STAT ROWS -->
${statRowsSvg}

    <!-- FOOTER RULE -->
    <line x1="0" y1="550" x2="${W}" y2="550"
          stroke="#F4ECDC" stroke-opacity="0.18" stroke-width="1"/>

    <!-- TAKE -->
    <text x="80" y="585"
          font-family="Newsreader" font-weight="600" font-style="italic" font-size="22"
          fill="#F4ECDC" fill-opacity="0.58">${esc(takeLine1)}</text>
    ${takeLine2 ? `<text x="80" y="611"
          font-family="Newsreader" font-weight="600" font-style="italic" font-size="22"
          fill="#F4ECDC" fill-opacity="0.58">${esc(takeLine2)}</text>` : ""}

    <!-- LOCKUP -->
    <circle cx="102" cy="644" r="20"
            fill="none" stroke="#F4ECDC" stroke-opacity="0.45" stroke-width="1.6"/>
    <circle cx="102" cy="644" r="12" fill="#C0512F"/>
    <path d="M 90 644 C 96 635, 108 653, 114 644"
          fill="none" stroke="#F4ECDC" stroke-width="2"
          stroke-linecap="round"/>
    <text x="138" y="653"
          font-family="Newsreader" font-weight="600" font-size="28"
          fill="#F4ECDC" fill-opacity="0.70">TennisMind</text>

  </g>
</svg>`;
}

export function renderMatchStatsCard(data: MatchStatsCardData): Buffer {
  if (!data.score)        throw new Error("score must be non-empty");
  if (!data.stats.length) throw new Error("stats must have at least 1 row");

  loadCardFont(FONT_PATHS.inter500);

  const svg = buildSvg(data);

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: Math.round(W * SCALE) },
    font:  {
      fontFiles:       FONT_FILES,
      loadSystemFonts: false,
      serifFamily:     "Newsreader",
      sansSerifFamily: "Inter",
    },
  });

  return Buffer.from(resvg.render().asPng());
}

import { Resvg } from "@resvg/resvg-js";
import * as opentype from "opentype.js";
import { FONT_PATHS, FONT_FILES, loadCardFont } from "./fonts";

const W     = 1200;
const H     = 630;
const SCALE = 1.28;

const PAD = 80;
const CONTENT_W = W - PAD * 2;

// Hard court swing palette — based on NBO/Cincinnati blue courts
const C = {
  bg:      "#060E1A",  // near-black navy
  topBar:  "#005AAA",  // NBO court blue
  frameOuter: "#2A7FD4",  // medium blue, 70% opacity
  frameInner: "#FFFFFF",  // white, 20% opacity
  vsBadge: "#005AAA",
  accent:  "#4AA8FF",  // bright blue for labels and %
  text:    "#F5F0E8",
  sub:     "#F5F0E8",  // subdued at 50–65% opacity in SVG
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function measureText(font: opentype.Font | null, text: string, size: number): number {
  if (font) {
    try { return font.getAdvanceWidth(text, size); } catch { /* fallback */ }
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

function truncateAtWord(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.lastIndexOf(" ", maxChars);
  return cut > 0 ? text.slice(0, cut) + "…" : text.slice(0, maxChars) + "…";
}

function surnameSize(surname: string): number {
  if (surname.length <= 8)  return 62;
  if (surname.length <= 12) return 52;
  return 44;
}

export interface HardCourtPlayerInfo {
  surname:  string;
  fullName: string;
  country:  string;
  seed?:    number;
}

export interface HardCourtPredictionData {
  player1:    HardCourtPlayerInfo;
  player2:    HardCourtPlayerInfo;
  pick:       string;
  confidence: number;
  take:       string;
  tournament: string;
  round:      string;
}

function buildSvg(
  data:       HardCourtPredictionData,
  fontBold:   opentype.Font | null,
  fontItalic: opentype.Font | null,
): string {
  const { player1, player2, pick, confidence, take, tournament, round } = data;

  const pickLower = pick.toLowerCase().trim();
  const isP1 = player1.surname.toLowerCase() === pickLower;
  const isP2 = player2.surname.toLowerCase() === pickLower;
  if (!isP1 && !isP2) {
    throw new Error(
      `pick "${pick}" must match player1.surname "${player1.surname}" or player2.surname "${player2.surname}"`,
    );
  }

  const conf        = Math.max(0, Math.min(100, Math.round(confidence)));
  const takeText    = truncateAtWord(take, 100);
  const takeLines   = wrapLines(fontItalic ?? fontBold, takeText, 22, CONTENT_W).slice(0, 2);
  const pickSurname = isP1 ? player1.surname : player2.surname;
  const pickSz      = surnameSize(pickSurname);
  const sz1         = surnameSize(player1.surname);
  const sz2         = surnameSize(player2.surname);

  const pickW = measureText(fontBold, pickSurname, pickSz);
  const confX = PAD + pickW + 24;

  const det = (p: HardCourtPlayerInfo) =>
    [p.seed ? `[${p.seed}]` : null, p.country].filter(Boolean).join("  ");

  const vsW = 156, vsH = 56, vsRx = 28;
  const vsX = 600 - vsW / 2;
  const vsY = 276 - vsH / 2;

  const takeSvg = takeLines
    .map(
      (line, i) =>
        `    <text x="${PAD}" y="${495 + i * 32}"
          font-family="Newsreader" font-weight="600" font-style="italic" font-size="22"
          fill="${C.sub}" fill-opacity="0.65">${esc(line)}</text>`,
    )
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <clipPath id="card-clip">
      <rect width="${W}" height="${H}" rx="20"/>
    </clipPath>
  </defs>

  <g clip-path="url(#card-clip)">
    <!-- Background -->
    <rect width="${W}" height="${H}" fill="${C.bg}"/>

    <!-- Blue top bar -->
    <rect x="0" y="0" width="${W}" height="6" fill="${C.topBar}"/>

    <!-- Outer frame: medium blue 70% -->
    <rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="16"
          fill="none" stroke="${C.frameOuter}" stroke-opacity="0.70" stroke-width="2"/>

    <!-- Inner frame: white 20% -->
    <rect x="30" y="30" width="${W - 60}" height="${H - 60}" rx="10"
          fill="none" stroke="${C.frameInner}" stroke-opacity="0.20" stroke-width="1.5"/>

    <!-- "PREDICTION" eyebrow -->
    <text x="${PAD}" y="100"
          font-family="Inter" font-weight="700" font-size="22"
          fill="${C.accent}" letter-spacing="6">${esc("PREDICTION")}</text>

    <!-- Tournament · Round -->
    <text x="${PAD}" y="136"
          font-family="Inter" font-weight="500" font-size="18"
          fill="${C.text}" fill-opacity="0.60" letter-spacing="3">${esc(`${tournament.toUpperCase()}  ·  ${round.toUpperCase()}`)}</text>

    <!-- Blue hairline -->
    <rect x="${PAD}" y="158" width="${CONTENT_W}" height="1"
          fill="${C.frameOuter}" fill-opacity="0.50"/>

    <!-- Player 1 surname -->
    <text x="300" y="276" text-anchor="middle"
          font-family="Newsreader" font-weight="600" font-size="${sz1}"
          fill="${C.text}">${esc(player1.surname)}</text>

    <!-- Player 1 details -->
    <text x="300" y="316" text-anchor="middle"
          font-family="Inter" font-weight="500" font-size="16"
          fill="${C.text}" fill-opacity="0.50">${esc(det(player1))}</text>

    <!-- VS badge -->
    <rect x="${vsX}" y="${vsY}" width="${vsW}" height="${vsH}" rx="${vsRx}" fill="${C.vsBadge}"/>
    <text x="600" y="284" text-anchor="middle"
          font-family="Inter" font-weight="700" font-size="22"
          fill="${C.text}" letter-spacing="4">${esc("VS")}</text>

    <!-- Player 2 surname -->
    <text x="900" y="276" text-anchor="middle"
          font-family="Newsreader" font-weight="600" font-size="${sz2}"
          fill="${C.text}">${esc(player2.surname)}</text>

    <!-- Player 2 details -->
    <text x="900" y="316" text-anchor="middle"
          font-family="Inter" font-weight="500" font-size="16"
          fill="${C.text}" fill-opacity="0.50">${esc(det(player2))}</text>

    <!-- Pick zone separator -->
    <rect x="${PAD}" y="354" width="${CONTENT_W}" height="1"
          fill="${C.frameOuter}" fill-opacity="0.30"/>

    <!-- "OUR PICK" label -->
    <text x="${PAD}" y="392"
          font-family="Inter" font-weight="700" font-size="14"
          fill="${C.accent}" letter-spacing="6">${esc("OUR PICK")}</text>

    <!-- Picked surname -->
    <text x="${PAD}" y="454"
          font-family="Newsreader" font-weight="600" font-size="${pickSz}"
          fill="${C.text}">${esc(pickSurname)}</text>

    <!-- Confidence (inline, blue) -->
    <text x="${confX}" y="454"
          font-family="Inter" font-weight="700" font-size="36"
          fill="${C.accent}">${esc(`${conf}%`)}</text>

    <!-- Take line (italic, up to 2 lines) -->
${takeSvg}

    <!-- Footer: ball icon (outer ring + blue fill + seams) -->
    <circle cx="100" cy="576" r="20"
            fill="none" stroke="${C.frameOuter}" stroke-opacity="0.70" stroke-width="1.5"/>
    <circle cx="100" cy="576" r="12" fill="${C.topBar}"/>
    <path d="M82,576 Q100,564 118,576"
          fill="none" stroke="${C.text}" stroke-width="1.3" stroke-opacity="0.55"/>
    <path d="M82,576 Q100,588 118,576"
          fill="none" stroke="${C.text}" stroke-width="1.3" stroke-opacity="0.55"/>

    <!-- Wordmark -->
    <text x="138" y="586"
          font-family="Newsreader" font-weight="600" font-size="28"
          fill="${C.text}">TennisMind</text>

  </g>
</svg>`;
}

export function renderHardCourtPredictionCard(data: HardCourtPredictionData): Buffer {
  const fontBold   = loadCardFont(FONT_PATHS.newsreader600);
  const fontItalic = loadCardFont(FONT_PATHS.newsreader600italic);

  const svg = buildSvg(data, fontBold, fontItalic);

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

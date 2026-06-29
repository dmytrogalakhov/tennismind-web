import { Resvg } from "@resvg/resvg-js";
import * as opentype from "opentype.js";
import { FONT_PATHS, FONT_FILES, loadCardFont } from "./fonts";

const W     = 1200;
const H     = 630;
const SCALE = 1.28;

const PAD = 80;
const CONTENT_W = W - PAD * 2; // 1040 px

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

export interface WimbledonPlayerInfo {
  surname:  string;
  fullName: string;
  country:  string;
  seed?:    number;
}

export interface WimbledonPredictionData {
  player1:    WimbledonPlayerInfo;
  player2:    WimbledonPlayerInfo;
  pick:       string;  // must match player1.surname or player2.surname (case-insensitive)
  confidence: number;  // 0–100, clamped
  take:       string;  // reasoning; truncated at 100 chars
  tournament: string;  // e.g. "WIMBLEDON · 2026"
  round:      string;  // e.g. "ROUND 1"
}

function buildSvg(
  data:       WimbledonPredictionData,
  fontBold:   opentype.Font | null,
  fontItalic: opentype.Font | null,
): string {
  const { player1, player2, pick, confidence, take, tournament, round } = data;

  // Validate pick
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

  // Confidence sits inline at the surname baseline
  const pickW = measureText(fontBold, pickSurname, pickSz);
  const confX = PAD + pickW + 24;

  // Player detail line: seed bracket + country
  const det = (p: WimbledonPlayerInfo) =>
    [p.seed ? `[${p.seed}]` : null, p.country].filter(Boolean).join("  ");

  // VS badge geometry (centered at 600, 276)
  const vsW = 156, vsH = 56, vsRx = 28;
  const vsX = 600 - vsW / 2; // 522
  const vsY = 276 - vsH / 2; // 248

  // Take lines SVG
  const takeSvg = takeLines
    .map(
      (line, i) =>
        `    <text x="${PAD}" y="${495 + i * 32}"
          font-family="Newsreader" font-weight="600" font-style="italic" font-size="22"
          fill="#F5F0E8" fill-opacity="0.65">${esc(line)}</text>`,
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
    <rect width="${W}" height="${H}" fill="#1E1040"/>

    <!-- Green top bar -->
    <rect x="0" y="0" width="${W}" height="6" fill="#006633"/>

    <!-- Outer frame: gold 70% -->
    <rect x="16" y="16" width="${W - 32}" height="${H - 32}" rx="16"
          fill="none" stroke="#C9A84C" stroke-opacity="0.70" stroke-width="2"/>

    <!-- Inner frame: cream 20% -->
    <rect x="30" y="30" width="${W - 60}" height="${H - 60}" rx="10"
          fill="none" stroke="#F5F0E8" stroke-opacity="0.20" stroke-width="1.5"/>

    <!-- "PREDICTION" eyebrow -->
    <text x="${PAD}" y="100"
          font-family="Inter" font-weight="700" font-size="22"
          fill="#C9A84C" letter-spacing="6">${esc("PREDICTION")}</text>

    <!-- Tournament · Round -->
    <text x="${PAD}" y="136"
          font-family="Inter" font-weight="500" font-size="18"
          fill="#F5F0E8" fill-opacity="0.60" letter-spacing="3">${esc(`${tournament.toUpperCase()}  ·  ${round.toUpperCase()}`)}</text>

    <!-- Gold hairline -->
    <rect x="${PAD}" y="158" width="${CONTENT_W}" height="1"
          fill="#C9A84C" fill-opacity="0.50"/>

    <!-- Player 1 surname -->
    <text x="300" y="276" text-anchor="middle"
          font-family="Newsreader" font-weight="600" font-size="${sz1}"
          fill="#F5F0E8">${esc(player1.surname)}</text>

    <!-- Player 1 details -->
    <text x="300" y="316" text-anchor="middle"
          font-family="Inter" font-weight="500" font-size="16"
          fill="#F5F0E8" fill-opacity="0.50">${esc(det(player1))}</text>

    <!-- VS badge -->
    <rect x="${vsX}" y="${vsY}" width="${vsW}" height="${vsH}" rx="${vsRx}" fill="#006633"/>
    <text x="600" y="284" text-anchor="middle"
          font-family="Inter" font-weight="700" font-size="22"
          fill="#F5F0E8" letter-spacing="4">${esc("VS")}</text>

    <!-- Player 2 surname -->
    <text x="900" y="276" text-anchor="middle"
          font-family="Newsreader" font-weight="600" font-size="${sz2}"
          fill="#F5F0E8">${esc(player2.surname)}</text>

    <!-- Player 2 details -->
    <text x="900" y="316" text-anchor="middle"
          font-family="Inter" font-weight="500" font-size="16"
          fill="#F5F0E8" fill-opacity="0.50">${esc(det(player2))}</text>

    <!-- Pick zone separator -->
    <rect x="${PAD}" y="354" width="${CONTENT_W}" height="1"
          fill="#C9A84C" fill-opacity="0.30"/>

    <!-- "OUR PICK" label -->
    <text x="${PAD}" y="392"
          font-family="Inter" font-weight="700" font-size="14"
          fill="#C9A84C" letter-spacing="6">${esc("OUR PICK")}</text>

    <!-- Picked surname -->
    <text x="${PAD}" y="454"
          font-family="Newsreader" font-weight="600" font-size="${pickSz}"
          fill="#F5F0E8">${esc(pickSurname)}</text>

    <!-- Confidence (inline, gold) -->
    <text x="${confX}" y="454"
          font-family="Inter" font-weight="700" font-size="36"
          fill="#C9A84C">${esc(`${conf}%`)}</text>

    <!-- Take line (italic, up to 2 lines) -->
${takeSvg}

    <!-- Footer: ball icon (outer ring + green fill + seams) -->
    <circle cx="100" cy="576" r="20"
            fill="none" stroke="#C9A84C" stroke-opacity="0.70" stroke-width="1.5"/>
    <circle cx="100" cy="576" r="12" fill="#006633"/>
    <path d="M82,576 Q100,564 118,576"
          fill="none" stroke="#F5F0E8" stroke-width="1.3" stroke-opacity="0.55"/>
    <path d="M82,576 Q100,588 118,576"
          fill="none" stroke="#F5F0E8" stroke-width="1.3" stroke-opacity="0.55"/>

    <!-- Wordmark -->
    <text x="138" y="586"
          font-family="Newsreader" font-weight="600" font-size="28"
          fill="#F5F0E8">TennisMind</text>

  </g>
</svg>`;
}

export function renderWimbledonPredictionCard(data: WimbledonPredictionData): Buffer {
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

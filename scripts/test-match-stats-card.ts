/**
 * test-match-stats-card.ts — Renders 3 verification PNGs to /tmp.
 * Run: npx tsx scripts/test-match-stats-card.ts
 */

import { writeFileSync } from "fs";
import { renderMatchStatsCard, MatchStatsCardData } from "../lib/cards/matchStatsCard";

const cases: Array<{ label: string; out: string; data: MatchStatsCardData }> = [
  {
    label: "1 — Kostyuk def. Paolini 6-3, 6-2",
    out:   "/tmp/match-stats-1.png",
    data: {
      winner: { surname: "Kostyuk", fullName: "M. Kostyuk", country: "UKR" },
      loser:  { surname: "Paolini", fullName: "J. Paolini", country: "ITA" },
      score: "6-3  6-2",
      event: "WIMBLEDON 2026  ·  QF  ·  GRASS  ·  69 MIN",
      stats: [
        { label: "ACES",               winnerValue: "3",     loserValue: "0",     winnerLeads: true  },
        { label: "1ST SERVE IN",       winnerValue: "50%",   loserValue: "66%",   winnerLeads: false },
        { label: "1ST SERVE PTS WON",  winnerValue: "90%",   loserValue: "60%",   winnerLeads: true  },
        { label: "2ND SERVE PTS WON",  winnerValue: "67%",   loserValue: "41%",   winnerLeads: true  },
        { label: "BREAK POINTS",       winnerValue: "4 / 8", loserValue: "0 / 0", winnerLeads: true  },
        { label: "WINNERS",            winnerValue: "19",    loserValue: "8",     winnerLeads: true  },
        { label: "UNFORCED ERRORS",    winnerValue: "19",    loserValue: "27",    winnerLeads: true  },
        { label: "TOTAL POINTS WON",   winnerValue: "63",    loserValue: "44",    winnerLeads: true  },
      ],
      take: "Kostyuk won 90% behind her first serve. Paolini's 27 errors did as much damage as Kostyuk's 19 winners.",
    },
  },
  {
    label: "2 — Alexandrova def. Vondroušová 7-5, 6-3 (diacritics)",
    out:   "/tmp/match-stats-2.png",
    data: {
      winner: { surname: "Alexandrova",  fullName: "E. Alexandrova",  country: "KAZ" },
      loser:  { surname: "Vondroušová", fullName: "M. Vondroušová", country: "CZE" },
      score: "7-5  6-3",
      event: "WIMBLEDON 2026  ·  R3  ·  GRASS  ·  82 MIN",
      stats: [
        { label: "ACES",              winnerValue: "4",     loserValue: "2",     winnerLeads: true  },
        { label: "1ST SERVE IN",      winnerValue: "68%",   loserValue: "55%",   winnerLeads: true  },
        { label: "1ST SERVE PTS WON", winnerValue: "78%",   loserValue: "61%",   winnerLeads: true  },
        { label: "BREAK POINTS",      winnerValue: "3 / 7", loserValue: "1 / 5", winnerLeads: true  },
        { label: "WINNERS",           winnerValue: "22",    loserValue: "14",    winnerLeads: true  },
        { label: "UNFORCED ERRORS",   winnerValue: "18",    loserValue: "31",    winnerLeads: true  },
        { label: "TOTAL POINTS WON",  winnerValue: "74",    loserValue: "52",    winnerLeads: true  },
      ],
      take: "Alexandrova broke Vondroušová's serve three times and never faced a break point herself.",
    },
  },
  {
    label: "3 — Alcaraz def. Djokovic 7-6, 3-6, 6-4 (tight, loser-leads rows)",
    out:   "/tmp/match-stats-3.png",
    data: {
      winner: { surname: "Alcaraz",  fullName: "C. Alcaraz",  country: "ESP" },
      loser:  { surname: "Djokovic", fullName: "N. Djokovic", country: "SRB" },
      score: "7-6  3-6  6-4",
      event: "WIMBLEDON 2026  ·  SF  ·  GRASS  ·  2H 31MIN",
      stats: [
        { label: "ACES",              winnerValue: "11",    loserValue: "8",     winnerLeads: true  },
        { label: "1ST SERVE IN",      winnerValue: "65%",   loserValue: "70%",   winnerLeads: false },
        { label: "1ST SERVE PTS WON", winnerValue: "80%",   loserValue: "74%",   winnerLeads: true  },
        { label: "BREAK POINTS",      winnerValue: "2 / 5", loserValue: "1 / 4", winnerLeads: true  },
        { label: "WINNERS",           winnerValue: "38",    loserValue: "35",    winnerLeads: true  },
        { label: "UNFORCED ERRORS",   winnerValue: "22",    loserValue: "19",    winnerLeads: false },
        { label: "TOTAL POINTS WON",  winnerValue: "98",    loserValue: "94",    winnerLeads: true  },
      ],
      take: "Alcaraz saved the only break point he faced in the deciding set. Djokovic had none to save.",
    },
  },
  {
    label: "4 — Noskova def. Kostyuk 6-4, 6-4 (10-row with Winners + UEs)",
    out:   "/tmp/match-stats-4.png",
    data: {
      winner: { surname: "Noskova",  fullName: "L. Noskova",  country: "CZE" },
      loser:  { surname: "Kostyuk",  fullName: "M. Kostyuk",  country: "UKR" },
      score: "6-4  6-4",
      event: "WIMBLEDON 2026  ·  SF  ·  GRASS",
      stats: [
        { label: "ACES",                   winnerValue: "3",      loserValue: "3",     winnerLeads: true  },
        { label: "DOUBLE FAULTS",          winnerValue: "5",      loserValue: "4",     winnerLeads: false },
        { label: "WINNERS",                winnerValue: "6",      loserValue: "22",    winnerLeads: false },
        { label: "UNFORCED ERRORS",        winnerValue: "17",     loserValue: "22",    winnerLeads: true  },
        { label: "1ST SERVE IN",           winnerValue: "52.4%",  loserValue: "66.7%", winnerLeads: false },
        { label: "1ST SERVE PTS WON",      winnerValue: "63%",    loserValue: "51.2%", winnerLeads: true  },
        { label: "2ND SERVE PTS WON",      winnerValue: "44.9%",  loserValue: "58.1%", winnerLeads: false },
        { label: "BREAK POINTS FACED",     winnerValue: "14",     loserValue: "21",    winnerLeads: true  },
        { label: "BREAK POINTS CONVERTED", winnerValue: "33.3%",  loserValue: "50%",   winnerLeads: false },
        { label: "TOTAL POINTS WON",       winnerValue: "50%",    loserValue: "50%",   winnerLeads: true  },
      ],
      take: "Kostyuk hit 22 winners. Noskova hit 6. She won anyway — 21 break points against Kostyuk turned the serve into a liability.",
    },
  },
];

for (const { label, out, data } of cases) {
  try {
    const png = renderMatchStatsCard(data);
    writeFileSync(out, png);
    console.log(`✅ ${label}\n   → ${out}  (${(png.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    console.error(`❌ ${label}\n   ${e}`);
    process.exit(1);
  }
}

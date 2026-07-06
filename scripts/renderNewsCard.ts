/**
 * CLI wrapper for renderNewsCard — called from generate_feed.py via subprocess.
 * Reads JSON from stdin: { category, headline, dek, outPath, sourceUrl? }
 * Writes the PNG to outPath and exits 0 on success.
 *
 * Usage (from Python):
 *   subprocess.run(["npx","tsx","scripts/renderNewsCard.ts"], input=json_str, cwd=WEB_DIR)
 */

import * as fs from "fs";
import * as path from "path";
import { renderNewsCard } from "../lib/cards/newsCard";

// Controlled vocabulary for the eyebrow label.
// Never accept free-form agent output (surfaces, tags, topics).
const VALID_CATEGORIES = new Set([
  "NEWS", "ANALYSIS", "INSIGHT", "PREDICTION", "FEATURE", "OPINION",
]);

const raw = fs.readFileSync("/dev/stdin", "utf-8");
const { outPath, category: rawCategory, ...rest } = JSON.parse(raw) as {
  category?: string;
  headline: string;
  dek: string;
  outPath: string;
  sourceUrl?: string;
};

const upper = (rawCategory ?? "").toUpperCase().trim();
const category = VALID_CATEGORIES.has(upper) ? upper : "NEWS";
if (category !== upper && upper) {
  process.stderr.write(`[renderNewsCard] invalid category "${rawCategory}" → defaulting to "NEWS"\n`);
}

const buf = renderNewsCard({ category, ...rest });
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, buf);
process.exit(0);

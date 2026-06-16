/**
 * scripts/backfill-cards.ts
 *
 * Regenerates stored card PNGs that were rendered with an old version of
 * the template (pre latin-ext fonts, pre controlled-vocabulary eyebrow).
 * Also converts jpg-backed news cards to branded PNG tiles for consistency.
 *
 * Scope: type:"news" cards in content/feed/ — both existing .png tiles (font
 * fix) and .jpg photo cards (jpg→png conversion + frontmatter image_url update).
 * Other types (stat/history/gear → gpt-image-1; recap → broadcast tile;
 * prediction → collage/gpt-image-1) use separate renderers, out of scope.
 *
 * Usage:
 *   npx tsx scripts/backfill-cards.ts --dry-run   # write to /tmp, no overwrite
 *   npx tsx scripts/backfill-cards.ts              # overwrite/create public/feed/*.png
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const yaml = require("js-yaml") as typeof import("js-yaml");
import * as fs   from "fs";
import * as path from "path";
import { renderNewsCard } from "../lib/cards/newsCard";

// ── Config ───────────────────────────────────────────────────────────────────
const DRY_RUN  = process.argv.includes("--dry-run");
const FEED_MD  = path.resolve(process.cwd(), "content/feed");
const FEED_IMG = path.resolve(process.cwd(), "public/feed");
const DRY_DIR  = "/tmp/backfill-dry-run";

// ── Controlled vocab (mirrors _CARD_TYPE_CATEGORY in generate_feed.py) ───────
const VALID_CATEGORIES = new Set(["NEWS","ANALYSIS","INSIGHT","PREDICTION","FEATURE"]);

function categoryFor(cardType: string): string {
  const map: Record<string,string> = {
    news: "NEWS", recap: "NEWS", stat: "INSIGHT",
    form: "ANALYSIS", history: "FEATURE", gear: "FEATURE",
    prediction: "PREDICTION",
  };
  const c = map[cardType] ?? "NEWS";
  return VALID_CATEGORIES.has(c) ? c : "NEWS";
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseMd(filepath: string): { fm: Record<string,unknown>; body: string; raw: string } | null {
  const raw = fs.readFileSync(filepath, "utf-8");
  const parts = raw.split(/^---$/m);
  if (parts.length < 3) return null;
  try {
    const fm = yaml.load(parts[1]) as Record<string,unknown>;
    return { fm, body: parts.slice(2).join("---").trim(), raw };
  } catch {
    return null;
  }
}

function deriveDek(body: string): string {
  // Strip leading emoji
  const clean = body.replace(/^\p{Emoji_Presentation}\s*/u, "");
  const first = clean.split(/(?<=[.!?])\s/)[0] ?? clean;
  return first.length <= 110 ? first : first.slice(0, 107).trimEnd() + "…";
}

/** Rewrite image_url in the raw markdown string and save. */
function updateImageUrl(filepath: string, raw: string, newUrl: string): void {
  const updated = raw.replace(
    /^(image_url:\s*)"[^"]*"/m,
    `$1"${newUrl}"`,
  );
  fs.writeFileSync(filepath, updated, "utf-8");
}

// ── Main ─────────────────────────────────────────────────────────────────────
if (DRY_RUN) {
  fs.mkdirSync(DRY_DIR, { recursive: true });
  console.log(`[dry-run] outputs → ${DRY_DIR}\n`);
}

const files = fs.readdirSync(FEED_MD).filter(f => f.endsWith(".md"));

let processed = 0;
let skipped   = 0;

for (const fname of files) {
  const mdPath = path.join(FEED_MD, fname);
  const parsed = parseMd(mdPath);
  if (!parsed) { skipped++; continue; }

  const { fm, body, raw } = parsed;
  const cardType = String(fm.type ?? "");
  const imgUrl   = String(fm.image_url ?? "");

  if (cardType !== "news")          { skipped++; continue; }
  if (!imgUrl.startsWith("/feed/")) { skipped++; continue; }

  const isJpg = imgUrl.endsWith(".jpg") || imgUrl.endsWith(".jpeg");
  const isPng = imgUrl.endsWith(".png");
  if (!isPng && !isJpg)             { skipped++; continue; }

  const headline = String(fm.title ?? "");
  const dek      = fm.dek ? String(fm.dek) : deriveDek(body);
  const category = categoryFor(cardType);

  if (!headline) {
    console.warn(`  ⚠ ${fname} — missing title, skipping`);
    skipped++;
    continue;
  }

  // For jpg cards: use the md filename stem as the new png slug
  // For existing png cards: use the existing slug (keeps URLs stable)
  const slug = isPng
    ? path.basename(imgUrl, ".png")
    : fname.replace(/\.md$/, "");
  const newImgUrl = `/feed/${slug}.png`;

  const outPath = DRY_RUN
    ? path.join(DRY_DIR, `${slug}.png`)
    : path.join(FEED_IMG, `${slug}.png`);

  try {
    const buf = renderNewsCard({ category, headline, dek });
    fs.writeFileSync(outPath, buf);
    const kb = Math.round(buf.length / 1024);

    // Update frontmatter image_url if it changed (jpg→png)
    if (!DRY_RUN && newImgUrl !== imgUrl) {
      updateImageUrl(mdPath, raw, newImgUrl);
      console.log(`  ✓ [${category}] ${slug}  (${kb} KB)  image_url updated → ${newImgUrl}`);
    } else {
      console.log(`  ✓ [${category}] ${slug}  (${kb} KB)${DRY_RUN && newImgUrl !== imgUrl ? `  [would update image_url → ${newImgUrl}]` : ""}`);
    }
    processed++;
  } catch (e) {
    console.error(`  ✗ ${fname}: ${e}`);
    skipped++;
  }
}

console.log(`\n  Processed: ${processed}  Skipped: ${skipped}  Mode: ${DRY_RUN ? "DRY RUN (no files overwritten)" : "PRODUCTION"}`);

/**
 * render-match-stats-card.ts — CLI wrapper called by Python via subprocess.
 * Reads MatchStatsCardData + output_path from stdin (JSON), writes PNG.
 *
 * Usage (from match-analyst-bot):
 *   echo '<json>' | npx tsx scripts/render-match-stats-card.ts
 */

import { writeFileSync } from "fs";
import { renderMatchStatsCard, MatchStatsCardData } from "../lib/cards/matchStatsCard";

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf-8").trim();

  let input: MatchStatsCardData & { output_path: string };
  try {
    input = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`render-match-stats-card: invalid JSON: ${e}\n`);
    process.exit(1);
  }

  const { output_path, ...cardData } = input;
  if (!output_path) {
    process.stderr.write("render-match-stats-card: output_path is required\n");
    process.exit(1);
  }

  try {
    const png = renderMatchStatsCard(cardData);
    writeFileSync(output_path, png);
    process.stdout.write(`ok: ${output_path}\n`);
  } catch (e) {
    process.stderr.write(`render-match-stats-card: render failed: ${e}\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  process.stderr.write(`render-match-stats-card: ${e}\n`);
  process.exit(1);
});

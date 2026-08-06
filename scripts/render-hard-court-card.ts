/**
 * render-hard-court-card.ts — CLI renderer for hard court prediction cards.
 * Reads HardCourtPredictionData + output_path from stdin (JSON), writes PNG.
 */

import { writeFileSync } from "fs";
import { renderHardCourtPredictionCard, HardCourtPredictionData } from "../lib/cards/hardCourtPredictionCard";

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf-8").trim();

  let input: HardCourtPredictionData & { output_path: string };
  try {
    input = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`render-hard-court-card: invalid JSON input: ${e}\n`);
    process.exit(1);
  }

  const { output_path, ...cardData } = input;
  if (!output_path) {
    process.stderr.write("render-hard-court-card: output_path is required\n");
    process.exit(1);
  }

  if (cardData.player1.seed == null) delete cardData.player1.seed;
  if (cardData.player2.seed == null) delete cardData.player2.seed;

  try {
    const png = renderHardCourtPredictionCard(cardData);
    writeFileSync(output_path, png);
    process.stdout.write(`ok: ${output_path}\n`);
  } catch (e) {
    process.stderr.write(`render-hard-court-card: render failed: ${e}\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  process.stderr.write(`render-hard-court-card: ${e}\n`);
  process.exit(1);
});

/**
 * render-wimbledon-card.ts — CLI renderer called by Python via subprocess.
 * Reads WimbledonPredictionData + output_path from stdin (JSON), writes PNG.
 */

import { writeFileSync } from "fs";
import { renderWimbledonPredictionCard, WimbledonPredictionData } from "../lib/cards/wimbledonPredictionCard";

async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf-8").trim();

  let input: WimbledonPredictionData & { output_path: string };
  try {
    input = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`render-wimbledon-card: invalid JSON input: ${e}\n`);
    process.exit(1);
  }

  const { output_path, ...cardData } = input;
  if (!output_path) {
    process.stderr.write("render-wimbledon-card: output_path is required\n");
    process.exit(1);
  }

  // Strip null seeds (JSON null → undefined)
  if (cardData.player1.seed == null) delete cardData.player1.seed;
  if (cardData.player2.seed == null) delete cardData.player2.seed;

  try {
    const png = renderWimbledonPredictionCard(cardData);
    writeFileSync(output_path, png);
    process.stdout.write(`ok: ${output_path}\n`);
  } catch (e) {
    process.stderr.write(`render-wimbledon-card: render failed: ${e}\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  process.stderr.write(`render-wimbledon-card: ${e}\n`);
  process.exit(1);
});

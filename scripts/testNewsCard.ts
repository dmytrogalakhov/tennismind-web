/**
 * Writes 3 sample news cards to /tmp for visual review.
 * Run: npx tsx scripts/testNewsCard.ts
 */

import * as fs from "fs";
import * as path from "path";
import { renderNewsCard } from "../lib/cards/newsCard";

const SAMPLES = [
  {
    outFile: "newscard-sample-1.png",
    data: {
      category: "NEWS",
      headline: "Katie Boulter beats world No. 2 Aryna Sabalenka to reach the Queen's Club final",
      dek: "The British No. 1 lost just five games — the biggest win of her career.",
      sourceUrl: "https://tennismind.com",
    },
  },
  {
    outFile: "newscard-sample-2.png",
    data: {
      category: "NEWS",
      headline: "Nick Kyrgios confirms Wimbledon wildcard after two-year injury absence",
      dek: "The All England Club handed Kyrgios a main draw wildcard, ending two years of speculation.",
      sourceUrl: "https://tennismind.com",
    },
  },
  {
    outFile: "newscard-sample-3.png",
    data: {
      category: "GRASS",
      headline: "Dan Evans retires from professional tennis after 18 seasons",
      dek: "Evans, ranked as high as No. 21, called time after a first-round loss at Queen's Club.",
      sourceUrl: "https://tennismind.com",
    },
  },
  // Diacritic verification — all names must render without tofu boxes
  {
    outFile: "newscard-diacritics.png",
    data: {
      category: "GRASS",
      headline: "Krejčíková beats Świątek as Vondroušová, Muchová reach Wimbledon semis",
      dek: "Cerúndolo, Linette, and Žemlja also through — latin-ext glyphs confirmed.",
      sourceUrl: "https://tennismind.com",
    },
  },
];

for (const { outFile, data } of SAMPLES) {
  const outPath = path.join("/tmp", outFile);
  console.log(`Rendering ${outFile}…`);
  try {
    const buf = renderNewsCard(data);
    fs.writeFileSync(outPath, buf);
    const kb = Math.round(buf.length / 1024);
    console.log(`  ✓ ${outPath}  (${kb} KB)`);
  } catch (e) {
    console.error(`  ✗ Failed: ${e}`);
  }
}

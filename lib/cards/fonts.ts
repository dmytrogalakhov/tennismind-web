/**
 * Shared font utilities for card renderers.
 *
 * Each TTF is a merged latin + latin-ext subset so diacritics (č, š, ž, ě,
 * ř, ł, ą, ś, etc.) render without tofu boxes.  Pass FONT_FILES directly to
 * resvg font.fontFiles; keep loadSystemFonts: false.
 *
 * Adding a new card renderer: import FONT_FILES + loadCardFont from here.
 * Do NOT declare your own font paths — keeping this as the single source of
 * truth prevents the latin-vs-latin-ext split from drifting back.
 */

import * as fs from "fs";
import * as path from "path";
import * as opentype from "opentype.js";

const FONTS_DIR = path.resolve(process.cwd(), "assets/fonts");

function p(name: string): string {
  return path.join(FONTS_DIR, name);
}

export const FONT_PATHS = {
  newsreader600:       p("newsreader-600-merged.ttf"),
  newsreader600italic: p("newsreader-600-italic-merged.ttf"),
  inter500:            p("inter-500-merged.ttf"),
  inter700:            p("inter-700-merged.ttf"),
} as const;

/** All 4 merged TTF files — pass directly to resvg font.fontFiles. */
export const FONT_FILES: string[] = Object.values(FONT_PATHS);

/** Load a TTF as an opentype.Font for text measurement; returns null on error. */
export function loadCardFont(fontPath: string): opentype.Font | null {
  try {
    const buf = fs.readFileSync(fontPath);
    return opentype.parse(buf.buffer as ArrayBuffer);
  } catch {
    return null;
  }
}

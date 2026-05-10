import fs from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), ".cache", "translations.json");

type TranslationStore = Record<string, string>; // key: "de::original text"

function read(): TranslationStore {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as TranslationStore;
  } catch {
    return {};
  }
}

function write(store: TranslationStore): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("Translation cache write error:", err);
  }
}

export function getCachedTranslation(lang: string, text: string): string | null {
  return read()[`${lang}::${text}`] ?? null;
}

export function setCachedTranslation(lang: string, text: string, translated: string): void {
  const store = read();
  store[`${lang}::${text}`] = translated;
  write(store);
}

import fs from "fs";
import path from "path";
import type { RecommendationResult } from "@/app/api/racket-recommendation/route";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_FILE = path.join(process.cwd(), ".cache", "racket-recommendations.json");

type CacheEntry = { result: RecommendationResult; timestamp: number };
type CacheStore = Record<string, CacheEntry>;

function cacheKey(answers: Record<string, string>): string {
  const sorted: Record<string, string> = {};
  for (const k of Object.keys(answers).sort()) sorted[k] = answers[k];
  return JSON.stringify(sorted);
}

function read(): CacheStore {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as CacheStore;
  } catch {
    return {};
  }
}

function write(store: CacheStore): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("Racket cache write error:", err);
  }
}

export function getCached(answers: Record<string, string>): RecommendationResult | null {
  const entry = read()[cacheKey(answers)];
  if (!entry || Date.now() - entry.timestamp > CACHE_TTL_MS) return null;
  return entry.result;
}

export function setCached(answers: Record<string, string>, result: RecommendationResult): void {
  const store = read();
  const now = Date.now();
  // Prune expired entries on every write to keep the file small
  for (const k of Object.keys(store)) {
    if (now - store[k].timestamp > CACHE_TTL_MS) delete store[k];
  }
  store[cacheKey(answers)] = { result, timestamp: now };
  write(store);
}

import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type FeedCardType = "stat" | "gear" | "form" | "history" | "upset" | "news" | "recap" | "prediction" | "video" | "match-analysis";

export type PredictionOutcome = "correct" | "incorrect" | "void";

export type FeedCard = {
  slug: string;
  type: FeedCardType;
  title: string;
  date: string;
  publishedAt?: string;
  tags: string[];
  source?: string;
  keyNumber?: string;
  imageUrl?: string;
  priority?: "high";
  body: string;
  // prediction-specific fields
  predictionWinner?: string;
  confidence?: number;
  outcome?: PredictionOutcome;
  actualWinner?: string;
  player1?: string;
  player2?: string;
};

const feedDir = path.join(process.cwd(), "content/feed");

export function getAllFeedCards(): FeedCard[] {
  if (!fs.existsSync(feedDir)) return [];

  return fs
    .readdirSync(feedDir)
    .filter((f) => f.endsWith(".md"))
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(feedDir, filename), "utf8");
      const { data, content } = matter(raw);
      return {
        slug,
        type: (data.type ?? "stat") as FeedCardType,
        title: data.title ?? "",
        date: data.date ?? "",
        publishedAt: data.published_at ?? undefined,
        tags: data.tags ?? [],
        source: data.source ?? undefined,
        keyNumber: data.keyNumber ?? undefined,
        imageUrl: data.image_url ?? undefined,
        priority: data.priority === "high" ? "high" : undefined,
        body: content.trim(),
        predictionWinner: data.prediction_winner ?? undefined,
        confidence: typeof data.confidence === "number" ? data.confidence : undefined,
        outcome: data.outcome ?? undefined,
        actualWinner: data.actual_winner ?? undefined,
        player1: data.player1 ?? undefined,
        player2: data.player2 ?? undefined,
      } satisfies FeedCard;
    })
    .sort((a, b) => {
      // Sort by published_at (full datetime) when available, fall back to date
      const aKey = a.publishedAt ?? a.date;
      const bKey = b.publishedAt ?? b.date;
      const cmp = bKey.localeCompare(aKey);
      if (cmp !== 0) return cmp;
      // Same sort key: high priority first
      if (a.priority === "high" && b.priority !== "high") return -1;
      if (b.priority === "high" && a.priority !== "high") return 1;
      return 0;
    });
}

import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type FeedCardType = "stat" | "gear" | "form" | "history" | "upset";

export type FeedCard = {
  slug: string;
  type: FeedCardType;
  title: string;
  date: string;
  tags: string[];
  source?: string;
  body: string;
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
        tags: data.tags ?? [],
        source: data.source ?? undefined,
        body: content.trim(),
      } satisfies FeedCard;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

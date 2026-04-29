import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type KeyStat = { label: string; value: string };

export type Analysis = {
  slug: string;
  title: string;
  tournament: string;
  round: string;
  surface: string;
  date: string;
  score: string;
  tags: string[];
  readTime: string;
  summary: string;
  keyStats: KeyStat[];
  insight: string;
  body: string;
};

const analysesDir = path.join(process.cwd(), "content/analyses");

export function getAllAnalyses(): Analysis[] {
  const files = fs
    .readdirSync(analysesDir)
    .filter((f) => f.endsWith(".md"));

  return files
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(analysesDir, filename), "utf8");
      const { data, content } = matter(raw);

      return {
        slug,
        title: data.title ?? "",
        tournament: data.tournament ?? "",
        round: data.round ?? "",
        surface: data.surface ?? "",
        date: data.date ?? "",
        score: data.score ?? "",
        tags: data.tags ?? [],
        readTime: data.readTime ?? "5 min",
        summary: data.summary ?? "",
        keyStats: data.keyStats ?? [],
        insight: data.insight ?? "",
        body: content.trim(),
      } satisfies Analysis;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[m - 1]} ${d}, ${y}`;
}

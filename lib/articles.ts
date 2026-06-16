import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type ArticleCategory = "ANALYSIS" | "FEATURE" | "INSIGHT" | "OPINION";

export type Article = {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  tournament?: string;
  tags: string[];
  category: ArticleCategory;
  readTime: string;
  substack_url?: string;
  body: string;
};

function deriveCategory(explicit: unknown, tags: string[]): ArticleCategory {
  const known: ArticleCategory[] = ["ANALYSIS", "FEATURE", "INSIGHT", "OPINION"];
  if (typeof explicit === "string") {
    const up = explicit.toUpperCase() as ArticleCategory;
    if (known.includes(up)) return up;
  }
  const lc = tags.map((t) => t.toLowerCase());
  if (lc.includes("analysis")) return "ANALYSIS";
  if (lc.includes("feature"))  return "FEATURE";
  if (lc.includes("insight"))  return "INSIGHT";
  if (lc.includes("opinion"))  return "OPINION";
  return "ANALYSIS";
}

const articlesDir = path.join(process.cwd(), "content/articles");

export function getAllArticles(): Article[] {
  if (!fs.existsSync(articlesDir)) return [];
  return fs
    .readdirSync(articlesDir)
    .filter((f) => f.endsWith(".md"))
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(articlesDir, filename), "utf8");
      const { data, content } = matter(raw);
      const tags: string[] = data.tags ?? [];
      return {
        slug,
        title: data.title ?? "",
        subtitle: data.subtitle ?? "",
        date: data.date ?? "",
        tournament: data.tournament ?? undefined,
        tags,
        category: deriveCategory(data.category, tags),
        readTime: data.readTime ?? "",
        substack_url: data.substack_url ?? undefined,
        body: content.trim(),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getArticleBySlug(slug: string): Article | null {
  return getAllArticles().find((a) => a.slug === slug) ?? null;
}

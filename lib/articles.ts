import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type Article = {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  tournament?: string;
  tags: string[];
  readTime: string;
  substack_url?: string;
  body: string;
};

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
      return {
        slug,
        title: data.title ?? "",
        subtitle: data.subtitle ?? "",
        date: data.date ?? "",
        tournament: data.tournament ?? undefined,
        tags: data.tags ?? [],
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

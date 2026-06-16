import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import { getAllArticles } from "@/lib/articles";
import ArticleCard from "@/app/components/ArticleCard";

export default async function ArticlesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const articles = getAllArticles();

  return (
    <div className="flex-1">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Articles</h1>
          <p className="font-sans text-muted">Long-form tennis writing. One match, one story, one argument.</p>
        </div>

        <div className="flex flex-col gap-7">
          {articles.map((article, i) => (
            <ArticleCard key={article.slug} article={article} first={i === 0} />
          ))}
          {articles.length === 0 && (
            <p className="font-sans text-muted text-sm">No articles yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

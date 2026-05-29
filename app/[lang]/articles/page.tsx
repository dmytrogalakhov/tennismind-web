import Link from "next/link";
import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import { getAllArticles } from "@/lib/articles";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

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
      <div className="max-w-[680px] mx-auto px-4 py-16">
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Articles</h1>
          <p className="text-white/60">Long-form tennis writing. One match, one story, one argument.</p>
        </div>

        <div className="flex flex-col divide-y divide-white/8">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/${lang}/articles/${article.slug}`}
              className="group py-8 block hover:bg-white/[0.02] -mx-4 px-4 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3 mb-3 text-xs text-white/35">
                <span>{formatDate(article.date)}</span>
                {article.readTime && (
                  <>
                    <span>·</span>
                    <span>{article.readTime} read</span>
                  </>
                )}
                {article.tournament && (
                  <>
                    <span>·</span>
                    <span>{article.tournament}</span>
                  </>
                )}
              </div>
              <h2 className="text-xl font-bold text-white mb-2 group-hover:text-accent transition-colors leading-snug">
                {article.title}
              </h2>
              <p className="text-white/55 leading-relaxed text-sm" style={{ lineHeight: 1.7 }}>
                {article.subtitle}
              </p>
              {article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-white/30 bg-white/5 px-2.5 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
          {articles.length === 0 && (
            <p className="text-white/40 text-sm py-8">No articles yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

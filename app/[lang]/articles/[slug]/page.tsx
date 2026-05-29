import Link from "next/link";
import { hasLocale } from "../../dictionaries";
import { notFound } from "next/navigation";
import { getAllArticles, getArticleBySlug } from "@/lib/articles";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export async function generateStaticParams() {
  const articles = getAllArticles();
  const locales = ["en", "de", "uk"];
  return locales.flatMap((lang) =>
    articles.map((a) => ({ lang, slug: a.slug }))
  );
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();

  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const paragraphs = article.body.split(/\n\n+/).filter(Boolean);

  return (
    <div className="flex-1">
      <div className="max-w-[680px] mx-auto px-4 py-12">

        <Link
          href={`/${lang}/articles`}
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mb-10"
        >
          ← Back to Articles
        </Link>

        {/* Header */}
        <header className="mb-10 text-center">
          <h1
            className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-5"
          >
            {article.title}
          </h1>
          <p
            className="text-lg italic leading-relaxed mb-5"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            {article.subtitle}
          </p>
          <div className="flex items-center justify-center gap-3 text-xs text-white/30">
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
        </header>

        {/* Divider */}
        <div className="border-t border-white/10 mb-10" />

        {/* Body */}
        <article>
          {paragraphs.map((para, i) => (
            <p
              key={i}
              style={{
                fontSize: 18,
                lineHeight: 1.8,
                color: "rgba(255,255,255,0.82)",
                marginBottom: 24,
              }}
            >
              {para.replace(/\n/g, " ")}
            </p>
          ))}
        </article>

        {/* Divider */}
        <div className="border-t border-white/10 mt-8 mb-8" />

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {article.substack_url && (
            <a
              href={article.substack_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Originally published on Substack ↗
            </a>
          )}
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
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
        </div>

      </div>
    </div>
  );
}

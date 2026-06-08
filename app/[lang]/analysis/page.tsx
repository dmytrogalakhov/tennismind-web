import { getAllAnalyses, formatDate } from "@/lib/analyses";
import AnalysisBody from "@/app/components/AnalysisBody";
import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";

const surfaceStyle: Record<string, string> = {
  Grass:          "text-green bg-green/10 border-green/20",
  Hard:           "text-clay bg-clay/10 border-clay/20",
  Clay:           "text-clay bg-clay/10 border-clay/20",
  "Hard (Indoor)":"text-muted bg-sand border-line",
};

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.analysis;
  const analyses = getAllAnalyses();

  return (
    <div className="flex-1 py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{t.title}</h1>
          <p className="font-sans text-muted text-lg max-w-2xl">{t.subtitle}</p>
        </div>

        <div className="space-y-6">
          {analyses.map((post) => (
            <article
              id={post.slug}
              key={post.slug}
              className="bg-bisque border border-line rounded-card p-6 sm:p-8 hover:border-clay/25 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="font-sans text-xs bg-sand text-muted px-2.5 py-1 rounded-full font-medium border border-line">
                  {post.tournament}
                </span>
                {post.round && (
                  <span className="font-sans text-xs text-muted border border-line px-2.5 py-1 rounded-full">
                    {post.round}
                  </span>
                )}
                <span
                  className={`font-sans text-xs font-medium px-2.5 py-1 rounded-full border ${
                    surfaceStyle[post.surface] ?? "text-muted bg-sand border-line"
                  }`}
                >
                  {post.surface}
                </span>
                <span className="font-sans text-xs text-muted">
                  {formatDate(post.date)}
                </span>
                <span className="font-sans text-xs text-muted">·</span>
                <span className="font-sans text-xs text-muted">{post.readTime} read</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-semibold mb-2 leading-snug">
                {post.title}
              </h2>

              {post.summary && (
                <p className="font-sans text-sm text-muted leading-relaxed mb-5">
                  {post.summary}
                </p>
              )}

              {post.keyStats.length > 0 && post.keyStats.some((s) => s.value) && (
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {post.keyStats
                    .filter((s) => s.value)
                    .map((stat) => (
                      <div
                        key={stat.label}
                        className="bg-sand border border-line rounded-xl px-3 py-3 text-center"
                      >
                        <div className="font-serif text-lg font-bold text-clay">
                          {stat.value}
                        </div>
                        <div className="font-sans text-xs text-muted mt-0.5 leading-tight">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {post.insight && (
                <div className="bg-sand border border-line rounded-xl px-4 py-3">
                  <p className="font-sans text-xs text-green font-semibold uppercase tracking-widest mb-1">
                    {t.key_insight}
                  </p>
                  <p className="font-serif text-sm text-ink/85 leading-relaxed">
                    {post.insight}
                  </p>
                </div>
              )}

              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-sans text-xs text-green bg-sand border border-line px-2.5 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <AnalysisBody
                body={post.body}
                title={post.title}
                slug={post.slug}
                t={{
                  read_full: t.read_full,
                  hide: t.hide,
                  share_telegram: t.share_telegram,
                  share_whatsapp: t.share_whatsapp,
                }}
              />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

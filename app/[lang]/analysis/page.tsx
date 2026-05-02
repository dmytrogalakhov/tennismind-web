import { getAllAnalyses, formatDate } from "@/lib/analyses";
import AnalysisBody from "@/app/components/AnalysisBody";
import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";

const surfaceColor: Record<string, string> = {
  Grass: "text-emerald-400 bg-emerald-400/10",
  Hard: "text-blue-400 bg-blue-400/10",
  Clay: "text-orange-400 bg-orange-400/10",
  "Hard (Indoor)": "text-sky-400 bg-sky-400/10",
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
    <div className="flex-1 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{t.title}</h1>
          <p className="text-white/60 text-lg max-w-2xl">{t.subtitle}</p>
        </div>

        <div className="space-y-6">
          {analyses.map((post) => (
            <article
              id={post.slug}
              key={post.slug}
              className="bg-accent/[0.06] border border-accent/15 rounded-2xl p-6 sm:p-8 hover:border-accent/25 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs bg-accent/10 text-white/60 px-2.5 py-1 rounded-full font-medium">
                  {post.tournament}
                </span>
                {post.round && (
                  <span className="text-xs text-white/30 border border-accent/10 px-2.5 py-1 rounded-full">
                    {post.round}
                  </span>
                )}
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    surfaceColor[post.surface] ?? "text-white/60 bg-white/10"
                  }`}
                >
                  {post.surface}
                </span>
                <span className="text-xs text-white/30">
                  {formatDate(post.date)}
                </span>
                <span className="text-xs text-white/30">·</span>
                <span className="text-xs text-white/30">{post.readTime} read</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-semibold mb-2 leading-snug">
                {post.title}
              </h2>

              {post.summary && (
                <p className="text-sm text-white/60 leading-relaxed mb-5">
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
                        className="bg-accent/10 border border-accent/15 rounded-xl px-3 py-3 text-center"
                      >
                        <div className="text-lg font-bold text-accent">
                          {stat.value}
                        </div>
                        <div className="text-xs text-white/45 mt-0.5 leading-tight">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {post.insight && (
                <div className="bg-accent/5 border border-accent/10 rounded-xl px-4 py-3">
                  <p className="text-xs text-accent font-semibold uppercase tracking-widest mb-1">
                    {t.key_insight}
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed">
                    {post.insight}
                  </p>
                </div>
              )}

              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-white/30 border border-accent/15 px-2.5 py-1 rounded-full"
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

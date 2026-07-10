import Link from "next/link";
import Button from "@/app/components/Button";
import { getAllFeedCards } from "@/lib/feed";
import { getAllArticles } from "@/lib/articles";
import { getDictionary, hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(iso: string): string {
  const datePart = iso.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.home;

  const allFeedCards = getAllFeedCards();
  const newsCards    = allFeedCards.filter((c) => c.type === "news").slice(0, 3);
  const insightsCount = allFeedCards.filter((c) => !["news", "recap", "prediction", "video", "match-analysis"].includes(c.type)).length;
  const newsCount     = allFeedCards.filter((c) => c.type === "news").length;
  const articlesCount = getAllArticles().length;

  const stats = [
    { value: String(newsCount),     label: t.stats_news_published },
    { value: String(insightsCount), label: t.stats_insights_published },
    { value: String(articlesCount), label: t.stats_articles_published },
  ];

  const features = [
    { icon: "📰", title: t.f6_title, desc: t.f6_desc, href: `/${lang}/news`,           cta: t.f6_cta, badge: null          },
    { icon: "✍️", title: t.f8_title, desc: t.f8_desc, href: `/${lang}/articles`,       cta: t.f8_cta, badge: null          },
    { icon: "📊", title: t.f1_title, desc: t.f1_desc, href: `/${lang}/match-analysis`, cta: t.f1_cta, badge: null          },
    { icon: "📡", title: t.f7_title, desc: t.f7_desc, href: `/${lang}/feed`,           cta: t.f7_cta, badge: null          },
    { icon: "🎾", title: t.f3_title, desc: t.f3_desc, href: `/${lang}/racket-finder`,  cta: t.f3_cta, badge: null          },
    { icon: "🪢", title: t.f9_title, desc: t.f9_desc, href: `/${lang}/stringing`,      cta: t.f9_cta, badge: null          },
    { icon: "🎸", title: t.f4_title, desc: t.f4_desc, href: `/${lang}/string-finder`,  cta: t.f4_cta, badge: t.coming_soon },
    { icon: "🔧", title: t.f5_title, desc: t.f5_desc, href: `/${lang}/customize`,      cta: t.f5_cta, badge: t.coming_soon },
  ];

  return (
    <div className="flex-1">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="py-28 sm:py-36 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight mb-6">
            {t.hero_headline_1}
            <br />
            <span className="text-clay">{t.hero_headline_2}</span>
          </h1>
          <p className="font-sans text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            {t.hero_subline}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" href={`/${lang}/racket-finder`}>
              {t.hero_cta_racket}
            </Button>
            <Button variant="secondary" href={`/${lang}/stringing`}>
              {t.hero_cta_analysis}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="border-y border-line bg-bisque py-12 px-4">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="font-serif text-3xl sm:text-4xl font-bold text-clay">
                {stat.value}
              </div>
              <div className="font-sans text-xs sm:text-sm text-muted mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            {t.features_heading}
          </h2>
          <p className="font-sans text-muted text-center mb-16 max-w-xl mx-auto">
            {t.features_sub}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-bisque border border-line rounded-card p-6 hover:border-clay/30 transition-colors group flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{f.icon}</span>
                  {f.badge && (
                    <span className="font-sans text-xs font-medium text-green border border-line bg-sand px-2 py-0.5 rounded-full">
                      {f.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="font-sans text-muted text-sm leading-relaxed flex-1">{f.desc}</p>
                <Link
                  href={f.href}
                  className="font-sans text-clay text-sm font-medium group-hover:underline mt-6"
                >
                  {f.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Latest News ──────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-bisque border-t border-line">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">{t.latest_title}</h2>
            <Link
              href={`/${lang}/news`}
              className="font-sans text-clay text-sm font-medium hover:underline"
            >
              {t.latest_view_all}
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsCards.map((card) => (
              <article
                key={card.slug}
                className="bg-sand border border-line rounded-card p-6 hover:border-clay/25 transition-colors"
              >
                <p className="font-sans text-xs text-muted mb-3">{formatDate(card.date)}</p>
                <h3 className="font-serif font-semibold text-base mb-2 leading-snug">{card.title}</h3>
                <p className="font-sans text-sm text-muted leading-relaxed line-clamp-3">{card.body}</p>
              </article>
            ))}
            {newsCards.length === 0 && (
              <p className="font-sans text-muted text-sm">No news yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.cta_heading}</h2>
          <p className="font-sans text-muted mb-8">{t.cta_desc}</p>
          <Link
            href={`/${lang}/racket-finder`}
            className="font-sans inline-block bg-green text-sand font-semibold px-10 py-4 rounded-full hover:bg-green-deep transition-colors text-lg"
          >
            {t.cta_button}
          </Link>
        </div>
      </section>

    </div>
  );
}

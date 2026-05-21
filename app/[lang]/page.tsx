import Link from "next/link";
import { getAllFeedCards } from "@/lib/feed";
import { getDictionary, hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
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
  const newsCards = allFeedCards.filter((c) => c.type === "news").slice(0, 3);
  const insightsCount = allFeedCards.filter((c) => c.type !== "news").length;
  const newsCount = allFeedCards.filter((c) => c.type === "news").length;

  const stats = [
    { value: String(newsCount), label: t.stats_news_published },
    { value: String(insightsCount), label: t.stats_insights_published },
    { value: "10+", label: t.stats_rackets_recommended },
  ];

  const features = [
    { icon: "📰", title: t.f6_title, desc: t.f6_desc, href: `/${lang}/news`,         cta: t.f6_cta, badge: null          },
    { icon: "📡", title: t.f7_title, desc: t.f7_desc, href: `/${lang}/feed`,         cta: t.f7_cta, badge: null          },
    { icon: "🎾", title: t.f3_title, desc: t.f3_desc, href: `/${lang}/racket-finder`, cta: t.f3_cta, badge: null          },
    { icon: "🎸", title: t.f4_title, desc: t.f4_desc, href: `/${lang}/string-finder`, cta: t.f4_cta, badge: t.coming_soon },
    { icon: "🔧", title: t.f5_title, desc: t.f5_desc, href: `/${lang}/customize`,    cta: t.f5_cta, badge: t.coming_soon },
    { icon: "📊", title: t.f1_title, desc: t.f1_desc, href: `/${lang}/analysis`,     cta: t.f1_cta, badge: null          },
  ];

  return (
    <div className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden py-28 sm:py-36 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(191,90,242,0.18)_0%,_rgba(0,229,255,0.04)_55%,_transparent_80%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight mb-6">
            {t.hero_headline_1}
            <br />
            <span className="text-accent">{t.hero_headline_2}</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t.hero_subline}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${lang}/racket-finder`}
              className="bg-accent text-white font-semibold px-8 py-3.5 rounded-full hover:bg-[#a84ad9] transition-colors"
            >
              {t.hero_cta_racket}
            </Link>
            <Link
              href={`/${lang}/feed`}
              className="border border-cyan/40 text-cyan font-semibold px-8 py-3.5 rounded-full hover:bg-cyan/10 transition-colors"
            >
              {t.hero_cta_analysis}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-accent/10 bg-[#06000e] py-12 px-4">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl sm:text-4xl font-bold text-accent">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-white/45 mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            {t.features_heading}
          </h2>
          <p className="text-white/60 text-center mb-16 max-w-xl mx-auto">
            {t.features_sub}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-accent/[0.06] border border-accent/15 rounded-2xl p-6 hover:border-accent/30 transition-colors group flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{f.icon}</span>
                  {f.badge && (
                    <span className="text-xs font-medium text-cyan border border-cyan/30 bg-cyan/10 px-2 py-0.5 rounded-full">
                      {f.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed flex-1">{f.desc}</p>
                <Link
                  href={f.href}
                  className="text-accent text-sm font-medium group-hover:underline mt-6"
                >
                  {f.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section className="py-24 px-4 bg-[#06000e] border-t border-accent/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">{t.latest_title}</h2>
            <Link
              href={`/${lang}/news`}
              className="text-accent text-sm font-medium hover:underline"
            >
              {t.latest_view_all}
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsCards.map((card) => (
              <article
                key={card.slug}
                className="bg-accent/[0.06] border border-accent/15 rounded-2xl p-6 hover:border-accent/25 transition-colors"
              >
                <p className="text-xs text-white/30 mb-3">{formatDate(card.date)}</p>
                <h3 className="font-semibold text-base mb-2 leading-snug">{card.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed line-clamp-3">{card.body}</p>
              </article>
            ))}
            {newsCards.length === 0 && (
              <p className="text-white/40 text-sm">No news yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t.cta_heading}</h2>
          <p className="text-white/60 mb-8">{t.cta_desc}</p>
          <Link
            href={`/${lang}/racket-finder`}
            className="inline-block bg-accent text-white font-semibold px-10 py-4 rounded-full hover:bg-[#a84ad9] transition-colors text-lg"
          >
            {t.cta_button}
          </Link>
        </div>
      </section>
    </div>
  );
}

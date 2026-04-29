import Link from "next/link";
import { getAllAnalyses, formatDate } from "@/lib/analyses";

const stats = [
  { value: "500+", label: "Match Analyses" },
  { value: "94%", label: "Prediction Accuracy" },
  { value: "200+", label: "Rackets Compared" },
];

const features = [
  {
    icon: "📊",
    title: "Match Analysis",
    desc: "Why matches were decided the way they were. The turning points, patterns, and stats that tell the real story.",
    href: "/analysis",
    cta: "Read Analyses",
  },
  {
    icon: "🏆",
    title: "Tournament Predictions",
    desc: "Who wins and why. H2H data, form analysis, and surface records — before the first ball is hit.",
    href: "/predictions",
    cta: "See Predictions",
  },
  {
    icon: "🎾",
    title: "Racket Finder",
    desc: "7 questions. 30 seconds. A personalized racket recommendation matched to your game, level, and budget.",
    href: "/racket-finder",
    cta: "Find Your Racket",
  },
];

const surfaceColor: Record<string, string> = {
  Grass: "text-emerald-400",
  Hard: "text-blue-400",
  Clay: "text-orange-400",
};

export default function HomePage() {
  const recentAnalyses = getAllAnalyses().slice(0, 2);

  return (
    <div className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden py-28 sm:py-36 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,_rgba(191,90,242,0.18)_0%,_rgba(0,229,255,0.04)_55%,_transparent_80%)]" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight mb-6">
            Everything tennis.
            <br />
            <span className="text-accent">One place.</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Understand the sport we love on a deeper level. Improve your own
            play with the right tactics and gear. TennisMind is built for
            people who don&apos;t just watch tennis — they live it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/racket-finder"
              className="bg-accent text-white font-semibold px-8 py-3.5 rounded-full hover:bg-[#a84ad9] transition-colors"
            >
              Find Your Racket
            </Link>
            <Link
              href="/predictions"
              className="border border-cyan/40 text-cyan font-semibold px-8 py-3.5 rounded-full hover:bg-cyan/10 transition-colors"
            >
              View Predictions
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
            Built for tennis lovers, by tennis lovers
          </h2>
          <p className="text-white/60 text-center mb-16 max-w-xl mx-auto">
            The tools that make the difference.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-accent/[0.06] border border-accent/15 rounded-2xl p-6 hover:border-accent/30 transition-colors group"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-white/60 text-sm mb-6 leading-relaxed">
                  {f.desc}
                </p>
                <Link
                  href={f.href}
                  className="text-accent text-sm font-medium group-hover:underline"
                >
                  {f.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest analyses preview */}
      <section className="py-24 px-4 bg-[#06000e] border-t border-accent/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Latest Analysis</h2>
            <Link
              href="/analysis"
              className="text-accent text-sm font-medium hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentAnalyses.map((post) => (
              <article
                key={post.title}
                className="bg-accent/[0.06] border border-accent/15 rounded-2xl p-6 hover:border-accent/25 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs bg-accent/10 text-white/60 px-2.5 py-1 rounded-full">
                    {post.tournament}
                  </span>
                  <span
                    className={`text-xs font-medium ${surfaceColor[post.surface] ?? "text-white/60"}`}
                  >
                    {post.surface}
                  </span>
                  <span className="text-xs text-white/30">{formatDate(post.date)}</span>
                </div>
                <h3 className="font-semibold text-base mb-2 leading-snug">
                  {post.title}
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  {post.summary}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to find your perfect racket?
          </h2>
          <p className="text-white/60 mb-8">
            Take our 7-question quiz and get a personalized recommendation in under a minute.
          </p>
          <Link
            href="/racket-finder"
            className="inline-block bg-accent text-white font-semibold px-10 py-4 rounded-full hover:bg-[#a84ad9] transition-colors text-lg"
          >
            Start the Quiz →
          </Link>
        </div>
      </section>
    </div>
  );
}

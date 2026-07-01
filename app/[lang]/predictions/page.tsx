import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import { getAllFeedCards } from "@/lib/feed";
import NewsCard from "@/app/components/NewsCard";

type Contender = {
  player: string;
  flag: string;
  probability: number;
  odds: string;
  trend: "up" | "down" | "neutral";
};

type Tournament = {
  name: string;
  surface: string;
  surfaceStyle: string;
  category: string;
  dates: string;
  location: string;
  status: "live" | "upcoming" | "completed";
  contenders: Contender[];
  darkHorse: { player: string; flag: string; note: string };
  insight: string;
};

const tournaments: Tournament[] = [
  {
    name: "Roland Garros 2026",
    surface: "Clay",
    surfaceStyle: "text-clay bg-clay/10 border-clay/20",
    category: "Grand Slam",
    dates: "May 24 – Jun 7, 2026",
    location: "Paris, France",
    status: "upcoming",
    contenders: [
      { player: "Jannik Sinner",   flag: "🇮🇹", probability: 34, odds: "+190",  trend: "up"      },
      { player: "Carlos Alcaraz",  flag: "🇪🇸", probability: 26, odds: "+260",  trend: "neutral" },
      { player: "Novak Djokovic",  flag: "🇷🇸", probability: 18, odds: "+450",  trend: "neutral" },
      { player: "Casper Ruud",     flag: "🇳🇴", probability: 12, odds: "+750",  trend: "down"    },
      { player: "Holger Rune",     flag: "🇩🇰", probability: 10, odds: "+950",  trend: "up"      },
    ],
    darkHorse: {
      player: "Stefanos Tsitsipas",
      flag: "🇬🇷",
      note: "Clay specialist with a revamped serve and renewed focus after a strong Monte Carlo run.",
    },
    insight:
      "Sinner enters as the model's top pick after a dominant clay swing — consistent deep runs at Monte Carlo and Madrid, with baseline movement that has been the best on tour this spring. Alcaraz remains dangerous but his clay form has been less decisive than in prior seasons, and our model now gives Sinner the edge in five-set clay endurance.",
  },
  {
    name: "Wimbledon 2026",
    surface: "Grass",
    surfaceStyle: "text-green bg-green/10 border-green/20",
    category: "Grand Slam",
    dates: "Jun 29 – Jul 12, 2026",
    location: "London, UK",
    status: "upcoming",
    contenders: [
      { player: "Carlos Alcaraz",  flag: "🇪🇸", probability: 35, odds: "+180",  trend: "up"      },
      { player: "Novak Djokovic",  flag: "🇷🇸", probability: 22, odds: "+350",  trend: "up"      },
      { player: "Jannik Sinner",   flag: "🇮🇹", probability: 15, odds: "+550",  trend: "neutral" },
      { player: "Taylor Fritz",    flag: "🇺🇸", probability:  9, odds: "+900",  trend: "up"      },
      { player: "Tommy Paul",      flag: "🇺🇸", probability:  7, odds: "+1200", trend: "up"      },
    ],
    darkHorse: {
      player: "Lorenzo Musetti",
      flag: "🇮🇹",
      note: "His serve-and-volley instincts and slice backhand are tailor-made for grass. Has reached a Wimbledon semifinal before.",
    },
    insight:
      "Alcaraz's serve has become a genuine weapon on fast grass, and his net game is second to none. Djokovic's grass-court record makes him a permanent threat, but his physical durability is the main question mark.",
  },
  {
    name: "US Open 2026",
    surface: "Hard",
    surfaceStyle: "text-muted bg-sand border-line",
    category: "Grand Slam",
    dates: "Aug 31 – Sep 13, 2026",
    location: "New York, USA",
    status: "upcoming",
    contenders: [
      { player: "Jannik Sinner",   flag: "🇮🇹", probability: 30, odds: "+240",  trend: "up"      },
      { player: "Carlos Alcaraz",  flag: "🇪🇸", probability: 26, odds: "+280",  trend: "neutral" },
      { player: "Daniil Medvedev", flag: "🇷🇺", probability: 14, odds: "+580",  trend: "up"      },
      { player: "Novak Djokovic",  flag: "🇷🇸", probability: 12, odds: "+700",  trend: "neutral" },
      { player: "Alex Zverev",     flag: "🇩🇪", probability: 10, odds: "+850",  trend: "up"      },
    ],
    darkHorse: {
      player: "Ben Shelton",
      flag: "🇺🇸",
      note: "Playing on his home slam with a monster serve and crowd energy that's hard to quantify. Could go very deep.",
    },
    insight:
      "Sinner's hard-court dominance in 2025 gives him a clear edge heading into Flushing Meadows. Medvedev is a perennial US Open danger, and Zverev's improved fitness makes him more dangerous than his ranking suggests.",
  },
  {
    name: "ATP Finals 2026",
    surface: "Hard (Indoor)",
    surfaceStyle: "text-muted bg-sand border-line",
    category: "ATP Finals",
    dates: "Nov 8 – Nov 15, 2026",
    location: "Turin, Italy",
    status: "upcoming",
    contenders: [
      { player: "Jannik Sinner",   flag: "🇮🇹", probability: 28, odds: "+280",  trend: "up"      },
      { player: "Carlos Alcaraz",  flag: "🇪🇸", probability: 22, odds: "+360",  trend: "neutral" },
      { player: "Alex Zverev",     flag: "🇩🇪", probability: 18, odds: "+450",  trend: "up"      },
      { player: "Daniil Medvedev", flag: "🇷🇺", probability: 14, odds: "+580",  trend: "neutral" },
      { player: "Taylor Fritz",    flag: "🇺🇸", probability:  9, odds: "+950",  trend: "up"      },
    ],
    darkHorse: {
      player: "Hubert Hurkacz",
      flag: "🇵🇱",
      note: "His serve and indoor game are elite. Has previously won this title and the conditions suit him perfectly.",
    },
    insight:
      "Sinner playing in his home country gives him an intangible advantage, and his indoor hard court record is exceptional. Zverev consistently peaks for this event and is the most dangerous threat to Sinner's title defense.",
  },
];

const trendIcon  = { up: "↑", down: "↓", neutral: "→" };
const trendStyle = { up: "text-green", down: "text-clay", neutral: "text-muted" };

export default async function PredictionsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.predictions;

  const matchPredictions = getAllFeedCards().filter((c) => c.type === "prediction");

  // Accuracy stats derived from resolved predictions
  const resolved = matchPredictions.filter((c) => c.outcome && c.outcome !== "void");
  const correct  = resolved.filter((c) => c.outcome === "correct").length;
  const accuracy = resolved.length > 0 ? Math.round((correct / resolved.length) * 100) : null;

  const outcomeLabel: Record<string, string> = {
    correct:   "Correct",
    incorrect: "Incorrect",
    void:      "Void",
  };
  const outcomeBadge: Record<string, string> = {
    correct:   "bg-green/10 text-green border-green/20",
    incorrect: "bg-clay/10 text-clay border-clay/20",
    void:      "bg-sand text-muted border-line",
  };

  const statusBadge = {
    live:      "bg-clay/10 text-clay border-clay/20",
    upcoming:  "bg-green/10 text-green border-green/20",
    completed: "bg-sand text-muted border-line",
  };

  const statusLabel = {
    live:      t.status_live,
    upcoming:  t.status_upcoming,
    completed: t.status_completed,
  };

  return (
    <div className="flex-1 py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{t.title}</h1>
          <p className="font-sans text-muted text-lg max-w-2xl">{t.subtitle}</p>
        </div>

        <div className="mb-10 bg-bisque border border-line rounded-card px-6 py-4 flex flex-wrap items-center gap-6 max-w-2xl">
          <div>
            <p className="font-sans text-xs text-muted uppercase tracking-widest mb-1">Our record</p>
            {accuracy !== null ? (
              <p className="font-bold text-2xl">
                {correct}/{resolved.length}
                <span className="font-sans text-muted text-base font-normal ml-2">({accuracy}%)</span>
              </p>
            ) : (
              <p className="font-bold text-2xl text-muted">—</p>
            )}
          </div>
          <div className="h-8 w-px bg-line hidden sm:block" />
          <p className="font-sans text-sm text-muted">
            {resolved.length > 0
              ? `Based on ${resolved.length} resolved prediction${resolved.length !== 1 ? "s" : ""}`
              : "Results tracked after each match day"}
          </p>
        </div>

        {matchPredictions.length > 0 && (
          <div className="mb-14">
            <h2 className="text-2xl font-bold mb-6">Match Predictions</h2>
            <div className="flex flex-col gap-6 max-w-2xl">
              {matchPredictions.map((card) => (
                <div key={card.slug} className="relative">
                  {card.outcome && (
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`font-sans text-xs font-medium px-2.5 py-1 rounded-full border ${outcomeBadge[card.outcome]}`}
                      >
                        {card.outcome === "correct" ? "✓ " : card.outcome === "incorrect" ? "✗ " : ""}
                        {outcomeLabel[card.outcome]}
                      </span>
                      {card.outcome === "incorrect" && card.actualWinner && (
                        <span className="font-sans text-xs text-muted">{card.actualWinner} won</span>
                      )}
                    </div>
                  )}
                  <NewsCard
                    type={card.type}
                    title={card.title}
                    body={card.body}
                    tags={card.tags}
                    date={card.date}
                    keyNumber={card.keyNumber}
                    imageUrl={card.imageUrl}
                    lang={lang}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-2xl font-bold mb-6">Tournament Predictions</h2>
        <div className="space-y-8">
          {tournaments.map((tournament) => (
            <div
              key={tournament.name}
              className="bg-bisque border border-line rounded-card overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 sm:px-8 py-5 border-b border-line flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-sans text-xs font-medium px-2.5 py-1 rounded-full border ${statusBadge[tournament.status]}`}
                    >
                      {statusLabel[tournament.status]}
                    </span>
                    <span className="font-sans text-xs text-muted">{tournament.category}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold">{tournament.name}</h2>
                  <p className="font-sans text-sm text-muted mt-0.5">
                    {tournament.dates} · {tournament.location}
                  </p>
                </div>
                <span
                  className={`font-sans text-sm font-semibold px-3 py-1.5 rounded-xl border ${tournament.surfaceStyle}`}
                >
                  {tournament.surface}
                </span>
              </div>

              <div className="px-6 sm:px-8 py-6">
                {/* Probability label */}
                <p className="font-sans text-xs text-muted uppercase tracking-widest mb-4">
                  {t.win_probability}
                </p>

                {/* Contenders */}
                <div className="space-y-3 mb-6">
                  {tournament.contenders.map((c, i) => (
                    <div key={c.player} className="flex items-center gap-3">
                      <span className="font-sans text-xs text-muted w-4 text-right shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm shrink-0">{c.flag}</span>
                      <span className="font-sans text-sm font-medium w-36 shrink-0 truncate">
                        {c.player}
                      </span>
                      <div className="flex-1 bg-sand border border-line rounded-full h-1.5 min-w-0">
                        <div
                          className="bg-clay h-1.5 rounded-full transition-all"
                          style={{ width: `${c.probability}%` }}
                        />
                      </div>
                      <span className="font-sans text-sm font-semibold text-clay w-9 text-right shrink-0">
                        {c.probability}%
                      </span>
                      <span
                        className={`font-sans text-xs font-bold w-4 text-right shrink-0 ${trendStyle[c.trend]}`}
                      >
                        {trendIcon[c.trend]}
                      </span>
                      <span className="font-sans text-xs text-muted w-14 text-right shrink-0 hidden sm:block">
                        {c.odds}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Dark horse */}
                <div className="bg-sand border border-line rounded-xl px-4 py-4 mb-4">
                  <p className="font-sans text-xs text-muted uppercase tracking-widest mb-2">
                    {t.dark_horse}
                  </p>
                  <div className="flex items-start gap-2">
                    <span className="text-base">{tournament.darkHorse.flag}</span>
                    <div>
                      <span className="font-serif font-semibold text-ink">
                        {tournament.darkHorse.player}
                      </span>
                      <p className="font-sans text-sm text-muted mt-0.5 leading-relaxed">
                        {tournament.darkHorse.note}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Our take */}
                <div className="bg-sand border border-line rounded-xl px-4 py-3">
                  <p className="font-sans text-xs text-green font-semibold uppercase tracking-widest mb-1">
                    {t.our_take}
                  </p>
                  <p className="font-serif text-sm text-ink/85 leading-relaxed">
                    {tournament.insight}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="font-sans text-xs text-muted text-center mt-12">{t.disclaimer}</p>
      </div>
    </div>
  );
}

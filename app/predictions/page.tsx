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
  surfaceColor: string;
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
    surfaceColor: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    category: "Grand Slam",
    dates: "May 24 – Jun 7, 2026",
    location: "Paris, France",
    status: "upcoming",
    contenders: [
      { player: "Carlos Alcaraz", flag: "🇪🇸", probability: 32, odds: "+210", trend: "up" },
      { player: "Jannik Sinner", flag: "🇮🇹", probability: 24, odds: "+310", trend: "up" },
      { player: "Novak Djokovic", flag: "🇷🇸", probability: 18, odds: "+450", trend: "neutral" },
      { player: "Casper Ruud", flag: "🇳🇴", probability: 10, odds: "+800", trend: "down" },
      { player: "Holger Rune", flag: "🇩🇰", probability: 8, odds: "+1000", trend: "up" },
    ],
    darkHorse: {
      player: "Stefanos Tsitsipas",
      flag: "🇬🇷",
      note: "Clay specialist with a revamped serve and renewed focus after a strong Monte Carlo run.",
    },
    insight:
      "Alcaraz entered as clear favorite after his Barcelona triumph, but Sinner's clay form has been quietly exceptional. Our model gives Alcaraz the edge due to his superior net approach rate on slow clay.",
  },
  {
    name: "Wimbledon 2026",
    surface: "Grass",
    surfaceColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    category: "Grand Slam",
    dates: "Jun 29 – Jul 12, 2026",
    location: "London, UK",
    status: "upcoming",
    contenders: [
      { player: "Carlos Alcaraz", flag: "🇪🇸", probability: 35, odds: "+180", trend: "up" },
      { player: "Novak Djokovic", flag: "🇷🇸", probability: 22, odds: "+350", trend: "up" },
      { player: "Jannik Sinner", flag: "🇮🇹", probability: 15, odds: "+550", trend: "neutral" },
      { player: "Taylor Fritz", flag: "🇺🇸", probability: 9, odds: "+900", trend: "up" },
      { player: "Tommy Paul", flag: "🇺🇸", probability: 7, odds: "+1200", trend: "up" },
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
    surfaceColor: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    category: "Grand Slam",
    dates: "Aug 31 – Sep 13, 2026",
    location: "New York, USA",
    status: "upcoming",
    contenders: [
      { player: "Jannik Sinner", flag: "🇮🇹", probability: 30, odds: "+240", trend: "up" },
      { player: "Carlos Alcaraz", flag: "🇪🇸", probability: 26, odds: "+280", trend: "neutral" },
      { player: "Daniil Medvedev", flag: "🇷🇺", probability: 14, odds: "+580", trend: "up" },
      { player: "Novak Djokovic", flag: "🇷🇸", probability: 12, odds: "+700", trend: "neutral" },
      { player: "Alex Zverev", flag: "🇩🇪", probability: 10, odds: "+850", trend: "up" },
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
    surfaceColor: "text-sky-400 bg-sky-400/10 border-sky-400/20",
    category: "ATP Finals",
    dates: "Nov 8 – Nov 15, 2026",
    location: "Turin, Italy",
    status: "upcoming",
    contenders: [
      { player: "Jannik Sinner", flag: "🇮🇹", probability: 28, odds: "+280", trend: "up" },
      { player: "Carlos Alcaraz", flag: "🇪🇸", probability: 22, odds: "+360", trend: "neutral" },
      { player: "Alex Zverev", flag: "🇩🇪", probability: 18, odds: "+450", trend: "up" },
      { player: "Daniil Medvedev", flag: "🇷🇺", probability: 14, odds: "+580", trend: "neutral" },
      { player: "Taylor Fritz", flag: "🇺🇸", probability: 9, odds: "+950", trend: "up" },
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

const trendIcon = {
  up: "↑",
  down: "↓",
  neutral: "→",
};

const trendColor = {
  up: "text-cyan",
  down: "text-pink",
  neutral: "text-white/30",
};

const statusBadge = {
  live: "bg-pink/10 text-pink border-pink/20",
  upcoming: "bg-cyan/10 text-cyan border-cyan/20",
  completed: "bg-white/5 text-white/30 border-white/10",
};

const statusLabel = {
  live: "● Live",
  upcoming: "Upcoming",
  completed: "Completed",
};

export default function PredictionsPage() {
  return (
    <div className="flex-1 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Tournament Predictions
          </h1>
          <p className="text-white/60 text-lg max-w-2xl">
            Data-backed win probability forecasts for major ATP and WTA tournaments. Updated after every significant result.
          </p>
        </div>

        {/* Tournament cards */}
        <div className="space-y-8">
          {tournaments.map((t) => (
            <div
              key={t.name}
              className="bg-accent/[0.06] border border-accent/15 rounded-2xl overflow-hidden"
            >
              {/* Card header */}
              <div className="px-6 sm:px-8 py-5 border-b border-accent/15 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusBadge[t.status]}`}
                    >
                      {statusLabel[t.status]}
                    </span>
                    <span className="text-xs text-white/30">{t.category}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold">{t.name}</h2>
                  <p className="text-sm text-white/45 mt-0.5">
                    {t.dates} · {t.location}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold px-3 py-1.5 rounded-xl border ${t.surfaceColor}`}
                >
                  {t.surface}
                </span>
              </div>

              <div className="px-6 sm:px-8 py-6">
                {/* Win probabilities */}
                <p className="text-xs text-white/45 uppercase tracking-widest mb-4">
                  Win Probability
                </p>
                <div className="space-y-3 mb-6">
                  {t.contenders.map((c, i) => (
                    <div key={c.player} className="flex items-center gap-3">
                      <span className="text-xs text-white/30 w-4 text-right shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm shrink-0">{c.flag}</span>
                      <span className="text-sm font-medium w-36 shrink-0 truncate">
                        {c.player}
                      </span>
                      <div className="flex-1 bg-accent/10 rounded-full h-1.5 min-w-0">
                        <div
                          className="bg-accent h-1.5 rounded-full transition-all"
                          style={{ width: `${c.probability}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-accent w-9 text-right shrink-0">
                        {c.probability}%
                      </span>
                      <span
                        className={`text-xs font-bold w-4 text-right shrink-0 ${trendColor[c.trend]}`}
                      >
                        {trendIcon[c.trend]}
                      </span>
                      <span className="text-xs text-white/30 w-14 text-right shrink-0 hidden sm:block">
                        {c.odds}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Dark horse */}
                <div className="bg-accent/10 border border-accent/15 rounded-xl px-4 py-4 mb-4">
                  <p className="text-xs text-white/45 uppercase tracking-widest mb-2">
                    Dark Horse Pick
                  </p>
                  <div className="flex items-start gap-2">
                    <span className="text-base">{t.darkHorse.flag}</span>
                    <div>
                      <span className="font-semibold text-white">
                        {t.darkHorse.player}
                      </span>
                      <p className="text-sm text-white/60 mt-0.5 leading-relaxed">
                        {t.darkHorse.note}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Insight */}
                <div className="bg-accent/5 border border-accent/10 rounded-xl px-4 py-3">
                  <p className="text-xs text-accent font-semibold uppercase tracking-widest mb-1">
                    Our Take
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed">
                    {t.insight}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-white/30 text-center mt-12">
          Probabilities are model-generated estimates based on recent form, head-to-head records, and surface statistics. Not financial or betting advice.
        </p>
      </div>
    </div>
  );
}

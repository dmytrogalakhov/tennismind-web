import { getAllFeedCards } from "@/lib/feed";
import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import Image from "next/image";

function extractInterpretation(body: string): string | null {
  const match = body.match(/\*\*What the numbers say:\*\*\s*\n([\s\S]*?)(?:\n\n|\*Source|$)/);
  return match ? match[1].trim() : null;
}

function extractScore(body: string): string | null {
  const match = body.match(/##\s+.+?def\..+?([\d–\-,\s]+)\s*$/m);
  return match ? match[1].trim() : null;
}

export default async function MatchAnalysisPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const cards = getAllFeedCards()
    .filter((c) => c.type === "match-analysis")
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex-1 py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Match Analysis</h1>
          <p className="font-sans text-muted text-lg max-w-2xl">
            Stats-based breakdowns of key matches — what the numbers actually say about who won and why.
          </p>
        </div>

        {cards.length === 0 ? (
          <p className="font-sans text-muted">No match analyses published yet.</p>
        ) : (
          <div className="flex flex-col gap-10">
            {cards.map((card) => {
              const tournament = card.tags.find((t) =>
                !["match analysis", "match-analysis"].includes(t.toLowerCase())
              );
              const round = card.tags.find((t) =>
                ["final", "semifinal", "quarterfinal", "third round", "second round", "first round", "sf", "qf", "f", "r1", "r2", "r3", "r4"].includes(t.toLowerCase())
              );

              const interpretation = extractInterpretation(card.body);

              return (
                <article key={card.slug} className="bg-bisque border border-line rounded-card overflow-hidden">
                  {card.imageUrl && (
                    <Image
                      src={card.imageUrl}
                      alt={card.title}
                      width={1536}
                      height={896}
                      className="w-full h-auto"
                      priority
                    />
                  )}

                  <div className="px-6 sm:px-8 py-6">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {tournament && (
                        <span className="font-sans text-xs bg-green/10 text-green border border-green/20 px-2.5 py-1 rounded-full font-medium">
                          {tournament}
                        </span>
                      )}
                      {round && (
                        <span className="font-sans text-xs text-muted border border-line px-2.5 py-1 rounded-full">
                          {round}
                        </span>
                      )}
                      <span className="font-sans text-xs text-muted">
                        {new Date(card.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-semibold mb-4 leading-snug">
                      {card.title}
                    </h2>

                    {interpretation && (
                      <div className="bg-sand border border-line rounded-xl px-4 py-3">
                        <p className="font-sans text-xs text-green font-semibold uppercase tracking-widest mb-1">
                          What the numbers say
                        </p>
                        <p className="font-serif text-sm text-ink/85 leading-relaxed">
                          {interpretation}
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

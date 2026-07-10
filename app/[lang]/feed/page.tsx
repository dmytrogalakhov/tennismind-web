import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import { getAllFeedCards } from "@/lib/feed";
import InsightCard from "@/app/components/InsightCard";

export default async function FeedPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  await getDictionary(lang);

  const cards = getAllFeedCards().filter(
    (c) => c.type !== "news" && c.type !== "recap" && c.type !== "prediction" && c.type !== "video" && c.type !== "match-analysis"
  );

  return (
    <div className="flex-1">
      <div className="max-w-2xl mx-auto px-6 py-16">

        <div style={{ marginBottom: "3rem" }}>
          <h1
            style={{
              fontFamily: "var(--font-serif), Georgia, serif",
              fontSize: "clamp(1.875rem, 4vw, 2.5rem)",
              fontWeight: 700,
              color: "var(--color-green)",
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
              margin: "0 0 0.75rem",
            }}
          >
            Tennis Insights
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans), system-ui, sans-serif",
              fontSize: 16,
              color: "var(--color-muted)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            The stats, patterns, and stories that make you understand tennis on a deeper level.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {cards.map((card) => (
            <InsightCard
              key={card.slug}
              type={card.type}
              title={card.title}
              body={card.body}
              tags={card.tags}
              date={card.date}
              keyNumber={card.keyNumber}
              imageUrl={card.imageUrl}
              lang={lang}
            />
          ))}
          {cards.length === 0 && (
            <p style={{ fontFamily: "var(--font-sans), system-ui, sans-serif", fontSize: 14, color: "var(--color-muted)" }}>
              No posts yet.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

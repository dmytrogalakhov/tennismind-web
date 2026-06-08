import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import { getAllFeedCards } from "@/lib/feed";
import NewsCard from "@/app/components/NewsCard";

export default async function NewsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  await getDictionary(lang);

  const cards = getAllFeedCards().filter((c) => c.type === "news" || c.type === "recap");

  return (
    <div className="flex-1">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Tennis News</h1>
          <p className="font-sans text-muted">Stay on top of what's happening on tour without spending hours following it yourself.</p>
        </div>

        <div className="flex flex-col gap-6">
          {cards.map((card) => (
            <NewsCard
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
            <p className="font-sans text-muted text-sm">No news yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import { getAllFeedCards, type FeedCard, type FeedCardType } from "@/lib/feed";
import { formatDate } from "@/lib/analyses";

export default async function FeedPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  await getDictionary(lang);

  const cards = getAllFeedCards();

  return (
    <div className="flex-1">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Tennis Feed</h1>
          <p className="text-white/60">Stats, gear notes, form, history, and upsets — one insight at a time.</p>
        </div>

        <div className="flex flex-col gap-4">
          {cards.map((card) => (
            <FeedCardComponent key={card.slug} card={card} />
          ))}
          {cards.length === 0 && (
            <p className="text-white/40 text-sm">No posts yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const TYPE_CONFIG: Record<FeedCardType, { icon: string; label: string; border: string; badge: string }> = {
  stat:    { icon: "📊", label: "Stat",    border: "border-purple-400/20", badge: "bg-purple-400/10 text-purple-400 border-purple-400/20" },
  gear:    { icon: "🏸", label: "Gear",    border: "border-cyan-400/20",   badge: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20" },
  form:    { icon: "📈", label: "Form",    border: "border-green-400/20",  badge: "bg-green-400/10 text-green-400 border-green-400/20" },
  history: { icon: "📅", label: "History", border: "border-amber-400/20",  badge: "bg-amber-400/10 text-amber-400 border-amber-400/20" },
  upset:   { icon: "⚡", label: "Upset",   border: "border-pink-400/20",   badge: "bg-pink-400/10 text-pink-400 border-pink-400/20" },
};

function FeedCardComponent({ card }: { card: FeedCard }) {
  const cfg = TYPE_CONFIG[card.type] ?? TYPE_CONFIG.stat;

  return (
    <article className={`bg-white/[0.03] border ${cfg.border} rounded-2xl p-5 hover:bg-white/[0.05] transition-colors`}>
      {/* Type badge + date */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
          <span>{cfg.icon}</span>
          {cfg.label}
        </span>
        <time className="text-xs text-white/35">{formatDate(card.date)}</time>
      </div>

      {/* Title */}
      <h2 className="text-base font-semibold text-white leading-snug mb-2">
        {card.title}
      </h2>

      {/* Body */}
      <p className="text-sm text-white/65 leading-relaxed">
        {card.body}
      </p>

      {/* Tags + source */}
      <div className="flex items-center justify-between mt-4 gap-4">
        {card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] text-white/40 bg-white/[0.04] border border-white/8 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {card.source && (
          <span className="text-[11px] text-white/30 italic shrink-0 ml-auto">
            {card.source}
          </span>
        )}
      </div>
    </article>
  );
}

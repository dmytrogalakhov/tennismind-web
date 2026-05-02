import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import BackButton from "./BackButton";

export default async function BuyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.buy;

  return (
    <div className="flex-1 py-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="text-5xl mb-6">🛒</div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">{t.title}</h1>
        <p className="text-white/60 leading-relaxed mb-10 max-w-md mx-auto">{t.desc}</p>

        <div className="flex flex-col items-center gap-4">
          <a
            href="https://t.me/tennismind_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-accent text-white font-semibold px-8 py-3 rounded-full hover:bg-[#a84ad9] transition-colors"
          >
            {t.telegram_cta}
          </a>
          <BackButton label={t.back} />
        </div>
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../../../dictionaries";
import { RACKET_DATABASE } from "@/lib/racket-database";
import type { RecommendationResult } from "@/app/api/racket-recommendation/route";
import RacketFinderClient from "../../RacketFinderClient";

function toSlug(name: string): string {
  return name
    .replace(/ \d{4}$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default async function RacketTestPage({
  params,
}: {
  params: Promise<{ lang: string; racketName: string }>;
}) {
  const { lang, racketName } = await params;
  if (!hasLocale(lang)) notFound();

  const entry = RACKET_DATABASE.find((r) => toSlug(r.name) === racketName);
  if (!entry) notFound();

  const dict = await getDictionary(lang);

  const preloadedResult: RecommendationResult = {
    name: entry.name,
    brand: entry.brand,
    category: entry.category,
    price_range_eur: entry.price_range_eur,
    specs: {
      head_size_sq_in: entry.head_size_sq_in,
      weight_g: entry.weight_g,
      balance_mm: entry.balance_mm,
      stiffness_ra: entry.stiffness_ra,
      string_pattern: entry.string_pattern,
    },
    why: entry.ideal_profile,
    strengths: entry.strengths.split(". ").filter(Boolean).slice(0, 4),
    watch_out: entry.health_warning || entry.weaknesses.split(".")[0] + ".",
    runner_up: entry.similar_alternatives[0] ?? "",
    recommended_string: { ...entry.recommended_string },
    ...(entry.image_url ? { image_url: entry.image_url } : {}),
  };

  return (
    <RacketFinderClient
      lang={lang}
      t={dict.racket_finder}
      apiErrorT={dict.api_error}
      preloadedResult={preloadedResult}
    />
  );
}

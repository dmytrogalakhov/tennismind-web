import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import RacketFinderClient from "./RacketFinderClient";

export default async function RacketFinderPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <RacketFinderClient
      lang={lang}
      t={dict.racket_finder}
      apiErrorT={dict.api_error}
    />
  );
}

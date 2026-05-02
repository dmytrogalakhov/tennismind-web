import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import StringFinderClient from "./StringFinderClient";

export default async function StringFinderPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ racket?: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const sp = await searchParams;
  const racketParam = sp.racket ? decodeURIComponent(sp.racket) : null;

  return (
    <StringFinderClient
      racketParam={racketParam}
      lang={lang}
      t={dict.string_finder}
    />
  );
}

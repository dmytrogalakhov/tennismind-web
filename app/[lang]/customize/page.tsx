import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import { RACKET_DATABASE } from "@/lib/racket-database";
import CustomizeClient from "./CustomizeClient";

export default async function CustomizePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const racketNames = RACKET_DATABASE.map((r) => r.name);

  return (
    <CustomizeClient
      lang={lang}
      t={dict.customize}
      racketNames={racketNames}
    />
  );
}

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "@/app/globals.css";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { getDictionary, hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TennisMind — Everything About Tennis. In One Place.",
  description:
    "Daily insights, match analysis, and personalized gear recommendations",
  openGraph: {
    title: "TennisMind — Everything About Tennis. In One Place.",
    description:
      "Daily insights, match analysis, and personalized gear recommendations",
    siteName: "TennisMind",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TennisMind — Everything About Tennis. In One Place.",
    description:
      "Daily insights, match analysis, and personalized gear recommendations",
  },
};

export async function generateStaticParams() {
  return [{ lang: "en" }, { lang: "de" }, { lang: "uk" }];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <html lang={lang} className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0a0015] text-white">
        <Navbar lang={lang} navDict={dict.nav} />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer lang={lang} dict={dict.footer} navDict={dict.nav} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Newsreader, Inter } from "next/font/google";
import "./globals.css";

// Serif — headlines & article body. Italic included for subheads / pull-quotes.
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-newsreader",
});

// Sans — nav, labels, metadata, UI chrome.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TennisMind",
  description: "Tennis, read closely — analysis, match writing, and a daily briefing.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
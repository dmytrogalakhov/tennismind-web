"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavDict = {
  home: string;
  match_analyses: string;
  racket_finder: string;
  string_finder: string;
  predictions: string;
};

type Props = {
  lang: string;
  navDict: NavDict;
};

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "de", label: "DE" },
  { code: "uk", label: "UA" },
];

export default function Navbar({ lang, navDict }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: `/${lang}`, label: navDict.home },
    { href: `/${lang}/analysis`, label: navDict.match_analyses },
    { href: `/${lang}/racket-finder`, label: navDict.racket_finder },
    { href: `/${lang}/string-finder`, label: navDict.string_finder },
    { href: `/${lang}/predictions`, label: navDict.predictions },
  ];

  function switchLocale(newLang: string) {
    return `/${newLang}${pathname.slice(1 + lang.length) || "/"}`;
  }

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0015]/90 backdrop-blur-md border-b border-accent/15">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link href={`/${lang}`} className="flex items-center gap-1.5 shrink-0">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-white">Tennis</span>
            <span className="text-accent">Mind</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-accent"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-1 ml-6">
          {LOCALES.map(({ code, label }) => (
            <Link
              key={code}
              href={switchLocale(code)}
              className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                lang === code
                  ? "text-accent bg-accent/10"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <button
          className="md:hidden text-white/60 hover:text-white transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#0d0020] border-b border-accent/15 px-4 py-4 flex flex-col gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-accent"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 pt-2 border-t border-accent/10">
            {LOCALES.map(({ code, label }) => (
              <Link
                key={code}
                href={switchLocale(code)}
                onClick={() => setOpen(false)}
                className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                  lang === code
                    ? "text-accent bg-accent/10"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

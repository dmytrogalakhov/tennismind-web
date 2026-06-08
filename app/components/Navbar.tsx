"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

type NavDict = {
  home: string;
  news: string;
  articles: string;
  tools: string;
  match_analyses: string;
  racket_finder: string;
  string_finder: string;
  predictions: string;
  customize: string;
  feed: string;
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const mainLinks = [
    { href: `/${lang}/news`,        label: navDict.news },
    { href: `/${lang}/feed`,        label: navDict.feed },
    { href: `/${lang}/articles`,    label: navDict.articles },
    { href: `/${lang}/analysis`,    label: navDict.match_analyses },
    { href: `/${lang}/predictions`, label: navDict.predictions },
  ];

  const toolLinks = [
    { href: `/${lang}/racket-finder`, label: navDict.racket_finder },
    { href: `/${lang}/string-finder`, label: navDict.string_finder },
    { href: `/${lang}/customize`,     label: navDict.customize },
  ];

  const isToolActive = toolLinks.some((l) => pathname === l.href);

  function switchLocale(newLang: string) {
    return `/${newLang}${pathname.slice(1 + lang.length) || "/"}`;
  }

  // Resting: sand. Active / hover: clay.
  const linkClass = (href: string) =>
    `text-sm font-medium transition-colors ${
      pathname === href ? "text-clay" : "text-sand/80 hover:text-clay"
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-green/95 backdrop-blur-sm border-b border-green-deep">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center h-16 gap-6">

        {/* Logo — reversed lockup on desktop, reversed icon on mobile */}
        <Link href={`/${lang}`} className="shrink-0 mr-2 flex items-center">
          {/* Desktop: cream lockup (reads on green) */}
          <Image
            src="/logo/tennismind-lockup-reversed.svg"
            alt="TennisMind"
            width={177}
            height={38}
            className="hidden md:block"
            priority
          />
          {/* Mobile: cream-ring icon (green disc would vanish on green nav) */}
          <Image
            src="/logo/tennismind-icon-reversed.svg"
            alt="TennisMind"
            width={36}
            height={36}
            className="md:hidden"
            priority
          />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-5 flex-1">
          {mainLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}

          {/* Tools dropdown */}
          <div ref={toolsRef} className="relative">
            <button
              onClick={() => setToolsOpen((v) => !v)}
              className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                isToolActive ? "text-clay" : "text-sand/80 hover:text-clay"
              }`}
            >
              {navDict.tools}
              <svg
                width="10" height="10" viewBox="0 0 10 10"
                fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-150 ${toolsOpen ? "rotate-180" : ""}`}
              >
                <path d="M2 3.5l3 3 3-3" />
              </svg>
            </button>

            {toolsOpen && (
              <div className="absolute top-full left-0 mt-2 bg-green-deep border border-sand/10 rounded-xl shadow-2xl shadow-black/30 py-1.5 min-w-[200px]">
                {toolLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setToolsOpen(false)}
                    className={`block px-4 py-2.5 text-sm transition-colors ${
                      pathname === link.href
                        ? "text-clay bg-white/10"
                        : "text-sand/70 hover:text-clay hover:bg-white/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Language selectors — far right */}
        <div className="hidden md:flex items-center gap-1 ml-auto">
          {LOCALES.map(({ code, label }) => (
            <Link
              key={code}
              href={switchLocale(code)}
              className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                lang === code
                  ? "text-clay bg-white/10"
                  : "text-sand/45 hover:text-sand/80"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-sand/70 hover:text-sand transition-colors ml-auto"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
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

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-green-deep border-b border-green px-4 py-4 flex flex-col gap-1">
          {[...mainLinks, ...toolLinks].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`text-sm font-medium px-2 py-2.5 rounded-lg transition-colors ${
                pathname === link.href
                  ? "text-clay bg-white/10"
                  : "text-sand/70 hover:text-clay hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 pt-3 mt-1 border-t border-white/10">
            {LOCALES.map(({ code, label }) => (
              <Link
                key={code}
                href={switchLocale(code)}
                onClick={() => setMobileOpen(false)}
                className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                  lang === code
                    ? "text-clay bg-white/10"
                    : "text-sand/45 hover:text-sand/80"
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

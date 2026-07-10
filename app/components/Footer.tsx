import Link from "next/link";

type FooterDict = {
  tagline: string;
  nav_label: string;
  community_label: string;
  community_text: string;
  copyright: string;
  built_for: string;
};

type NavDict = {
  home: string;
  news: string;
  articles: string;
  racket_finder: string;
  string_finder: string;
  predictions: string;
  feed: string;
  stringing: string;
  match_analysis: string;
};

type Props = {
  lang: string;
  dict: FooterDict;
  navDict: NavDict;
};

export default function Footer({ lang, dict, navDict }: Props) {
  const navLinks = [
    { href: `/${lang}`,                label: navDict.home },
    { href: `/${lang}/news`,           label: navDict.news },
    { href: `/${lang}/articles`,       label: navDict.articles },
    { href: `/${lang}/match-analysis`, label: navDict.match_analysis },
    { href: `/${lang}/feed`,           label: navDict.feed },
    { href: `/${lang}/predictions`,    label: navDict.predictions },
    { href: `/${lang}/racket-finder`,  label: navDict.racket_finder },
    { href: `/${lang}/string-finder`,  label: navDict.string_finder },
    { href: `/${lang}/stringing`,      label: navDict.stringing },
  ];

  return (
    <footer className="border-t border-line bg-green-deep py-12 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">

        {/* Brand */}
        <div>
          <div className="font-serif text-lg font-bold text-sand mb-2">
            TennisMind
          </div>
          <p className="font-sans text-sm text-sand/55 leading-relaxed max-w-xs">
            {dict.tagline}
          </p>
        </div>

        {/* Nav links */}
        <div>
          <p className="font-sans text-xs font-semibold text-sand/35 uppercase tracking-widest mb-3">
            {dict.nav_label}
          </p>
          <ul className="space-y-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-sans text-sm text-sand/55 hover:text-sand transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Community */}
        <div>
          <p className="font-sans text-xs font-semibold text-sand/35 uppercase tracking-widest mb-3">
            {dict.community_label}
          </p>
          <p className="font-sans text-sm text-sand/55 mb-4">{dict.community_text}</p>
          <a
            href="https://t.me/tennismind"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-sand/25 text-sand/80 font-sans text-sm font-medium px-4 py-2 rounded-full hover:border-sand/45 hover:text-sand transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            @TennisMind
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="font-sans text-xs text-sand/30">{dict.copyright}</p>
        <p className="font-sans text-xs text-sand/30">{dict.built_for}</p>
      </div>
    </footer>
  );
}

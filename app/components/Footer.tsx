import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-accent/15 bg-[#0a0015] py-12 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <div className="text-lg font-bold mb-2">
            <span className="text-white">Tennis</span>
            <span className="text-accent">Mind</span>
          </div>
          <p className="text-sm text-white/45 leading-relaxed max-w-xs">
            Data-driven tennis intelligence. Match analysis, predictions, and gear recommendations.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
            Navigation
          </p>
          <ul className="space-y-2">
            {[
              { href: "/", label: "Home" },
              { href: "/analysis", label: "Analysis" },
              { href: "/predictions", label: "Predictions" },
              { href: "/racket-finder", label: "Racket Finder" },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
            Community
          </p>
          <p className="text-sm text-white/60 mb-3">
            Join the TennisMind Telegram for daily tennis insights.
          </p>
          <a
            href="https://t.me/tennismind"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-cyan/10 border border-cyan/20 text-cyan text-sm font-medium px-4 py-2 rounded-full hover:bg-cyan/20 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            @TennisMind
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-accent/10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-white/30">
          © 2025 TennisMind. All rights reserved.
        </p>
        <p className="text-xs text-white/30">
          Built for tennis lovers, by tennis lovers.
        </p>
      </div>
    </footer>
  );
}

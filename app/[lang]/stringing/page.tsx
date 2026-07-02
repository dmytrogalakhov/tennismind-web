import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Racket Stringing Munich — from €15 | TennisMind",
  description:
    "Professional racket stringing in Munich. €15 labor — bring your own strings, or ask about string options. Within 24 hours, cheaper than pro shops.",
  openGraph: {
    title: "Racket Stringing Munich — from €15",
    description:
      "Professional racket stringing in Munich. €15 labor — bring your own strings, or ask about string options. Within 24 hours, cheaper than pro shops.",
    siteName: "TennisMind",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Racket Stringing Munich — from €15",
    description:
      "Professional racket stringing in Munich. €15 labor — bring your own strings, or ask about string options. Within 24 hours.",
  },
};

export default function StringingPage() {
  return (
    <div className="flex-1">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="font-sans text-xs font-semibold text-clay uppercase tracking-widest mb-5">
            Munich · Racket Stringing
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-6">
            Your racket restrung.<br />
            <span className="text-clay">Fast. Cheap. Professional.</span>
          </h1>
          <p className="font-sans text-lg sm:text-xl text-muted max-w-xl mx-auto mb-10 leading-relaxed">
            Professional tennis racket stringing in Munich — within 24 hours,
            and cheaper than what the shops charge.
          </p>
          <a
            href="#book"
            className="inline-flex items-center justify-center font-sans font-semibold rounded-full bg-green text-sand hover:bg-green-deep transition-colors px-10 py-4 text-lg no-underline"
          >
            Request stringing
          </a>
        </div>
      </section>

      {/* ── Why ───────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-bisque border-y border-line">
        <div className="max-w-3xl mx-auto">
          <p className="font-sans text-xs font-semibold text-clay uppercase tracking-widest mb-3 text-center">
            Why here
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-14">
            Better than the shop — in every way that matters
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-green/10 border border-green/15 flex items-center justify-center text-green font-bold text-lg font-sans">
                €
              </div>
              <h3 className="text-xl font-bold text-green">Better Value</h3>
              <p className="font-sans text-muted leading-relaxed">
                Most Munich shops charge up to €40 per racket.<br />
                Here, labor is just <strong className="text-ink">€15</strong> — bring your own strings or choose from ours.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-green/10 border border-green/15 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-green">Fast Turnaround</h3>
              <p className="font-sans text-muted leading-relaxed">
                Many shops quote waits of up to two weeks.<br />
                Drop off your racket and get it back <strong className="text-ink">within 24 hours</strong>.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-green/10 border border-green/15 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green">
                  <path d="M12 2a5 5 0 0 1 5 5c0 1.8-.9 3.3-2.3 4.3A5 5 0 0 1 17 16H7a5 5 0 0 1 2.3-4.7A5 5 0 0 1 7 7a5 5 0 0 1 5-5z" /><line x1="12" y1="16" x2="12" y2="21" /><line x1="9" y1="21" x2="15" y2="21" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-green">Tailored Advice</h3>
              <p className="font-sans text-muted leading-relaxed">
                Most shops recommend what they have in stock.<br />
                Here, you get string and tension advice <strong className="text-ink">tailored to your game</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="font-sans text-xs font-semibold text-clay uppercase tracking-widest mb-3 text-center">
            How it works
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-14">
            Three steps. No friction.
          </h2>

          <div className="flex flex-col max-w-xl mx-auto">
            <div className="flex gap-6 pb-10">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-green text-sand font-sans font-bold text-sm flex items-center justify-center shrink-0">1</div>
                <div className="w-px flex-1 bg-line mt-3" />
              </div>
              <div className="pb-2">
                <h3 className="text-lg font-bold text-green mb-1">Send a message</h3>
                <p className="font-sans text-muted leading-relaxed">
                  Drop me a message on WhatsApp or Telegram — your string and tension preference,
                  and when you need the racket back. I&apos;ll reply within a few hours.
                </p>
              </div>
            </div>

            <div className="flex gap-6 pb-10">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-green text-sand font-sans font-bold text-sm flex items-center justify-center shrink-0">2</div>
                <div className="w-px flex-1 bg-line mt-3" />
              </div>
              <div className="pb-2">
                <h3 className="text-lg font-bold text-green mb-1">Bring your racket</h3>
                <p className="font-sans text-muted leading-relaxed">
                  Drop it off at my place in Munich — I&apos;ll confirm the address
                  when we arrange the time.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="shrink-0">
                <div className="w-9 h-9 rounded-full bg-clay text-sand font-sans font-bold text-sm flex items-center justify-center">3</div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-green mb-1">Get it back, ready to play</h3>
                <p className="font-sans text-muted leading-relaxed">
                  Your racket comes back strung to your spec — within 24 hours.
                  No waiting, no chasing the shop.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-bisque border-y border-line">
        <div className="max-w-3xl mx-auto">
          <p className="font-sans text-xs font-semibold text-clay uppercase tracking-widest mb-3 text-center">
            Pricing
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Transparent pricing. No surprises.
          </h2>

          <div className="max-w-sm mx-auto bg-sand border border-line rounded-card p-8 mb-8">
            {/* Option 1 */}
            <div className="mb-6">
              <p className="font-sans text-xs font-semibold text-muted uppercase tracking-widest mb-2">
                You bring your strings
              </p>
              <p className="font-bold leading-none text-5xl text-clay">€15</p>
              <p className="font-sans text-sm text-muted mt-2">Labor only</p>
            </div>

            <hr className="border-line mb-6" />

            {/* Option 2 */}
            <div className="mb-6">
              <p className="font-sans text-xs font-semibold text-muted uppercase tracking-widest mb-2">
                I supply the strings
              </p>
              <p className="font-bold leading-none text-5xl text-green">€15 <span className="text-2xl font-sans font-normal">+ strings</span></p>
              <p className="font-sans text-sm text-muted mt-2">Price depends on string choice — ask for options</p>
            </div>

            <hr className="border-line mb-5" />

            <ul className="font-sans text-sm text-muted space-y-2.5">
              <li className="flex items-center gap-2">
                <span className="text-green font-bold">✓</span> Custom tension — your spec or recommended
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green font-bold">✓</span> Within 24 hours
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green font-bold">✓</span> String advice included
              </li>
            </ul>
          </div>

          <p className="font-sans text-sm text-muted text-center">
            For comparison: Munich pro shops typically charge{" "}
            <strong className="text-ink">up to €40</strong> all-in,
            and make you wait <strong className="text-ink">up to two weeks</strong>.
          </p>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section id="book" className="py-24 px-6">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to string?</h2>
          <p className="font-sans text-muted text-lg mb-10 leading-relaxed">
            Send me a message on WhatsApp or Telegram — tell me your desired string and tension
            and when you need the racket back. I&apos;ll reply within a few hours.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* WhatsApp */}
            <a
              href="https://wa.me/4915156943185?text=Hi%2C%20I%27d%20like%20to%20book%20a%20restring"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 font-sans font-semibold bg-green text-sand px-8 py-4 rounded-full hover:bg-green-deep transition-colors no-underline w-full sm:w-auto justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.557 4.119 1.529 5.845L0 24l6.335-1.502A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.373l-.36-.214-3.727.883.936-3.618-.235-.372A9.818 9.818 0 1 1 12 21.818z" />
              </svg>
              WhatsApp
            </a>

            {/* Telegram */}
            <a
              href="https://t.me/GalakhovD"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 font-sans font-semibold bg-transparent text-green border border-[1.5px] border-green px-8 py-4 rounded-full hover:bg-green hover:text-sand transition-colors no-underline w-full sm:w-auto justify-center"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Telegram
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}

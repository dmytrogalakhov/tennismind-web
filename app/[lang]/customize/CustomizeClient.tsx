"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type T = {
  title: string;
  subtitle: string;
  q1_label: string;
  search_placeholder: string;
  other_racket: string;
  dont_know: string;
  type_placeholder: string;
  q2_label: string;
  opt_stability: string;
  opt_power: string;
  opt_control: string;
  opt_spin: string;
  submit: string;
  result_title: string;
  result_coming_soon: string;
  your_racket_label: string;
  missing_label: string;
  start_over: string;
  try_racket_finder: string;
  join_telegram: string;
};

type Props = { lang: string; t: T; racketNames: string[] };

type Step = "q1" | "q2" | "result";

const MISSING_OPTIONS = (t: T) => [
  { value: "stability", label: t.opt_stability },
  { value: "power",     label: t.opt_power },
  { value: "control",   label: t.opt_control },
  { value: "spin",      label: t.opt_spin },
];

export default function CustomizeClient({ lang, t, racketNames }: Props) {
  const [step, setStep]             = useState<Step>("q1");
  const [search, setSearch]         = useState("");
  const [selectedRacket, setSelectedRacket] = useState<string | null>(null);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherText, setOtherText]   = useState("");
  const [missing, setMissing]       = useState<string[]>([]);

  const filtered = useMemo(() => {
    if (!search.trim()) return racketNames;
    const q = search.toLowerCase();
    return racketNames.filter((n) => n.toLowerCase().includes(q));
  }, [search, racketNames]);

  const displayRacket = selectedRacket === "__other__"
    ? otherText || t.other_racket
    : selectedRacket === "__dont_know__"
    ? t.dont_know
    : selectedRacket ?? "";

  function toggleMissing(value: string) {
    setMissing((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function handleReset() {
    setStep("q1");
    setSearch("");
    setSelectedRacket(null);
    setShowOtherInput(false);
    setOtherText("");
    setMissing([]);
  }

  const progress = step === "q1" ? 50 : 100;

  /* ── Result screen ── */
  if (step === "result") {
    const missingLabels = MISSING_OPTIONS(t)
      .filter((o) => missing.includes(o.value))
      .map((o) => o.label)
      .join(", ");

    return (
      <div className="flex-1 flex flex-col">
        <div className="max-w-2xl mx-auto w-full px-6 py-16 flex flex-col gap-6">
          {/* Header */}
          <div className="text-center mb-2">
            <span className="inline-block font-sans text-xs font-semibold uppercase tracking-widest text-green bg-green/10 border border-green/20 px-3 py-1 rounded-full mb-4">
              {t.result_title}
            </span>
          </div>

          {/* Coming soon card */}
          <div className="bg-bisque border border-clay/25 rounded-card p-6 sm:p-8">
            <div className="text-4xl mb-4">🔧</div>
            <p className="font-serif text-ink/85 leading-relaxed">{t.result_coming_soon}</p>
          </div>

          {/* Summary */}
          <div className="bg-bisque border border-line rounded-card p-6 flex flex-col gap-4">
            <div>
              <p className="font-sans text-xs text-muted uppercase tracking-widest mb-1">{t.your_racket_label}</p>
              <p className="font-sans text-sm font-semibold text-ink">{displayRacket || "—"}</p>
            </div>
            <div>
              <p className="font-sans text-xs text-muted uppercase tracking-widest mb-1">{t.missing_label}</p>
              <p className="font-sans text-sm font-semibold text-ink">{missingLabels || "—"}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <a
              href="https://t.me/tennismind"
              target="_blank"
              rel="noopener noreferrer"
              className="text-center bg-green text-sand font-sans font-bold px-6 py-4 rounded-card hover:bg-green-deep transition-colors"
            >
              {t.join_telegram}
            </a>
            <Link
              href={`/${lang}/racket-finder`}
              className="text-center border border-line text-muted font-sans font-semibold px-6 py-4 rounded-card hover:bg-sand transition-colors"
            >
              {t.try_racket_finder}
            </Link>
            <div className="text-center mt-2">
              <button
                onClick={handleReset}
                className="font-sans text-sm text-muted hover:text-ink transition-colors underline"
              >
                {t.start_over}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Quiz screen ── */
  return (
    <div className="flex-1 flex flex-col">
      <div className="max-w-2xl mx-auto w-full px-6 py-16 flex flex-col gap-6">

        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{t.title}</h1>
          <p className="font-sans text-muted">{t.subtitle}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-sand border border-line rounded-full h-1">
          <div
            className="bg-clay h-1 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Card */}
        <div className="bg-bisque border border-line rounded-card p-6 sm:p-8">

          {/* ── Q1 ── */}
          {step === "q1" && (
            <div className="flex flex-col gap-5">
              <h2 className="font-serif text-lg font-semibold text-ink">{t.q1_label}</h2>

              {/* Search input */}
              {!showOtherInput && !selectedRacket && (
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.search_placeholder}
                  className="w-full bg-sand border border-line rounded-xl px-4 py-3 font-sans text-ink placeholder-muted text-sm focus:outline-none focus:border-clay/50 transition-colors"
                />
              )}

              {/* Racket list */}
              {!showOtherInput && !selectedRacket && (
                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {filtered.slice(0, 30).map((name) => (
                    <button
                      key={name}
                      onClick={() => { setSelectedRacket(name); setSearch(""); }}
                      className="w-full text-left px-4 py-3 rounded-xl border border-line bg-sand font-sans text-sm text-ink/80 hover:border-clay/35 hover:text-ink transition-all"
                    >
                      {name}
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="font-sans text-sm text-muted px-4 py-2">No matches — try "Other" below</p>
                  )}
                </div>
              )}

              {/* Special options */}
              {!showOtherInput && !selectedRacket && (
                <div className="flex flex-col gap-1.5 border-t border-line pt-3">
                  <button
                    onClick={() => setShowOtherInput(true)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-line bg-sand font-sans text-sm text-muted hover:border-clay/35 hover:text-ink transition-all"
                  >
                    {t.other_racket}
                  </button>
                  <button
                    onClick={() => setSelectedRacket("__dont_know__")}
                    className="w-full text-left px-4 py-3 rounded-xl border border-line bg-sand font-sans text-sm text-muted hover:border-clay/35 hover:text-ink transition-all"
                  >
                    {t.dont_know}
                  </button>
                </div>
              )}

              {/* Other free text */}
              {showOtherInput && (
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    placeholder={t.type_placeholder}
                    autoFocus
                    className="w-full bg-sand border border-clay/30 rounded-xl px-4 py-3 font-sans text-ink placeholder-muted text-sm focus:outline-none focus:border-clay/50 transition-colors"
                  />
                  <button
                    onClick={() => { setSelectedRacket("__other__"); }}
                    disabled={!otherText.trim()}
                    className="bg-green text-sand font-sans font-semibold px-6 py-3 rounded-card hover:bg-green-deep transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                  <button
                    onClick={() => { setShowOtherInput(false); setOtherText(""); }}
                    className="font-sans text-sm text-muted hover:text-ink transition-colors underline"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {/* Selected racket confirmation */}
              {selectedRacket && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-clay/30 bg-clay/10">
                    <span className="text-green text-lg">✓</span>
                    <span className="font-sans text-sm font-semibold text-ink">{displayRacket}</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep("q2")}
                      className="flex-1 bg-green text-sand font-sans font-semibold px-6 py-3 rounded-card hover:bg-green-deep transition-colors"
                    >
                      Next →
                    </button>
                    <button
                      onClick={() => { setSelectedRacket(null); setShowOtherInput(false); setOtherText(""); }}
                      className="border border-line text-muted font-sans font-medium px-4 py-3 rounded-card hover:bg-sand transition-colors text-sm"
                    >
                      ← Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Q2 ── */}
          {step === "q2" && (
            <div className="flex flex-col gap-5">
              <h2 className="font-serif text-lg font-semibold text-ink">{t.q2_label}</h2>
              <div className="grid grid-cols-2 gap-3">
                {MISSING_OPTIONS(t).map((opt) => {
                  const sel = missing.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleMissing(opt.value)}
                      className={`px-4 py-4 rounded-xl border font-sans text-sm font-semibold transition-all ${
                        sel
                          ? "border-clay bg-clay/15 text-ink"
                          : "border-line bg-sand text-ink/70 hover:border-clay/35 hover:text-ink"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("result")}
                  disabled={missing.length === 0}
                  className="flex-1 bg-green text-sand font-sans font-bold px-6 py-4 rounded-card hover:bg-green-deep transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t.submit}
                </button>
                <button
                  onClick={() => setStep("q1")}
                  className="border border-line text-muted font-sans font-medium px-4 py-4 rounded-card hover:bg-sand transition-colors text-sm"
                >
                  ←
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

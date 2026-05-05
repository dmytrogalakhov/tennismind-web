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

  const progress = step === "q1" ? 50 : step === "q2" ? 100 : 100;

  /* ── Result screen ── */
  if (step === "result") {
    const missingLabels = MISSING_OPTIONS(t)
      .filter((o) => missing.includes(o.value))
      .map((o) => o.label)
      .join(", ");

    return (
      <div className="flex-1 flex flex-col">
        <div className="max-w-2xl mx-auto w-full px-4 py-16 flex flex-col gap-6">
          {/* Header */}
          <div className="text-center mb-2">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full mb-4">
              {t.result_title}
            </span>
          </div>

          {/* Coming soon card */}
          <div className="bg-accent/[0.06] border border-accent/20 rounded-2xl p-6 sm:p-8">
            <div className="text-4xl mb-4">🔧</div>
            <p className="text-white/80 leading-relaxed">{t.result_coming_soon}</p>
          </div>

          {/* Summary */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <p className="text-[10px] text-white/35 uppercase tracking-widest mb-1">{t.your_racket_label}</p>
              <p className="text-sm font-semibold text-white">{displayRacket || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/35 uppercase tracking-widest mb-1">{t.missing_label}</p>
              <p className="text-sm font-semibold text-white">{missingLabels || "—"}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <a
              href="https://t.me/tennismind"
              target="_blank"
              rel="noopener noreferrer"
              className="text-center bg-accent text-white font-bold px-6 py-4 rounded-xl hover:bg-[#a84ad9] transition-colors"
            >
              {t.join_telegram}
            </a>
            <Link
              href={`/${lang}/racket-finder`}
              className="text-center border border-white/20 text-white/80 font-semibold px-6 py-4 rounded-xl hover:bg-white/[0.05] transition-colors"
            >
              {t.try_racket_finder}
            </Link>
            <div className="text-center mt-2">
              <button
                onClick={handleReset}
                className="text-sm text-white/40 hover:text-white/70 transition-colors underline"
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
      <div className="max-w-2xl mx-auto w-full px-4 py-16 flex flex-col gap-6">

        {/* Header */}
        <div className="text-center mb-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{t.title}</h1>
          <p className="text-white/60">{t.subtitle}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-accent/10 rounded-full h-1">
          <div
            className="bg-accent h-1 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Card */}
        <div className="bg-accent/[0.06] border border-accent/15 rounded-2xl p-6 sm:p-8">

          {/* ── Q1 ── */}
          {step === "q1" && (
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-semibold text-white">{t.q1_label}</h2>

              {/* Search input */}
              {!showOtherInput && !selectedRacket && (
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.search_placeholder}
                  className="w-full bg-white/[0.06] border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-accent/50"
                />
              )}

              {/* Racket list */}
              {!showOtherInput && !selectedRacket && (
                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {filtered.slice(0, 30).map((name) => (
                    <button
                      key={name}
                      onClick={() => { setSelectedRacket(name); setSearch(""); }}
                      className="w-full text-left px-4 py-3 rounded-xl border border-white/8 bg-[#0a0015] text-sm text-white/80 hover:border-accent/40 hover:text-white transition-all"
                    >
                      {name}
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-sm text-white/40 px-4 py-2">No matches — try "Other" below</p>
                  )}
                </div>
              )}

              {/* Special options */}
              {!showOtherInput && !selectedRacket && (
                <div className="flex flex-col gap-1.5 border-t border-white/10 pt-3">
                  <button
                    onClick={() => setShowOtherInput(true)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-white/8 bg-[#0a0015] text-sm text-white/60 hover:border-accent/40 hover:text-white transition-all"
                  >
                    {t.other_racket}
                  </button>
                  <button
                    onClick={() => setSelectedRacket("__dont_know__")}
                    className="w-full text-left px-4 py-3 rounded-xl border border-white/8 bg-[#0a0015] text-sm text-white/60 hover:border-accent/40 hover:text-white transition-all"
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
                    className="w-full bg-white/[0.06] border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-accent/50"
                  />
                  <button
                    onClick={() => { setSelectedRacket("__other__"); }}
                    disabled={!otherText.trim()}
                    className="bg-accent text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#a84ad9] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                  <button
                    onClick={() => { setShowOtherInput(false); setOtherText(""); }}
                    className="text-sm text-white/40 hover:text-white/70 transition-colors underline"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {/* Selected racket confirmation */}
              {selectedRacket && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-accent/30 bg-accent/10">
                    <span className="text-accent text-lg">✓</span>
                    <span className="text-sm font-semibold text-white">{displayRacket}</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep("q2")}
                      className="flex-1 bg-accent text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#a84ad9] transition-colors"
                    >
                      Next →
                    </button>
                    <button
                      onClick={() => { setSelectedRacket(null); setShowOtherInput(false); setOtherText(""); }}
                      className="border border-white/20 text-white/60 font-medium px-4 py-3 rounded-xl hover:bg-white/[0.05] transition-colors text-sm"
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
              <h2 className="text-lg font-semibold text-white">{t.q2_label}</h2>
              <div className="grid grid-cols-2 gap-3">
                {MISSING_OPTIONS(t).map((opt) => {
                  const selected = missing.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleMissing(opt.value)}
                      className={`px-4 py-4 rounded-xl border text-sm font-semibold transition-all ${
                        selected
                          ? "border-accent bg-accent/20 text-white"
                          : "border-white/15 bg-[#0a0015] text-white/70 hover:border-accent/40 hover:text-white"
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
                  className="flex-1 bg-accent text-white font-bold px-6 py-4 rounded-xl hover:bg-[#a84ad9] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t.submit}
                </button>
                <button
                  onClick={() => setStep("q1")}
                  className="border border-white/20 text-white/60 font-medium px-4 py-4 rounded-xl hover:bg-white/[0.05] transition-colors text-sm"
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

"use client";

import { useState, useRef } from "react";
import Link from "next/link";

const RACKET_LIST = [
  "Babolat Pure Aero",
  "Babolat Pure Aero 98",
  "Babolat Pure Aero Lite",
  "Babolat Pure Drive",
  "Babolat Pure Drive 98",
  "Babolat Pure Strike 98 16x19",
  "Babolat Pure Strike 100 16x20",
  "Babolat Pure Strike 18x20",
  "Head Speed MP",
  "Head Extreme MP",
  "Head Gravity MP",
  "Head Radical MP",
  "Head Prestige MP",
  "Head Boom MP",
  "Wilson Blade 98 v9",
  "Wilson Clash 100",
  "Wilson Pro Staff 97 v14",
  "Wilson Burn 100LS",
  "Yonex EZONE 100",
  "Yonex VCORE 98",
  "Tecnifibre Tempo 298",
  "Dunlop CX 200",
  "Dunlop SX 300",
  "Diadem Elevate 98",
  "Diadem Nova 100",
  "Babolat Boost Aero",
  "Head MX Attitude Elite",
];

type T = {
  title: string;
  subtitle: string;
  back: string;
  next: string;
  start_over: string;
  see_results: string;
  result_title: string;
  result_subtitle: string;
  coming_soon_title: string;
  coming_soon_desc: string;
  your_answers: string;
  label_racket: string;
  label_current_string: string;
  label_tension: string;
  label_durability: string;
  label_missing: string;
  cta_telegram: string;
  cta_racket_finder: string;
  based_on_racket: string;
  q_racket: string;
  search_placeholder: string;
  no_matches: string;
  other_racket: string;
  dont_know_racket: string;
  type_racket_placeholder: string;
  q_string: string;
  q_tension: string;
  q_breaking: string;
  q_missing: string;
  str_unknown: string;
  tension_low: string;
  tension_medium: string;
  tension_high: string;
  tension_unknown: string;
  breaking_rarely: string;
  breaking_few_months: string;
  breaking_monthly: string;
  breaking_weekly: string;
  missing_power: string;
  missing_control: string;
  missing_spin: string;
  missing_comfort: string;
  missing_durability: string;
};

type Option = { value: string; label: string; distinct?: boolean };
type Props = { racketParam: string | null; lang: string; t: T };

export default function StringFinderClient({ racketParam, lang, t }: Props) {
  const questions: { id: string; text: string; icon: string; options: Option[] }[] = [
    {
      id: "string",
      text: t.q_string,
      icon: "🎸",
      options: [
        { value: "Babolat RPM Blast", label: "Babolat RPM Blast" },
        { value: "Luxilon ALU Power", label: "Luxilon ALU Power" },
        { value: "Wilson NXT", label: "Wilson NXT" },
        { value: "Tecnifibre X-One", label: "Tecnifibre X-One" },
        { value: "Solinco Hyper-G", label: "Solinco Hyper-G" },
        { value: "Natural Gut", label: "Natural Gut" },
        { value: "unknown_string", label: t.str_unknown, distinct: true },
      ],
    },
    {
      id: "tension",
      text: t.q_tension,
      icon: "⚡",
      options: [
        { value: "low", label: t.tension_low },
        { value: "medium", label: t.tension_medium },
        { value: "high", label: t.tension_high },
        { value: "unknown_tension", label: t.tension_unknown, distinct: true },
      ],
    },
    {
      id: "breaking",
      text: t.q_breaking,
      icon: "💥",
      options: [
        { value: "rarely", label: t.breaking_rarely },
        { value: "few_months", label: t.breaking_few_months },
        { value: "monthly", label: t.breaking_monthly },
        { value: "weekly", label: t.breaking_weekly },
      ],
    },
    {
      id: "missing",
      text: t.q_missing,
      icon: "🎯",
      options: [
        { value: "power", label: t.missing_power },
        { value: "control", label: t.missing_control },
        { value: "spin", label: t.missing_spin },
        { value: "comfort", label: t.missing_comfort },
        { value: "durability", label: t.missing_durability },
      ],
    },
  ];

  const answerLabels: Record<string, Record<string, string>> = {
    string: { unknown_string: t.str_unknown },
    tension: {
      low: t.tension_low,
      medium: t.tension_medium,
      high: t.tension_high,
      unknown_tension: t.tension_unknown,
    },
    breaking: {
      rarely: t.breaking_rarely,
      few_months: t.breaking_few_months,
      monthly: t.breaking_monthly,
      weekly: t.breaking_weekly,
    },
    missing: {
      power: t.missing_power,
      control: t.missing_control,
      spin: t.missing_spin,
      comfort: t.missing_comfort,
      durability: t.missing_durability,
    },
  };

  function answerLabel(id: string, value: string): string {
    return answerLabels[id]?.[value] ?? value;
  }

  const showRacketQuestion = !racketParam;

  const [racketQuery, setRacketQuery] = useState("");
  const [racketValue, setRacketValue] = useState(racketParam ?? "");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherRacket, setOtherRacket] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>(
    racketParam ? { racket: racketParam } : {}
  );
  const [phase, setPhase] = useState<"racket" | "questions" | "results">(
    racketParam ? "questions" : "racket"
  );

  function handleReset() {
    setRacketQuery("");
    setRacketValue("");
    setShowDropdown(false);
    setShowOtherInput(false);
    setOtherRacket("");
    setStep(0);
    setSelected(null);
    setAnswers({});
    setPhase(racketParam ? "questions" : "racket");
    if (racketParam) {
      setRacketValue(racketParam);
      setAnswers({ racket: racketParam });
    }
  }

  const filteredRackets = racketQuery.trim()
    ? RACKET_LIST.filter((r) => r.toLowerCase().includes(racketQuery.toLowerCase()))
    : RACKET_LIST;

  function selectRacket(name: string) {
    setRacketValue(name);
    setRacketQuery(name);
    setShowDropdown(false);
    setShowOtherInput(false);
  }

  function selectOther() {
    setRacketValue("other");
    setShowOtherInput(true);
    setShowDropdown(false);
    setRacketQuery("");
  }

  function selectDontKnow() {
    setRacketValue(t.dont_know_racket);
    setRacketQuery(t.dont_know_racket);
    setShowDropdown(false);
    setShowOtherInput(false);
  }

  const racketReady = showOtherInput
    ? otherRacket.trim().length > 0
    : racketValue !== "" && racketValue !== "other";

  function handleRacketNext() {
    if (!racketReady) return;
    const finalRacket = showOtherInput ? otherRacket.trim() : racketValue;
    setAnswers((prev) => ({ ...prev, racket: finalRacket }));
    setPhase("questions");
  }

  function handleNext() {
    if (!selected) return;
    const q = questions[step];
    const newAnswers = { ...answers, [q.id]: selected };
    setAnswers(newAnswers);
    setSelected(null);
    if (step < questions.length - 1) {
      setStep((s) => s + 1);
    } else {
      setPhase("results");
    }
  }

  function handleBack() {
    if (step === 0) {
      if (!racketParam) {
        setSelected(null);
        setPhase("racket");
      }
      return;
    }
    const prevStep = step - 1;
    setStep(prevStep);
    setSelected(answers[questions[prevStep].id] ?? null);
    const newAnswers = { ...answers };
    delete newAnswers[questions[step].id];
    setAnswers(newAnswers);
  }

  const totalSteps = showRacketQuestion ? questions.length + 1 : questions.length;
  const currentStepNumber = phase === "racket" ? 1 : (showRacketQuestion ? step + 2 : step + 1);
  const progressPct =
    phase === "racket"
      ? 0
      : ((showRacketQuestion ? step + 1 : step) / totalSteps) * 100;

  if (phase === "results") {
    const summaryRows = [
      { label: t.label_racket, value: answers.racket },
      { label: t.label_current_string, value: answerLabel("string", answers.string) },
      { label: t.label_tension, value: answerLabel("tension", answers.tension) },
      { label: t.label_durability, value: answerLabel("breaking", answers.breaking) },
      { label: t.label_missing, value: answerLabel("missing", answers.missing) },
    ];

    return (
      <div className="flex-1 py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">{t.result_title}</h1>
            <p className="font-sans text-muted">{t.result_subtitle}</p>
          </div>

          <div className="bg-bisque border border-clay/30 rounded-card p-6 sm:p-8 mb-6 text-center">
            <div className="text-4xl mb-4">🚧</div>
            <h2 className="font-serif text-xl font-semibold mb-2">{t.coming_soon_title}</h2>
            <p className="font-sans text-sm text-muted leading-relaxed">{t.coming_soon_desc}</p>
          </div>

          <div className="bg-bisque border border-line rounded-card p-6 mb-6">
            <p className="font-sans text-xs text-muted uppercase tracking-widest mb-4">{t.your_answers}</p>
            <div className="space-y-3">
              {summaryRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-sans text-muted">{row.label}</span>
                  <span className="font-sans text-ink font-medium text-right">{row.value || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://t.me/tennismind"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-green text-sand font-sans font-semibold px-5 py-3 rounded-full hover:bg-green-deep transition-colors text-sm"
            >
              {t.cta_telegram}
            </a>
            <Link
              href={`/${lang}/racket-finder`}
              className="flex-1 flex items-center justify-center border border-clay text-clay font-sans font-semibold px-5 py-3 rounded-full hover:bg-clay/10 transition-colors text-sm"
            >
              {t.cta_racket_finder}
            </Link>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={handleReset}
              className="font-sans text-sm text-muted hover:text-ink transition-colors underline"
            >
              {t.start_over}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "racket") {
    return (
      <div className="flex-1 py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">{t.title}</h1>
            <p className="font-sans text-muted">{t.subtitle}</p>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="font-sans text-xs text-muted">Question 1 of {totalSteps}</span>
              <span className="font-sans text-xs text-muted">0% complete</span>
            </div>
            <div className="w-full bg-sand border border-line rounded-full h-1">
              <div className="bg-clay h-1 rounded-full" style={{ width: "0%" }} />
            </div>
          </div>

          <div className="bg-bisque border border-line rounded-card p-6 sm:p-8">
            <div className="text-3xl mb-4">🎾</div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-6">{t.q_racket}</h2>

            <div className="relative mb-3" ref={dropdownRef}>
              <input
                type="text"
                value={showOtherInput ? "" : racketQuery}
                onChange={(e) => {
                  setRacketQuery(e.target.value);
                  setRacketValue("");
                  setShowOtherInput(false);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder={t.search_placeholder}
                className="w-full bg-sand border border-line rounded-xl px-4 py-3 font-sans text-ink placeholder-muted focus:outline-none focus:border-clay/50 transition-colors"
              />

              {showDropdown && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-bisque border border-line rounded-xl overflow-hidden shadow-lg">
                  <div className="max-h-56 overflow-y-auto">
                    {filteredRackets.length > 0 ? (
                      filteredRackets.map((name) => (
                        <button
                          key={name}
                          onMouseDown={() => selectRacket(name)}
                          className="w-full text-left px-4 py-2.5 font-sans text-sm text-ink/80 hover:bg-sand hover:text-ink transition-colors"
                        >
                          {name}
                        </button>
                      ))
                    ) : (
                      <p className="px-4 py-3 font-sans text-sm text-muted">{t.no_matches}</p>
                    )}
                  </div>
                  <div className="border-t border-line">
                    <button
                      onMouseDown={selectOther}
                      className="w-full text-left px-4 py-2.5 font-sans text-sm text-muted hover:bg-sand hover:text-ink transition-colors"
                    >
                      {t.other_racket}
                    </button>
                    <button
                      onMouseDown={selectDontKnow}
                      className="w-full text-left px-4 py-2.5 font-sans text-sm text-muted hover:bg-sand transition-colors border-t border-line"
                    >
                      {t.dont_know_racket}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {showOtherInput && (
              <input
                type="text"
                value={otherRacket}
                onChange={(e) => setOtherRacket(e.target.value)}
                placeholder={t.type_racket_placeholder}
                autoFocus
                className="w-full bg-sand border border-clay/30 rounded-xl px-4 py-3 font-sans text-ink placeholder-muted focus:outline-none focus:border-clay/60 transition-colors"
              />
            )}

            {racketReady && !showDropdown && (
              <p className="font-sans text-xs text-green mt-2">
                ✓ {showOtherInput ? otherRacket : racketValue}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end mt-6">
            <button
              onClick={handleRacketNext}
              disabled={!racketReady}
              className="bg-green text-sand font-sans font-semibold px-8 py-3 rounded-full hover:bg-green-deep transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t.next}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[step];

  return (
    <div className="flex-1 py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">{t.title}</h1>
          {racketParam && (
            <p className="font-sans text-xs text-clay mt-1">
              {t.based_on_racket} {racketParam}
            </p>
          )}
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="font-sans text-xs text-muted">
              Question {currentStepNumber} of {totalSteps}
            </span>
            <span className="font-sans text-xs text-muted">
              {Math.round(progressPct)}% complete
            </span>
          </div>
          <div className="w-full bg-sand border border-line rounded-full h-1">
            <div
              className="bg-clay h-1 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="bg-bisque border border-line rounded-card p-6 sm:p-8">
          <div className="text-3xl mb-4">{q.icon}</div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-6">{q.text}</h2>

          <div className="space-y-3">
            {q.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelected(opt.value)}
                className={`w-full text-left px-4 py-4 rounded-xl border transition-all ${
                  selected === opt.value
                    ? "border-clay bg-clay/10 text-ink"
                    : opt.distinct
                    ? "border-line bg-sand text-muted hover:border-clay/20 hover:text-ink/60"
                    : "border-line bg-sand text-ink/80 hover:border-clay/30 hover:text-ink"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${
                      selected === opt.value ? "border-clay bg-clay" : "border-muted"
                    }`}
                  />
                  <span className="font-sans font-medium">{opt.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={step === 0 && !!racketParam}
            className="font-sans text-sm text-muted hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t.back}
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="font-sans text-sm text-muted hover:text-ink transition-colors"
            >
              {t.start_over}
            </button>
            <button
              onClick={handleNext}
              disabled={!selected}
              className="bg-green text-sand font-sans font-semibold px-8 py-3 rounded-full hover:bg-green-deep transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {step === questions.length - 1 ? t.see_results : t.next}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

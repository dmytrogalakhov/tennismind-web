"use client";

import { useState, useEffect, type ReactNode } from "react";
import type { RecommendationResult } from "@/app/api/racket-recommendation/route";
import ApiError from "@/app/components/ApiError";

type T = {
  title: string;
  subtitle: string;
  back: string;
  next: string;
  start_over: string;
  get_rec: string;
  loading_title: string;
  loading_desc: string;
  try_again: string;
  recommended_label: string;
  why_suits: string;
  key_strengths: string;
  spec_head_size: string;
  spec_weight: string;
  spec_stiffness: string;
  spec_string_pattern: string;
  worth_knowing: string;
  runner_up_label: string;
  runner_up_desc: string;
  find_string: string;
  start_over_long: string;
  rec_string_title: string;
  rec_string_type_label: string;
  rec_string_tension_label: string;
  buy_button: string;
  brand_coming_soon: string;
  customize_from_finder_heading: string;
  customize_from_finder_desc: string;
  customize_from_finder_cta: string;
  q_age: string; q_skill: string; q_weight: string; q_style: string;
  q_priority: string; q_budget: string; q_brand: string;
  age_under18: string; age_18to40: string; age_40to55: string; age_55plus: string;
  skill_beginner: string; skill_intermediate: string; skill_upper_intermediate: string; skill_advanced: string;
  weight_light: string; weight_medium: string; weight_heavy: string; weight_unsure: string;
  style_aggressive: string; style_balanced: string; style_defensive: string;
  style_servevolley: string; style_unsure: string;
  priority_power: string; priority_spin: string; priority_control: string;
  priority_feel: string; priority_comfort: string;
  budget_budget: string; budget_mid: string; budget_premium: string;
  brand_babolat: string; brand_head: string; brand_wilson: string; brand_yonex: string;
  brand_dunlop: string; brand_tecnifibre: string; brand_diadem: string; brand_any: string;
};

type ApiErrorT = { title: string; desc: string; cta_bot: string; cta_channel: string };
type Answers = Record<string, string>;
type QuestionOption = { value: string; label: string; desc?: string; disabled?: boolean };

type Props = { lang: string; t: T; apiErrorT: ApiErrorT; preloadedResult?: RecommendationResult };
type Status = "checking" | "quiz" | "loading" | "result" | "error";

const SESSION_KEY = "racket_recommendation";

function AccordionSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-sand transition-colors"
      >
        <span className="font-sans text-sm font-semibold text-ink">{title}</span>
        <svg
          className={`w-4 h-4 text-muted transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

export default function RacketFinderClient({ lang, t, apiErrorT, preloadedResult }: Props) {
  const questions: { id: string; text: string; icon: string; options: QuestionOption[] }[] = [
    {
      id: "age", text: t.q_age, icon: "👤",
      options: [
        { value: "under18", label: t.age_under18 },
        { value: "18to40", label: t.age_18to40 },
        { value: "40to55", label: t.age_40to55 },
        { value: "55plus", label: t.age_55plus },
      ],
    },
    {
      id: "skill", text: t.q_skill, icon: "🎾",
      options: [
        { value: "beginner", label: t.skill_beginner },
        { value: "intermediate", label: t.skill_intermediate },
        { value: "upper_intermediate", label: t.skill_upper_intermediate },
        { value: "advanced", label: t.skill_advanced },
      ],
    },
    {
      id: "weight", text: t.q_weight, icon: "⚖️",
      options: [
        { value: "light", label: t.weight_light },
        { value: "medium", label: t.weight_medium },
        { value: "heavy", label: t.weight_heavy },
        { value: "unsure", label: t.weight_unsure },
      ],
    },
    {
      id: "style", text: t.q_style, icon: "💪",
      options: [
        { value: "aggressive", label: t.style_aggressive },
        { value: "balanced", label: t.style_balanced },
        { value: "defensive", label: t.style_defensive },
        { value: "servevolley", label: t.style_servevolley },
        { value: "unsure", label: t.style_unsure },
      ],
    },
    {
      id: "priority", text: t.q_priority, icon: "🎯",
      options: [
        { value: "power", label: t.priority_power },
        { value: "spin", label: t.priority_spin },
        { value: "control", label: t.priority_control },
        { value: "feel", label: t.priority_feel },
        { value: "comfort", label: t.priority_comfort },
      ],
    },
    {
      id: "budget", text: t.q_budget, icon: "💰",
      options: [
        { value: "budget", label: t.budget_budget },
        { value: "mid", label: t.budget_mid },
        { value: "premium", label: t.budget_premium },
      ],
    },
    {
      id: "brand", text: t.q_brand, icon: "🏷️",
      options: [
        { value: "babolat", label: t.brand_babolat },
        { value: "head", label: t.brand_head },
        { value: "wilson", label: t.brand_wilson },
        { value: "yonex", label: t.brand_yonex, disabled: true },
        { value: "dunlop", label: t.brand_dunlop, disabled: true },
        { value: "tecnifibre", label: t.brand_tecnifibre, disabled: true },
        { value: "diadem", label: t.brand_diadem, disabled: true },
        { value: "any", label: t.brand_any },
      ],
    },
  ];

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("checking");
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["why"]));
  const [runnerUpOpen, setRunnerUpOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (preloadedResult) {
      setResult(preloadedResult);
      setStatus("result");
      return;
    }
    try {
      const fromBuy = sessionStorage.getItem("racket_from_buy");
      if (fromBuy) {
        sessionStorage.removeItem("racket_from_buy");
        const saved = sessionStorage.getItem(SESSION_KEY);
        if (saved) {
          setResult(JSON.parse(saved) as RecommendationResult);
          setStatus("result");
          return;
        }
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // ignore
    }
    setStatus("quiz");
  }, [preloadedResult]);

  function handleReset() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    setStep(0);
    setAnswers({});
    setSelected(null);
    setStatus("quiz");
    setResult(null);
    setOpenSections(new Set(["why"]));
    setRunnerUpOpen(false);
  }

  function handleBack() {
    if (step === 0) return;
    const prevStep = step - 1;
    setStep(prevStep);
    setSelected(answers[questions[prevStep].id] ?? null);
    const newAnswers = { ...answers };
    delete newAnswers[questions[step - 1].id];
    setAnswers(newAnswers);
  }

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleNext() {
    if (!selected) return;
    const q = questions[step];
    const newAnswers = { ...answers, [q.id]: selected };
    setAnswers(newAnswers);
    setSelected(null);

    if (step < questions.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/racket-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAnswers),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "API error");
      const rec = data as RecommendationResult;
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(rec)); } catch { /* ignore */ }
      setResult(rec);
      setStatus("result");
    } catch (err) {
      console.error("Racket recommendation failed:", err instanceof Error ? err.message : err);
      setStatus("error");
    }
  }

  if (status === "checking") return null;

  if (status === "loading") {
    return (
      <div className="flex-1 py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-4xl mb-6 animate-pulse">🎾</div>
          <h2 className="text-2xl font-bold mb-3">{t.loading_title}</h2>
          <p className="font-sans text-muted">{t.loading_desc}</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex-1 py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <ApiError t={apiErrorT} />
          <div className="mt-6 text-center">
            <button
              onClick={handleReset}
              className="font-sans text-sm text-muted hover:text-ink transition-colors underline"
            >
              {t.try_again}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "result" && result) {
    const topSpecs: { label: string; value: string }[] = [
      { label: t.spec_head_size, value: `${result.specs.head_size_sq_in} sq in` },
      { label: t.spec_weight, value: `${result.specs.weight_g}g` },
      { label: t.spec_stiffness, value: `${result.specs.stiffness_ra} RA` },
      { label: t.spec_string_pattern, value: result.specs.string_pattern },
    ];

    return (
      <div className="flex-1 py-12 px-6">
        <div className="max-w-2xl mx-auto">

          {/* Product header */}
          <div className="bg-bisque border border-line rounded-card overflow-hidden mb-3">
            <div className="flex flex-col sm:flex-row">
              {/* Racket image */}
              {result.image_url && (
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, borderRight: "1px solid var(--color-line)" }}>
                  <div
                    onClick={() => setLightboxOpen(true)}
                    style={{ width: 200, height: 260, background: "white", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-in" }}
                  >
                    <img src={result.image_url} alt={result.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                </div>
              )}

              {/* Info panel */}
              <div className="flex-1 p-6 flex flex-col justify-center">
                <span className="inline-block self-start font-sans text-xs font-semibold uppercase tracking-widest text-green bg-green/10 border border-green/20 px-3 py-1 rounded-full mb-3">
                  {t.recommended_label}
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink leading-tight mb-1">
                  {result.name}
                </h2>
                <p className="font-sans text-sm text-muted mb-4">{result.category}</p>
                <p className="font-serif text-2xl font-bold text-clay mb-5">€{result.price_range_eur}</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {topSpecs.map(({ label, value }) => (
                    <div key={label}>
                      <p className="font-sans text-xs text-muted uppercase tracking-widest mb-0.5">{label}</p>
                      <p className="font-sans text-sm font-semibold text-ink">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Lightbox */}
          {lightboxOpen && result.image_url && (
            <div
              onClick={() => setLightboxOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
                style={{ position: "absolute", top: 16, right: 16, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                aria-label="Close"
              >✕</button>
              <img
                src={result.image_url}
                alt={result.name}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 12 }}
              />
            </div>
          )}

          {/* Accordion sections */}
          <div className="bg-bisque border border-line rounded-card overflow-hidden divide-y divide-line mb-3">
            <AccordionSection
              title={t.why_suits}
              isOpen={openSections.has("why")}
              onToggle={() => toggleSection("why")}
            >
              <p className="font-serif text-sm text-ink/85 leading-relaxed">{result.why}</p>
            </AccordionSection>

            <AccordionSection
              title={t.key_strengths}
              isOpen={openSections.has("strengths")}
              onToggle={() => toggleSection("strengths")}
            >
              <ul className="space-y-2">
                {result.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm">
                    <span className="text-green mt-0.5 shrink-0">✓</span>
                    <span className="font-serif text-ink/85">{s}</span>
                  </li>
                ))}
              </ul>
            </AccordionSection>

            <AccordionSection
              title={t.worth_knowing}
              isOpen={openSections.has("warning")}
              onToggle={() => toggleSection("warning")}
            >
              <p className="font-serif text-sm text-ink/85 leading-relaxed">{result.watch_out}</p>
            </AccordionSection>

            {result.recommended_string && (
              <AccordionSection
                title={t.rec_string_title}
                isOpen={openSections.has("string")}
                onToggle={() => toggleSection("string")}
              >
                <p className="font-serif font-semibold text-ink mb-3">{result.recommended_string.name}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1.5 mb-3 text-sm">
                  <div>
                    <span className="font-sans text-muted">{t.rec_string_type_label}: </span>
                    <span className="font-sans text-ink font-medium">{result.recommended_string.type}</span>
                  </div>
                  <div>
                    <span className="font-sans text-muted">{t.rec_string_tension_label}: </span>
                    <span className="font-sans text-ink font-medium">{result.recommended_string.tension_range_kg} kg</span>
                  </div>
                </div>
                <p className="font-serif text-sm text-muted leading-relaxed">{result.recommended_string.why}</p>
              </AccordionSection>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mb-3">
            <a
              href={`/${lang}/buy`}
              className="flex-1 text-center bg-green text-sand font-sans font-bold px-6 py-4 rounded-card hover:bg-green-deep transition-colors"
            >
              {t.buy_button}
            </a>
            <a
              href={`/${lang}/string-finder?racket=${encodeURIComponent(result.name)}`}
              className="flex-1 text-center border border-clay text-clay font-sans font-bold px-6 py-4 rounded-card hover:bg-clay/10 transition-colors"
            >
              {t.find_string}
            </a>
          </div>

          {/* Runner-up */}
          {result.runner_up && (
            <div className="bg-bisque border border-line rounded-card overflow-hidden">
              <button
                onClick={() => setRunnerUpOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-sand transition-colors"
              >
                <div>
                  <p className="font-sans text-xs text-muted uppercase tracking-widest mb-0.5">{t.runner_up_label}</p>
                  <p className="font-sans text-sm font-semibold text-ink/75">{result.runner_up}</p>
                </div>
                <svg
                  className={`w-4 h-4 text-muted transition-transform duration-200 shrink-0 ${runnerUpOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {runnerUpOpen && (
                <div className="px-5 pb-5 border-t border-line pt-4">
                  <p className="font-sans text-sm text-muted leading-relaxed mb-4">{t.runner_up_desc}</p>
                  <button
                    onClick={handleReset}
                    className="font-sans text-sm text-clay hover:underline"
                  >
                    {t.start_over}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Customize entry point */}
          <div className="bg-bisque border border-line rounded-card p-6 mt-3">
            <h3 className="font-serif text-base font-semibold text-ink mb-2">{t.customize_from_finder_heading}</h3>
            <p className="font-sans text-sm text-muted leading-relaxed mb-4">{t.customize_from_finder_desc}</p>
            <a
              href={`/${lang}/customize`}
              className="inline-block border border-line text-muted font-sans text-sm font-medium px-5 py-2.5 rounded-card hover:bg-sand transition-colors"
            >
              {t.customize_from_finder_cta}
            </a>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={handleReset}
              className="font-sans text-sm text-muted hover:text-ink transition-colors underline"
            >
              {t.start_over_long}
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
          <p className="font-sans text-muted">{t.subtitle}</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="font-sans text-xs text-muted">
              Question {step + 1} of {questions.length}
            </span>
            <span className="font-sans text-xs text-muted">
              {Math.round((step / questions.length) * 100)}% complete
            </span>
          </div>
          <div className="w-full bg-sand border border-line rounded-full h-1">
            <div
              className="bg-clay h-1 rounded-full transition-all duration-300"
              style={{ width: `${(step / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-bisque border border-line rounded-card p-6 sm:p-8">
          <div className="text-3xl mb-4">{q.icon}</div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-6">{q.text}</h2>

          <div className="space-y-3">
            {q.options.map((opt) =>
              opt.disabled ? (
                <div
                  key={opt.value}
                  className="w-full text-left px-4 py-4 rounded-xl border border-line bg-sand opacity-50 cursor-not-allowed select-none"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 border-muted" />
                    <div className="flex items-center gap-2">
                      <p className="font-sans font-medium leading-tight text-muted">{opt.label}</p>
                      <span className="font-sans text-xs font-semibold uppercase tracking-wide text-muted bg-sand px-2 py-0.5 rounded-full border border-line">
                        {t.brand_coming_soon}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  key={opt.value}
                  onClick={() => setSelected(opt.value)}
                  className={`w-full text-left px-4 py-4 rounded-xl border transition-all ${
                    selected === opt.value
                      ? "border-clay bg-clay/10 text-ink"
                      : "border-line bg-sand text-ink/80 hover:border-clay/30 hover:text-ink"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 transition-colors ${
                        selected === opt.value ? "border-clay bg-clay" : "border-muted"
                      }`}
                    />
                    <div>
                      <p className="font-sans font-medium leading-tight">{opt.label}</p>
                      {opt.desc && (
                        <p className="font-sans text-sm text-muted mt-0.5">{opt.desc}</p>
                      )}
                    </div>
                  </div>
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={step === 0}
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
              {step === questions.length - 1 ? t.get_rec : t.next}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

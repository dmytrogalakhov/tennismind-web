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
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-sm font-semibold text-white/90">{title}</span>
        <svg
          className={`w-4 h-4 text-white/40 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`}
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
      <div className="flex-1 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-4xl mb-6 animate-pulse">🎾</div>
          <h2 className="text-2xl font-bold mb-3">{t.loading_title}</h2>
          <p className="text-white/60">{t.loading_desc}</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex-1 py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <ApiError t={apiErrorT} />
          <div className="mt-6 text-center">
            <button
              onClick={handleReset}
              className="text-sm text-white/40 hover:text-white/70 transition-colors underline"
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
      <div className="flex-1 py-12 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Product header */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden mb-3">
            <div className="flex flex-col sm:flex-row">
              {/* Racket image */}
              <div className="sm:w-[240px] shrink-0 flex items-center justify-center py-12 px-8 border-b sm:border-b-0 sm:border-r border-white/10 bg-white/[0.02]">
                {result.image_url ? (
                  <img
                    src={result.image_url}
                    alt={result.name}
                    onClick={() => setLightboxOpen(true)}
                    style={{ maxWidth: 200, maxHeight: 280, objectFit: "contain", borderRadius: 12, cursor: "zoom-in" }}
                  />
                ) : (
                  <svg
                    viewBox="0 0 120 300"
                    className="w-28 h-auto text-white/20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <ellipse cx="60" cy="95" rx="50" ry="65" stroke="currentColor" strokeWidth="2.5"/>
                    <line x1="31" y1="42" x2="89" y2="42" stroke="currentColor" strokeWidth="0.8"/>
                    <line x1="21" y1="55" x2="99" y2="55" stroke="currentColor" strokeWidth="0.8"/>
                    <line x1="15" y1="68" x2="105" y2="68" stroke="currentColor" strokeWidth="0.8"/>
                    <line x1="11" y1="81" x2="109" y2="81" stroke="currentColor" strokeWidth="0.8"/>
                    <line x1="10" y1="95" x2="110" y2="95" stroke="currentColor" strokeWidth="0.8"/>
                    <line x1="11" y1="109" x2="109" y2="109" stroke="currentColor" strokeWidth="0.8"/>
                    <line x1="15" y1="122" x2="105" y2="122" stroke="currentColor" strokeWidth="0.8"/>
                    <line x1="21" y1="135" x2="99" y2="135" stroke="currentColor" strokeWidth="0.8"/>
                    <line x1="31" y1="148" x2="89" y2="148" stroke="currentColor" strokeWidth="0.8"/>
                    <line x1="30" y1="43" x2="30" y2="147" stroke="currentColor" strokeWidth="0.8"/>
                    <line x1="45" y1="33" x2="45" y2="157" stroke="currentColor" strokeWidth="0.8"/>
                    <line x1="60" y1="30" x2="60" y2="160" stroke="currentColor" strokeWidth="0.8"/>
                    <line x1="75" y1="33" x2="75" y2="157" stroke="currentColor" strokeWidth="0.8"/>
                    <line x1="90" y1="43" x2="90" y2="147" stroke="currentColor" strokeWidth="0.8"/>
                    <path d="M 44 158 L 48 175 L 72 175 L 76 158" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <rect x="50" y="175" width="20" height="110" rx="5" stroke="currentColor" strokeWidth="2.5"/>
                    <line x1="50" y1="195" x2="70" y2="195" stroke="currentColor" strokeWidth="1.2"/>
                    <line x1="50" y1="210" x2="70" y2="210" stroke="currentColor" strokeWidth="1.2"/>
                    <line x1="50" y1="225" x2="70" y2="225" stroke="currentColor" strokeWidth="1.2"/>
                    <line x1="50" y1="240" x2="70" y2="240" stroke="currentColor" strokeWidth="1.2"/>
                    <line x1="50" y1="255" x2="70" y2="255" stroke="currentColor" strokeWidth="1.2"/>
                    <line x1="50" y1="270" x2="70" y2="270" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                )}
              </div>

              {/* Info panel */}
              <div className="flex-1 p-6 flex flex-col justify-center">
                <span className="inline-block self-start text-xs font-semibold uppercase tracking-widest text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full mb-3">
                  {t.recommended_label}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-1">
                  {result.name}
                </h2>
                <p className="text-sm text-white/50 mb-4">{result.category}</p>
                <p className="text-2xl font-bold text-white mb-5">€{result.price_range_eur}</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {topSpecs.map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] text-white/35 uppercase tracking-widest mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-white">{value}</p>
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
              style={{
                position: "fixed", inset: 0, zIndex: 50,
                background: "rgba(0,0,0,0.85)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "fadeIn 0.15s ease",
              }}
            >
              <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
              <button
                onClick={() => setLightboxOpen(false)}
                style={{
                  position: "absolute", top: 16, right: 16,
                  background: "rgba(255,255,255,0.1)", border: "none",
                  borderRadius: "50%", width: 40, height: 40,
                  color: "#fff", fontSize: 20, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                aria-label="Close"
              >
                ✕
              </button>
              <img
                src={result.image_url}
                alt={result.name}
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 16 }}
              />
            </div>
          )}

          {/* Accordion sections */}
          <div className="border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/10 mb-3">
            <AccordionSection
              title={t.why_suits}
              isOpen={openSections.has("why")}
              onToggle={() => toggleSection("why")}
            >
              <p className="text-sm text-white/80 leading-relaxed">{result.why}</p>
            </AccordionSection>

            <AccordionSection
              title={t.key_strengths}
              isOpen={openSections.has("strengths")}
              onToggle={() => toggleSection("strengths")}
            >
              <ul className="space-y-2">
                {result.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm">
                    <span className="text-accent mt-0.5 shrink-0">✓</span>
                    <span className="text-white/80">{s}</span>
                  </li>
                ))}
              </ul>
            </AccordionSection>

            <AccordionSection
              title={t.worth_knowing}
              isOpen={openSections.has("warning")}
              onToggle={() => toggleSection("warning")}
            >
              <p className="text-sm text-white/80 leading-relaxed">{result.watch_out}</p>
            </AccordionSection>

            {result.recommended_string && (
              <AccordionSection
                title={t.rec_string_title}
                isOpen={openSections.has("string")}
                onToggle={() => toggleSection("string")}
              >
                <p className="font-semibold text-white mb-3">{result.recommended_string.name}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1.5 mb-3 text-sm">
                  <div>
                    <span className="text-white/45">{t.rec_string_type_label}: </span>
                    <span className="text-white/85 font-medium">{result.recommended_string.type}</span>
                  </div>
                  <div>
                    <span className="text-white/45">{t.rec_string_tension_label}: </span>
                    <span className="text-white/85 font-medium">{result.recommended_string.tension_range_kg} kg</span>
                  </div>
                </div>
                <p className="text-sm text-white/60 leading-relaxed">{result.recommended_string.why}</p>
              </AccordionSection>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mb-3">
            <a
              href={`/${lang}/buy`}
              className="flex-1 text-center bg-accent text-white font-bold px-6 py-4 rounded-xl hover:bg-[#a84ad9] transition-colors"
            >
              {t.buy_button}
            </a>
            <a
              href={`/${lang}/string-finder?racket=${encodeURIComponent(result.name)}`}
              className="flex-1 text-center border border-cyan-400 text-cyan-400 font-bold px-6 py-4 rounded-xl hover:bg-cyan-400/10 transition-colors"
            >
              {t.find_string}
            </a>
          </div>

          {/* Runner-up */}
          {result.runner_up && (
            <div className="border border-white/10 rounded-2xl overflow-hidden">
              <button
                onClick={() => setRunnerUpOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
              >
                <div>
                  <p className="text-[10px] text-white/35 uppercase tracking-widest mb-0.5">{t.runner_up_label}</p>
                  <p className="text-sm font-semibold text-white/75">{result.runner_up}</p>
                </div>
                <svg
                  className={`w-4 h-4 text-white/40 transition-transform duration-200 shrink-0 ${runnerUpOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {runnerUpOpen && (
                <div className="px-5 pb-5 border-t border-white/10 pt-4">
                  <p className="text-sm text-white/60 leading-relaxed mb-4">{t.runner_up_desc}</p>
                  <button
                    onClick={handleReset}
                    className="text-sm text-accent hover:underline"
                  >
                    {t.start_over}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={handleReset}
              className="text-sm text-white/40 hover:text-white/70 transition-colors underline"
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
    <div className="flex-1 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">{t.title}</h1>
          <p className="text-white/60">{t.subtitle}</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/45">
              Question {step + 1} of {questions.length}
            </span>
            <span className="text-xs text-white/45">
              {Math.round((step / questions.length) * 100)}% complete
            </span>
          </div>
          <div className="w-full bg-accent/10 rounded-full h-1">
            <div
              className="bg-accent h-1 rounded-full transition-all duration-300"
              style={{ width: `${(step / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-accent/[0.06] border border-accent/15 rounded-2xl p-6 sm:p-8">
          <div className="text-3xl mb-4">{q.icon}</div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-6">{q.text}</h2>

          <div className="space-y-3">
            {q.options.map((opt) =>
              opt.disabled ? (
                <div
                  key={opt.value}
                  className="w-full text-left px-4 py-4 rounded-xl border border-white/8 bg-[#0a0015] opacity-50 cursor-not-allowed select-none"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 border-white/20" />
                    <div className="flex items-center gap-2">
                      <p className="font-medium leading-tight text-white/40">{opt.label}</p>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
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
                      ? "border-accent bg-accent/10 text-white"
                      : "border-accent/15 bg-[#0a0015] text-white/80 hover:border-accent/30 hover:text-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 transition-colors ${
                        selected === opt.value ? "border-accent bg-accent" : "border-white/30"
                      }`}
                    />
                    <div>
                      <p className="font-medium leading-tight">{opt.label}</p>
                      {opt.desc && (
                        <p className="text-sm text-white/45 mt-0.5">{opt.desc}</p>
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
            className="text-sm text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t.back}
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              {t.start_over}
            </button>
            <button
              onClick={handleNext}
              disabled={!selected}
              className="bg-accent text-white font-semibold px-8 py-3 rounded-full hover:bg-[#a84ad9] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {step === questions.length - 1 ? t.get_rec : t.next}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

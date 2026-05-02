"use client";

import { useState, useEffect } from "react";
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
  ready_badge: string;
  result_title: string;
  result_subtitle: string;
  recommended_label: string;
  eu_retail: string;
  why_suits: string;
  key_strengths: string;
  specs_label: string;
  spec_head_size: string;
  spec_weight: string;
  spec_balance: string;
  spec_stiffness: string;
  spec_string_pattern: string;
  worth_knowing: string;
  runner_up_label: string;
  setup_title: string;
  setup_desc: string;
  find_string: string;
  start_over_long: string;
  rec_string_title: string;
  rec_string_type_label: string;
  rec_string_tension_label: string;
  rec_string_personalized: string;
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

type Props = { lang: string; t: T; apiErrorT: ApiErrorT };
type Status = "quiz" | "loading" | "result" | "error";

const SESSION_KEY = "racket_recommendation";

export default function RacketFinderClient({ lang, t, apiErrorT }: Props) {
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
  const [status, setStatus] = useState<Status>("quiz");
  const [result, setResult] = useState<RecommendationResult | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        setResult(JSON.parse(saved) as RecommendationResult);
        setStatus("result");
      }
    } catch {
      // ignore
    }
  }, []);

  function handleReset() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    setStep(0);
    setAnswers({});
    setSelected(null);
    setStatus("quiz");
    setResult(null);
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
    const specLabels: Record<string, string> = {
      head_size: t.spec_head_size,
      weight: t.spec_weight,
      balance: t.spec_balance,
      stiffness: t.spec_stiffness,
      string_pattern: t.spec_string_pattern,
    };

    return (
      <div className="flex-1 py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              {t.ready_badge}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">{t.result_title}</h1>
            <p className="text-white/60">{t.result_subtitle}</p>
          </div>

          <div className="bg-accent/[0.06] border border-accent/30 rounded-2xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs text-white/45 uppercase tracking-widest mb-1">
                  {t.recommended_label}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">{result.name}</h2>
                <p className="text-accent font-medium mt-1">{result.category}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-white">{result.price_range}</p>
                <p className="text-xs text-white/45">{t.eu_retail}</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs text-white/45 uppercase tracking-widest mb-3">{t.why_suits}</p>
              <p className="text-sm text-white/80 bg-accent/10 border border-accent/15 rounded-xl px-4 py-3 leading-relaxed">
                {result.why}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs text-white/45 uppercase tracking-widest mb-3">{t.key_strengths}</p>
                <ul className="space-y-2">
                  {result.strengths.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm">
                      <span className="text-accent mt-0.5 shrink-0">✓</span>
                      <span className="text-white/80">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs text-white/45 uppercase tracking-widest mb-3">{t.specs_label}</p>
                <div className="space-y-2">
                  {Object.entries(result.specs).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <span className="text-white/45">{specLabels[k] ?? k}</span>
                      <span className="text-white/90 font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-6 bg-pink/5 border border-pink/15 rounded-xl px-4 py-3">
              <p className="text-xs text-pink font-semibold uppercase tracking-widest mb-1">{t.worth_knowing}</p>
              <p className="text-sm text-white/70 leading-relaxed">{result.watch_out}</p>
            </div>

            <div className="mb-6 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
              <p className="text-xs text-white/45 uppercase tracking-widest mb-1">{t.runner_up_label}</p>
              <p className="text-sm font-semibold text-white/80">{result.runner_up}</p>
              <p className="text-xs text-white/50 mt-1">{result.runner_up_why}</p>
            </div>

            <a
              href={`/${lang}/buy`}
              className="block w-full text-center bg-accent text-white font-bold px-6 py-4 rounded-xl hover:bg-[#a84ad9] transition-colors text-base"
            >
              {t.buy_button}
            </a>
          </div>

          {result.recommended_string && (
            <div className="mt-6 bg-white/[0.03] border border-white/10 rounded-2xl p-6 sm:p-8">
              <p className="text-xs text-white/45 uppercase tracking-widest mb-4">{t.rec_string_title}</p>
              <p className="text-xl font-bold text-white mb-3">{result.recommended_string.name}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-sm">
                <div>
                  <span className="text-white/45">{t.rec_string_type_label}: </span>
                  <span className="text-white/80 font-medium">{result.recommended_string.type}</span>
                </div>
                <div>
                  <span className="text-white/45">{t.rec_string_tension_label}: </span>
                  <span className="text-white/80 font-medium">{result.recommended_string.tension_range}</span>
                </div>
              </div>
              <p className="text-sm text-white/60 leading-relaxed mb-5">{result.recommended_string.why}</p>
              <a
                href={`/${lang}/string-finder?racket=${encodeURIComponent(result.name)}`}
                className="inline-flex items-center gap-2 text-accent text-sm font-medium hover:underline"
              >
                {t.rec_string_personalized} →
              </a>
            </div>
          )}

          <div className="mt-6 border-t border-accent/10 pt-6">
            <div className="bg-accent/[0.04] border border-accent/15 rounded-2xl p-6 sm:p-8">
              <h3 className="text-lg font-semibold mb-2">{t.setup_title}</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-5">{t.setup_desc}</p>
              <a
                href={`/${lang}/string-finder?racket=${encodeURIComponent(result.name)}`}
                className="inline-flex items-center gap-2 bg-accent text-white font-semibold px-6 py-2.5 rounded-full hover:bg-[#a84ad9] transition-colors text-sm"
              >
                {t.find_string}
              </a>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={handleReset}
              className="text-sm text-white/60 hover:text-white transition-colors underline"
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

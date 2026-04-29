"use client";

import { useState } from "react";
import type { RecommendationResult } from "@/app/api/racket-recommendation/route";

type Answers = Record<string, string>;
type QuestionOption = { value: string; label: string; desc?: string };

const questions: { id: string; text: string; icon: string; options: QuestionOption[] }[] = [
  {
    id: "age",
    text: "What is your age?",
    icon: "👤",
    options: [
      { value: "under18", label: "Under 18" },
      { value: "18to40", label: "18–40" },
      { value: "40to55", label: "40–55" },
      { value: "55plus", label: "55+" },
    ],
  },
  {
    id: "skill",
    text: "What is your current playing level?",
    icon: "🎾",
    options: [
      { value: "beginner", label: "Beginner" },
      { value: "intermediate", label: "Intermediate" },
      { value: "advanced", label: "Advanced" },
    ],
  },
  {
    id: "weight",
    text: "Do you prefer a certain racket weight?",
    icon: "⚖️",
    options: [
      { value: "light", label: "Light (<285g)" },
      { value: "medium", label: "Medium (285–300g)" },
      { value: "heavy", label: "Heavy (300g+)" },
      { value: "unsure", label: "I'm not sure" },
    ],
  },
  {
    id: "style",
    text: "How would you describe your game style?",
    icon: "💪",
    options: [
      { value: "aggressive", label: "Aggressive and attacking" },
      { value: "balanced", label: "Balanced and all-around" },
      { value: "defensive", label: "Defensive and consistent" },
      { value: "servevolley", label: "Serve & Volley" },
      { value: "unsure", label: "I'm not sure yet" },
    ],
  },
  {
    id: "priority",
    text: "What matters most to you in a racket?",
    icon: "🎯",
    options: [
      { value: "power", label: "Easy power" },
      { value: "spin", label: "Heavy spin" },
      { value: "control", label: "Good control" },
      { value: "feel", label: "Great feel" },
      { value: "comfort", label: "More comfort for the arm" },
    ],
  },
  {
    id: "budget",
    text: "What is your budget?",
    icon: "💰",
    options: [
      { value: "budget", label: "Under €150" },
      { value: "mid", label: "€150–200" },
      { value: "premium", label: "Over €200" },
    ],
  },
  {
    id: "brand",
    text: "Do you have any brand preference?",
    icon: "🏷️",
    options: [
      { value: "babolat", label: "Babolat" },
      { value: "head", label: "Head" },
      { value: "wilson", label: "Wilson" },
      { value: "yonex", label: "Yonex" },
      { value: "dunlop", label: "Dunlop" },
      { value: "tecnifibre", label: "Tecnifibre" },
      { value: "diadem", label: "Diadem" },
      { value: "any", label: "Open to anything" },
    ],
  },
];

type Status = "quiz" | "loading" | "result" | "error";

export default function RacketFinderPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("quiz");
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  function handleReset() {
    setStep(0);
    setAnswers({});
    setSelected(null);
    setStatus("quiz");
    setResult(null);
    setErrorMsg("");
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

    // Last question — call the API
    setStatus("loading");
    try {
      const res = await fetch("/api/racket-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAnswers),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "API error");
      setResult(data as RecommendationResult);
      setStatus("result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex-1 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-4xl mb-6 animate-pulse">🎾</div>
          <h2 className="text-2xl font-bold mb-3">Finding your perfect racket…</h2>
          <p className="text-white/60">Analysing your profile against our full racket database.</p>
        </div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="flex-1 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-pink mb-4">{errorMsg}</p>
          <button
            onClick={handleReset}
            className="bg-accent text-white font-semibold px-8 py-3 rounded-full hover:bg-[#a84ad9] transition-colors"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  // Result state
  if (status === "result" && result) {
    const specLabels: Record<string, string> = {
      head_size: "Head Size",
      weight: "Weight",
      balance: "Balance",
      stiffness: "Stiffness",
      string_pattern: "String Pattern",
    };

    return (
      <div className="flex-1 py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent text-sm font-medium px-4 py-1.5 rounded-full mb-4">
              ✓ Your recommendation is ready
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              We found your perfect racket
            </h1>
            <p className="text-white/60">
              Based on your 7 answers, here&apos;s our top pick for you.
            </p>
          </div>

          <div className="bg-accent/[0.06] border border-accent/30 rounded-2xl p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs text-white/45 uppercase tracking-widest mb-1">
                  Recommended
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {result.name}
                </h2>
                <p className="text-accent font-medium mt-1">{result.category}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-white">{result.price_range}</p>
                <p className="text-xs text-white/45">EU retail</p>
              </div>
            </div>

            {/* Why it suits you */}
            <div className="mb-6">
              <p className="text-xs text-white/45 uppercase tracking-widest mb-3">
                Why it suits you
              </p>
              <p className="text-sm text-white/80 bg-accent/10 border border-accent/15 rounded-xl px-4 py-3 leading-relaxed">
                {result.why}
              </p>
            </div>

            {/* Strengths + Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs text-white/45 uppercase tracking-widest mb-3">
                  Key Strengths for You
                </p>
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
                <p className="text-xs text-white/45 uppercase tracking-widest mb-3">
                  Specs
                </p>
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

            {/* Watch out */}
            <div className="mb-6 bg-pink/5 border border-pink/15 rounded-xl px-4 py-3">
              <p className="text-xs text-pink font-semibold uppercase tracking-widest mb-1">
                Worth Knowing
              </p>
              <p className="text-sm text-white/70 leading-relaxed">{result.watch_out}</p>
            </div>

            {/* Runner-up */}
            <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
              <p className="text-xs text-white/45 uppercase tracking-widest mb-1">
                Runner-up
              </p>
              <p className="text-sm font-semibold text-white/80">{result.runner_up}</p>
              <p className="text-xs text-white/50 mt-1">{result.runner_up_why}</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={handleReset}
              className="text-sm text-white/60 hover:text-white transition-colors underline"
            >
              Start over with different answers
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz
  const q = questions[step];

  return (
    <div className="flex-1 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Racket Finder</h1>
          <p className="text-white/60">
            Answer 7 quick questions and get a personalized recommendation.
          </p>
        </div>

        {/* Progress */}
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

        {/* Question card */}
        <div className="bg-accent/[0.06] border border-accent/15 rounded-2xl p-6 sm:p-8">
          <div className="text-3xl mb-4">{q.icon}</div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-6">{q.text}</h2>

          <div className="space-y-3">
            {q.options.map((opt) => (
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
                      selected === opt.value
                        ? "border-accent bg-accent"
                        : "border-white/30"
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
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="text-sm text-white/60 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Start over
            </button>
            <button
              onClick={handleNext}
              disabled={!selected}
              className="bg-accent text-white font-semibold px-8 py-3 rounded-full hover:bg-[#a84ad9] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {step === questions.length - 1 ? "Get My Recommendation →" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

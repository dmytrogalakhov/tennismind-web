# Provocation Agent — PRD & Solution Design

**Status:** Phase 1 (live) — automated weekly delivery on thin data; Phase 2 (post-Wimbledon) adds historical baselines
**Owner:** Dmytro Galakhov
**Related:** Lever 3 in the WHY strategy (articles as differentiation); tennismind-master-prd.md (the articles are the product, the feed is the funnel)

---

## 1. Why this exists

TennisMind's differentiation is the **articles** — the human-written, contestable take that no bot and no faster account can replicate. But the founder's honest constraint is idea generation: coming up with article-worthy angles week after week is hard, and a dry spell means no articles, which means the differentiation goes unexpressed.

The Provocation Agent exists to solve **the blank-page problem** — not by writing, but by feeding the writer raw material and a question worth reacting to.

### The governing principle (this is the whole design)

> **The agent surfaces material and provokes thinking. It never hands over the thesis. The take stays human.**

This is non-negotiable and it shapes every design choice. The articles are differentiated *because* a human formed the argument. An agent that handed over finished angles would automate away the one thing that can't be automated — you'd be writing the agent's take with your name on it, which is bot content laundered through a person. So the agent's output is deliberately *incomplete*: a pattern and an open question, with the conclusion left empty for the human to fill. If the agent ever starts concluding, it has failed at its job even when the output looks impressive.

### What it is and isn't

| It is | It is not |
|---|---|
| A researcher that surfaces patterns in data | A writer |
| A sparring partner that poses open questions | A source of finished angles or theses |
| Food for thought, delivered weekly | A content generator for publication |
| Grounded in verifiable data | A trend-inventing "insight" machine |

---

## 2. Product behaviour

### The output: three parts, always

Every provocation the agent delivers has exactly three parts:

1. **THE PATTERN** — a short, factual statement of something observable in recent tennis data ("Three top-10 players lost to opponents ranked outside the top 100 on grass in the past two weeks").
2. **THE DATA** — the actual matches/numbers behind the pattern, listed, so the founder can verify it personally. This is the lie-detector: no data, no pattern.
3. **THE PROVOCATION** — a genuinely open question, never a thesis ("Is the compressed three-week grass season producing more upsets, or is this generation weaker on grass than the last?"). A question that opens thinking, not a conclusion that closes it.

### Delivery

- **Automated:** one provocation per week, Monday 08:00, delivered to the founder's Telegram, formatted as a readable three-part message (no publish/reject buttons — it isn't published anywhere; it's food for thought).
- **The quality gate is the key behaviour:** if no candidate clears the bar in a given week, the agent **sends nothing** and logs the skip. A forced weak provocation every week trains the reader to ignore the agent. Silence on a thin week is the correct, designed outcome — better one good provocation a month than four generic ones. (Same principle as the content pipeline: fewer true things beat more padded ones.)
- **Manual trigger retained:** `--provoke` still prints candidates to the terminal on demand, for when the founder is actively writing and wants to dig deeper than the single weekly send. The weekly auto-send is additive, not a replacement.

---

## 3. Solution design (how it works)

### Pipeline overview

```
Generate candidates  →  Score each candidate  →  Apply gate  →  Send best (or skip)
(5 provocations)        (two axes + disqualifiers)  (≥6/10)      (Telegram, weekly)
```

### Step 1 — Candidate generation

The agent draws on the data currently available (Phase 1): recent match results (news/recap pool, Apify cache when available), current rankings (`rankings.json`), the tournament calendar (surface, tier, timing, Slam proximity), and the news discovery pool. It generates 5 candidate provocations, each in the three-part format, looking for observable patterns: upset clusters, ranking movements, surface-specific results, streaks, generational groupings, over/under-performance vs. seeding.

A **self-consistency check** runs at generation: the pattern's quantitative claims must match the data the agent attaches to it. (This was added after a test produced a pattern claiming a player was "outside the top 70" while the attached data showed him ranked 5 — see §5.)

### Step 2 — Scoring (a second Sonnet call)

Each candidate is scored on two independent axes, 1–10:

- **DATA_SPECIFICITY** — does it name real players, real rankings, real scores? (vs. vague generality)
- **QUESTION_OPENNESS** — is the question genuinely open, or a disguised thesis? (a thesis dressed as a question fails this axis)

**The overall score is the *minimum* of the two axes, not the average.** This is a deliberate design choice: a vague question cannot be rescued by strong data, and rich data cannot rescue a leading question. Both must be good independently. Averaging would let a candidate compensate a weak axis with a strong one — exactly the wrong incentive, because a provocation that's specific but secretly a thesis is worse than useless (it pollutes the founder's thinking with the agent's conclusion).

### Step 3 — Automatic disqualifiers (score-independent)

Regardless of score, a candidate is disqualified if:
- The pattern makes a **quantitative claim the attached data contradicts** (the self-consistency failure).
- The pattern asserts a **historical anomaly without sourced history** (Phase 1 has no historical baseline — it cannot claim "highest in a decade"; see §4).
- The **question implies its own answer** (a thesis in disguise).

Disqualification is the hard floor that protects against the agent's two worst failure modes: fabricating a pattern, and smuggling in a conclusion.

### Step 4 — The quality gate

Threshold: **6/10**. The highest-scoring non-disqualified candidate is sent only if it clears 6. If nothing clears it, nothing is sent, logged as "No provocation met the bar this week — skipped." The gate is what makes weekly automation safe — without it, the agent would send its best garbage on a thin week.

### Step 5 — Delivery

The winning provocation is formatted as a three-part Telegram message and sent. Selection decision logged to `logs/provocation.log`; cron stdout to `logs/provocation-cron.log`.

### Schedule

```
0 8 * * 1  cd /Users/dg/match-analyst-bot && venv/bin/python3 generate_feed.py --provoke-send >> logs/provocation-cron.log 2>&1
```
Monday 08:00, so a fresh provocation is waiting at the start of the writing week. Fires only when the Mac is awake (same constraint as all cron — acceptable for Phase 1; an always-on VPS is the eventual fix).

---

## 4. The Phase 1 / Phase 2 distinction (important)

**Phase 1 (now)** runs on thin data — Apify was blocked until late June, and little structured match history has accumulated. This means the agent **cannot compute statistical surprise** (it has no baseline of what's normal). It is therefore restricted to **observable recent patterns** ("three times in the past two weeks") and is **forbidden from claiming historical anomalies** ("highest rate in a decade") — a disqualifier enforces this. Phase 1 honesty: say what's observable in recent data, never imply a historical baseline that doesn't exist.

**Phase 2 (post-Wimbledon)** adds the data foundation. Once structured match history accumulates, the agent can compute *actual* deviations from baselines — the real definition of a "surprising pattern." The Phase 1 disqualifier on historical claims relaxes, because the agent can then *source* them. The delivery plumbing built in Phase 1 (scoring, gate, weekly send) carries over unchanged; Phase 2 is an additive baseline-computation layer, not a rebuild.

The honest expectation for Phase 1: **modest.** On thin data, genuinely surprising patterns are rare, so the quality gate should skip *more weeks than it sends*. That is correct behaviour, not failure.

---

## 5. How it fails safely

The agent's defining risk is the seductive failure mode: **inventing a pattern that sounds insightful but isn't real.** An LLM asked "what's surprising in tennis?" with no grounding will confabulate plausible trends — and a fabricated trend is more dangerous than a fabricated score, because it *sounds* smart, which is exactly what disarms scrutiny. Every design choice above is a defence against this:

- **The DATA part is mandatory and verifiable** — the founder can check every pattern against the listed matches in seconds. No data, no pattern.
- **The self-consistency check** caught a real error in testing: a candidate claimed a player was "outside the top 70" while its own attached data showed him ranked 5. The disqualifier now catches this class — the pattern and its data must agree.
- **Phase 1 forbids unsourced historical claims**, the most tempting form of confabulation.
- **The min-of-two-axes scoring** prevents a confident, well-sourced *thesis* from passing as a question.
- **The gate prefers silence to weakness** — a thin week sends nothing rather than padding.

The validated test case: a generation produced a pattern about a player's ranking that contradicted the attached data. Pre-fix, it would have been sent. Post-fix, the self-consistency disqualifier excludes it, and the next-best valid candidate (a genuinely open question grounded in real match data) is selected instead. The guardrail does exactly what it exists to do.

---

## 6. The only metric that matters

This feature succeeds if and only if it **makes the founder write better articles** — if a weekly provocation becomes an article, or makes the founder think harder than they would have alone. It is not measured by volume, uptime, or how clever the provocations sound.

The honest review, after a month of weekly sends: did any provocation feed a real article? If yes, it earns its place and graduates to Phase 2. If the sends are consistently "interesting but I'd never write that," Phase 1 data is too thin to provoke genuine ideas, and the weekly send should pause until Phase 2 makes the patterns truly surprising. A weekly ritual that doesn't produce is noise that trains the founder to ignore their own tool — and should be cut without sentiment.

---

## 7. Open questions / Phase 2 roadmap

- **Baseline computation:** what historical window and what metrics define "normal" (upset rates by surface/tier, ranking volatility, etc.) so Phase 2 can compute genuine statistical surprise?
- **Gate calibration:** is 6/10 the right threshold? Watch whether it skips appropriately on thin weeks or rationalizes sending every week. Tighten if it never says no.
- **Acknowledgment tracking:** a lightweight 👍/🗑 on each send (used / not useful) would, over time, reveal which *kinds* of provocations actually feed articles — useful signal for tuning selection.
- **Phase 2 trigger:** revisit after Wimbledon, once enough structured match history has accumulated to establish baselines.

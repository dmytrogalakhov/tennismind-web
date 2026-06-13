# TennisMind — Iterative Development Case Studies

**Purpose:** a structured record of how three core features (News, Recaps, Insights) were taken from broken first attempts to reliable production systems through successive, evidence-driven iterations. Each case shows the problem, every attempt and its result, and what each failure taught — ending at the current solution and the transferable lesson.

**Why this document exists:** product management is not getting it right the first time — it is diagnosing honestly, trying a fix, measuring the result, and iterating until the constraint is actually relieved. This document is the evidence of that practice.

**How to read it:** each case is a problem statement followed by a numbered sequence of attempts (Attempt → Result → Lesson), closing with the final solution and the principle that transfers beyond tennis.

---

# CASE 1 — RECAPS: from hallucination to structured truth

*The flagship iteration. Six attempts before the right architecture.*

## Problem statement
The recap agent was meant to summarize yesterday's matches and explain why they mattered. Instead it repeatedly produced **factually false recaps**: it reported eliminated players as winning, withdrawn players as advancing, recapped the wrong day, and named wrong opponents. For a publication whose entire promise is "understand the sport," publishing false results is the worst possible failure — it destroys trust faster than any prose can rebuild it.

## The iteration sequence

**Attempt 1 — Add an anti-hallucination instruction to the prompt.**
*Approach:* told the model explicitly not to invent results; instructed it to only state what it found.
*Result:* Reduced but did not eliminate fabrication. The model still confidently asserted false results when its source data was ambiguous.
*Lesson:* A prompt instruction cannot fix a problem caused by bad input data. The model wasn't disobeying — it was reasoning over unreliable material.

**Attempt 2 — Cross-reference against already-published content.**
*Approach:* had the agent check its draft against what had already been published, to catch contradictions.
*Result:* Caught some contradictions but added complexity and still missed novel errors.
*Lesson:* Verifying output against other output doesn't establish ground truth — both can be wrong.

**Attempt 3 — Add a separate extraction step (Haiku) to pull structured facts from articles.**
*Approach:* used a cheaper model to extract match facts from search results before the writing step.
*Result:* Marginal improvement; the extraction was only as good as the articles, which were undated and often stale.
*Lesson:* Extracting facts from unstructured articles inherits all the problems of unstructured articles.

**Attempt 4 — Add confidence scoring.**
*Approach:* had the agent rate its own confidence in each fact.
*Result:* The model was confidently wrong — high confidence scores on fabricated facts.
*Lesson:* A model's self-assessed confidence is not a reliable signal; a system that's wrong doesn't know it's wrong.

**Attempt 5 — Add a retiring-players list and per-seed searches.**
*Approach:* hardcoded lists and targeted searches to patch specific recurring errors.
*Result:* Fixed the specific cases, but new variants of the same error kept appearing.
*Lesson:* Patching individual symptoms is an infinite treadmill when the root cause is structural.

**Attempt 6 — Recognize the pattern: stop patching.**
*The turning point.* After five patches, the diagnosis crystallized: **a guardrail on top of a guardrail means the foundation is wrong.** Every fix was compensating for one root problem — the agent was extracting time-sensitive facts from unstructured, undated web articles, which is fundamentally unreliable.

## Final solution — re-architecture onto structured data
Replaced the entire search-and-extract approach with a **structured sports-data source** (Apify Flashscore feed). The new pipeline:
- Structured, date-bounded match results as the factual base (who played, who won, set scores) — not extracted by an LLM, fetched as data
- Web search demoted to *enrichment only* — tactical color on the top marquee matches, never the source of the result itself
- The LLM writes the WHY from confirmed facts; it never determines the WHAT
- A clear rule: structural WHY (draw implications, milestones) always allowed; tactical WHY only where enrichment provides evidence — never fabricated
- Unverifiable details (seeds, future rounds) omitted entirely

**Result:** The class of hallucination error was eliminated, not reduced. The eval harness later scored the new pipeline's "explains why" at 4.0/5, up from 2.9. Notably, **the rebuild deleted more code than it added** — the extraction step, confidence scoring, and cross-reference machinery all became unnecessary.

## The transferable lesson
**For time-sensitive factual content, use a structured data source, not an LLM extracting from search results.** When you find yourself adding a guardrail to a guardrail, stop — the foundation is wrong, and the right architecture removes complexity rather than adding it. (Institutionalized as PDL-010.)

---

# CASE 2 — NEWS: from commodity wire to grounded editorial pipeline

*The longest iteration. Six attempts, because news has the hardest constraint of all: it must be both current AND true.*

## Problem statement
The news agent was meant to surface current, interesting tennis stories. Instead it produced a rotating set of failures: duplicate stories, stale tournament recaps presented as news, results between players nobody follows, and stories that were no longer true by the time they published. News competes directly with X and Reddit — so a news feed that's stale, trivial, or wrong has negative value: it's worse than no feed.

## The iteration sequence

**Attempt 1 — Pivot queries off the ended tournament.**
*Approach:* when no tournament is active, point queries at the wider tennis world instead of the tournament that just ended.
*Result:* Stopped some stale-tournament recaps, but the agent still regenerated stories and surfaced trivia.
*Lesson:* Better queries help, but don't address duplication or significance.

**Attempt 2 — Add semantic deduplication (RAG).**
*Approach:* embed published cards; block new cards too similar to past ones.
*Result:* Stopped exact and near-duplicate regeneration of the *same* story — a real improvement.
*Lesson:* Solved "have we said this before" but not "is this current" or "is this worth saying."

**Attempt 3 — Add freshness rules to the prompt.**
*Approach:* instructed the model to reject old news, reject previews of started events, reject results more than a few days old.
*Result:* Inconsistent. The model couldn't reliably judge article age from text snippets that didn't include dates.
*Lesson:* You cannot ask a model to judge freshness when the input has no reliable date. This is an input-data problem, not a prompt problem.

**Attempt 4 — Add a significance filter to the prompt.**
*Approach:* instructed the model to favor big tournaments and major players, skip routine results.
*Result:* Erratic. The model pattern-matched the word "upset" and over-rated minor matches; it had no actual data on who was ranked where or who fans care about.
*Lesson:* Significance judged by "vibes" is unreliable. The model was guessing importance without the data to measure it.

**Attempt 5 — Generate multiple candidates to choose from.**
*Approach:* produce up to 3 cards per run so the editor has options.
*Result:* Risked padding — three thin cards instead of one good one.
*Lesson:* More output isn't better output. Quality must gate quantity, not the reverse.

**Attempt 6 — Recognize the pattern: five prompt patches, one structural cause.**
*The turning point.* The same realization as the recap saga: every fix had been at the prompt layer, while the real failures were structural absences. A proper root-cause analysis (issue tree) identified three:
- *Discovery:* searching a relevance-ranked index (Tavily) without date parameters — getting "tennis articles," not "today's tennis articles"
- *Verification:* no date gate in code, no awareness of what tournament round it is
- *Judgment:* significance decided by the model's vibes, not by ranking data

## Final solution — date-aware discovery + deterministic gates
Rebuilt the pipeline so discovery is agentic but truth-keeping is code:
- **RSS publisher feeds as the primary source** (ATP, WTA, BBC, ESPN) — real-time, dated, straight from the publisher; **search index demoted to a supplement** for long-tail coverage. (Live testing: RSS returned 12 of 14 stories including all marquee ones; search returned 2.)
- **A hard 48-hour date gate in code** — stale articles dropped before the model ever sees them, deterministically
- **Tournament-round awareness** computed from the calendar, so "first-round exit" stories are flagged as stale on quarterfinal day
- **Deterministic significance scoring** — each story scored in code from ATP/WTA rankings + a marquee-player list (top-10 +5, marquee +4, big upset +2, Slam context +2...); only stories above a threshold reach the writing step
- **Event-date stamping** — every card carries an `event_date` in its frontmatter (news cards get the actual source publication date, not the generation date), enabling staleness to be checked against when the event actually happened
- **Round-staleness gate with a content-type distinction** — match-result articles are dropped if the tournament has already moved ≥2 rounds past them (a "second round" story is stale on quarterfinal day), but player-news articles (retirements, comebacks, injuries) are EXEMPT from this check, because those stories stay true regardless of tournament round. The system distinguishes content that expires when the draw advances from content that doesn't.
- **The LLM only writes** what cleared the gates; it no longer decides what's current or significant

**Result:** The full pipeline now runs: RSS+Tavily discovery → 48h date gate → relevance gate → significance scoring → round-staleness check → LLM writes. On a representative run, 14 raw stories narrowed to 6 scored-and-fresh candidates before writing. Discovery became fully agentic (the system finds the news), while freshness and significance became deterministic code (the system can't be fooled by a stale date or a breathless headline).

## The transferable lesson
**Separate the three jobs of a content system — discovery, verification, judgment — and assign each to the right mechanism.** Discovery suits an agent; verification and judgment must be deterministic code grounded in real data, not LLM intuition. And the meta-lesson, learned twice now: prompt rules cannot compensate for missing data at the input layer. (Institutionalized as Issues #011, #013, #014; PDL-011, #016, #017.) And a subtle but important design distinction emerged — not all content ages the same way. A match result expires when the tournament advances; a retirement announcement does not. A staleness system must know the difference.

---

# CASE 3 — INSIGHTS: from static to context-aware, with disciplined fallback

*The shortest iteration — because insights had the most stable foundation. Shows iteration isn't always a long war.*

## Problem statement
Insights (surprising tennis facts) were the most reliable feature, but one-dimensional: they produced only evergreen content and were blind to what was happening in the tennis world. During a tournament, a relevant insight about that event would be far more engaging than a random historical fact — but the agent didn't know tournaments existed.

## The iteration sequence

**Attempt 1 — Add tournament awareness via the calendar.**
*Approach:* expand the tournament calendar so the agent knows which events are active and can generate tournament-flavored insights.
*Result:* Worked in principle, but exposed two bugs: the calendar was incomplete (missing grass-season events) and the date logic mis-identified which tournaments were active (claimed events active before they'd started).
*Lesson:* Context-awareness is only as good as the accuracy of the context. An agent reasoning over a wrong calendar reasons wrongly — confidently.

**Attempt 2 — Add a fallback discipline.**
*Approach:* when a tournament is active, try tournament-specific insights first; if the material is thin, fall back to evergreen.
*Result:* Right behavior — but revealed that "a weak tournament insight" was sometimes being forced when "a strong evergreen insight" was available.
*Lesson:* A fallback isn't just a safety net; it needs a quality comparison. The rule became explicit: a strong evergreen insight beats a weak tournament one.

**Attempt 3 — Fix the calendar accuracy + dedup gap.**
*Approach:* complete the tournament calendar with verified dates; ensure the date filter returns only genuinely-active events; and (discovered during the RAG work) wire semantic dedup into insights, which had been silently missing.
*Result:* Insights now correctly identify active tournaments, attempt relevant angles, fall back to evergreen when appropriate, and no longer regenerate near-duplicate facts.

## Final solution
A context-aware insight agent that keys on an accurate tournament calendar, prefers tournament-relevant material when a real angle exists, falls back to evergreen content under an explicit quality comparison, and runs the same semantic dedup as every other content type.

## The transferable lesson
**Context-awareness is only as good as the accuracy of the context, and every fallback needs a quality bar.** The same dedup discovery also reinforced a system-wide lesson: a capability added to one agent (dedup, built for news) must be audited across all agents — it had silently never been wired into insights. (Institutionalized as Issue #013.)

---

# CROSS-CUTTING LESSONS (what a hiring manager should take from this)

These three cases, taken together, demonstrate a repeatable problem-solving practice:

1. **Diagnose to root cause, not symptom.** Every feature went through a phase of symptom-patching before the real iteration began. The breakthrough in each case was an issue-tree analysis that found the structural cause beneath the visible failures.

2. **Know when to stop patching and re-architect.** "A guardrail on a guardrail means the foundation is wrong" became a decision rule. The recap and news rebuilds both *removed* complexity — the sign of a correct architecture.

3. **Match the mechanism to the job.** LLMs for judgment and prose; structured data and deterministic code for facts, freshness, and significance; the human for taste. The recurring failure was asking an LLM to do a structured-data job.

4. **For time-sensitive factual content, structured/direct sources beat search indexes** — proven independently in recaps (Apify) and news (RSS). A principle that now transfers to any future feature.

5. **Measure, don't assume.** The eval harness turned "the recaps feel better" into "explains-why moved 2.9 → 4.0." Live testing turned "RSS might help" into "RSS returned 12 of 14 vs the index's 2." Decisions were made on evidence, not intuition.

6. **A capability added to one part of a system must be audited across all of it.** The dedup-missing-from-insights bug is the cautionary example.

7. **Honest output beats confident output.** Across all three features, the target state was a system that surfaces less but is trustworthy, rather than more but unreliable — because for a publication, trust is the product.

---

*This document is maintained as features iterate further. Each new significant iteration appends an Attempt/Result/Lesson entry to the relevant case, so the development history stays a single coherent narrative rather than fragmenting across the issue and decision logs.*

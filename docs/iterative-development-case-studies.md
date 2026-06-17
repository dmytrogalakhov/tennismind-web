# TennisMind — Iterative Development Case Studies (Enriched)

**Purpose:** a detailed, self-contained record of how three core features (Recaps, News, Insights) went from broken first attempts to reliable production systems through successive, evidence-driven iterations. Every attempt includes *what was actually built*, *why*, and *why it failed or succeeded* — enough detail to explain any step without consulting another document.

**How to use this:** read it to refresh your own memory of what was built and why; use it as interview preparation (each case is a 90-second story); and treat each "Attempt" as a defensible, specific claim you can expand on if probed.

**A note on the vocabulary:** the terms in **bold** throughout (probabilistic failure, hallucination, context engineering, retrieval-augmented generation, evals / LLM-as-judge, human-in-the-loop, deterministic gating, grounding) are the standard field terms for what was built. They're flagged so the language is available when discussing this work at the level an interviewer expects — the work was always this; the naming makes it legible.

**Source documents** (where the original detail lives, for deeper recall):
- Recaps: PDL-007 and PDL-010 in product-decision-log.md; Issues #009, #010 in issue-log.md
- News: PDL-011, PDL-013, PDL-014 in product-decision-log.md; Issues #011, #013, #014 in issue-log.md; news-agent-rebuild.md
- Insights: Issue #013; the RAG work in rag-memory-prd.md and PDL-012

**Where in the codebase** (repo: `match-analyst-bot`, unless noted):
- `generate_feed.py` — all content agents; `_run_generate_agent` (insights), `run_generate_news` (news), the recap agent, and the shared `publish_card`
- `memory.py` — the RAG layer: `embed`, `cosine_similarity`, `search_memory`, `is_semantic_duplicate`
- `orchestrator.py` — `gather_context`, `propose_plan`, guardrails
- `evals/` — `run_evals.py`, `eval_recap.py`, the LLM-as-judge harness and `eval_log.jsonl`
- `telegram_review.py` — the human-in-the-loop approval flow
- `data/` — `memory.json` (embedding store), `rankings.json`, `marquee-players.json`, the Apify cache

---

# CASE 1 — RECAPS: from hallucination to structured truth

*The flagship iteration. The longest and most instructive arc in the whole project.*

## Problem statement
The recap agent produces one card per day summarizing yesterday's tournament play (men's draw, women's draw, stat of the day). During Roland Garros it repeatedly published **factually wrong recaps** — a textbook case of **probabilistic failure**: a generative model producing confident, fluent output that is simply untrue. It reported results from the wrong day, repeated matches already covered, missed the biggest stories, and — worst — **hallucinated** outcomes that never happened (players "winning" matches they'd lost or withdrawn from). For a publication whose promise is understanding, a wrong score is the one unrecoverable error.

The specific failure that triggered the rebuild: the **Day 2 Roland Garros recap contained five factual errors** — it included Zverev and Djokovic results from Day 1, missed Monfils's last-ever Roland Garros match, included results from the wrong day, and buried Wawrinka's farewell at the bottom instead of leading with it.

*Code:* the recap agent and its search-then-write flow live in `generate_feed.py` (the `--generate-recap` path); the eval scores referenced below are produced by `evals/eval_recap.py`.

## The iteration sequence

**Attempt 1 — Date-specific search queries (better retrieval inputs).**
*What was built:* The original recap queries were generic ("{tournament} results recap"). Tavily returns articles from the past 48–72 hours, so "yesterday's results" were mixed with results from two and three days prior. The fix computed the exact date of yesterday and injected it into every query ("{tournament} results June 2 2026", "{tournament} day 3 results scores"), including a site-restricted query targeting atptour.com and wtatennis.com.
*Result:* Helped narrow the time window, but the LLM still couldn't reliably tell which article described which day — article text often says "earlier this week" without a date.
*Lesson:* This is a **retrieval-quality** problem. Better queries improve what you retrieve, but if the retrieved documents themselves carry no clean date, the model can't sort them by day. Improving retrieval inputs narrows the noise; it doesn't establish ground truth.

**Attempt 2 — Deduplication against previously published recaps (output-as-context / grounding).**
*What was built:* Before generating, the agent read every previously published recap card from `content/feed/` (where `type: "recap"`), extracted the matches/players already covered, and injected that list into the curation prompt as **grounding context**: "These matches were covered on earlier days. Do NOT include them again — if a result appears above, it was played on an earlier day." An early, manual form of **context engineering** — feeding the model its own prior output to constrain the next generation.
*Result:* Genuinely helped — it stopped the recap repeating Day 1's Zverev and Djokovic results in the Day 2 card.
*Lesson:* Grounding the model in its own published history is a useful signal ("we already said this, so it's old") — but it only catches *repeats*, not *novel* date errors or fabrications.

**Attempt 3 — Match-selection priority rules + farewell emphasis (prompt/policy encoding).**
*What was built:* The Day 2 recap had buried Wawrinka's farewell (his last-ever Roland Garros) at the bottom and missed Monfils's farewell entirely. A strict editorial priority order was encoded in the prompt: (1) farewell/retirement matches are ALWAYS the lead story, (2) upsets, (3) top-5 seeds even if routine, (4) home-crowd stories, (5) emerging players, (6) drama. Later strengthened to make top-5 seed coverage *mandatory* (the agent had been skipping "boring" routine wins by Sinner/Swiatek that fans still want confirmed — a reader still didn't know if the world No. 1 had won).
*Result:* Improved story selection — Wawrinka's farewell correctly led the next card. But it exposed a deeper problem (Attempt 4).
*Lesson:* Editorial judgment can be encoded as prompt policy — but only for stories the agent actually *retrieved*. A priority rule can't surface a story the retrieval missed.

**Attempt 4 — Dedicated per-retiring-player searches (targeted retrieval).**
*What was built:* Monfils's farewell kept being missed because Tavily wasn't returning any article about it in the general searches — the agent literally didn't know it happened. The fix added a targeted retrieval pass for each known retiring player ("{tournament} Monfils result {date}", same for Wawrinka, Kerber) plus a hardcoded "known retiring players in 2026" list in the prompt, so the agent actively hunted these specific stories.
*Result:* Caught the specific missing farewells. But this is the moment the pattern became visible — patching individual missing-story cases one entity at a time.
*Lesson:* When you're hardcoding lists of specific entities to rescue specific missed stories, you're patching symptoms. The agent's *retrieval* is fundamentally unreliable, and you're compensating case by case.

**Attempt 5 — A second-pass Haiku quality check (an early, ad-hoc eval / LLM-as-judge).**
*What was built:* After Sonnet wrote the recap, a cheaper Haiku call verified it against the previously-covered list and the target date, returning JSON flagging duplicates, date-uncertain matches, and whether farewells were prioritized. Flagged matches were stripped before the card reached human review. This was effectively an **LLM-as-judge** verification step — a second model evaluating the first model's output against explicit criteria — and the governing principle was written into PDL-007: *"Accuracy over completeness — a 100-word recap with 4 verified results beats a 200-word recap with 2 wrong ones."*
*Result:* Reduced errors further, at ~$0.01 per recap. But it was a verification layer bolted on top of an unreliable generation process — using a second probabilistic system to catch the first one's **probabilistic failures**.
*Lesson:* A verification pass is a guardrail. When you're adding a guardrail to catch the failures of earlier guardrails, the foundation itself is the problem. (This step did, however, seed the later formal **eval harness** — the instinct to have a model grade output against criteria became `evals/`.)

**Attempt 6 — Recognize the pattern: stop patching, re-architect.**
*The turning point.* Five fixes deep — date queries, dedup grounding, priority policy, targeted retrieval, an LLM-as-judge verifier — the diagnosis crystallized: **every patch was compensating for one root cause.** The agent was extracting time-sensitive facts (who won, the score, the date) from unstructured, undated web articles. That pipeline is **ungroundable** — no amount of prompt policy or verification fixes an unreliable factual input.

## Final solution — re-architecture onto structured data (PDL-010)
Replaced the search-and-extract foundation with a **structured sports-data source** (Apify Flashscore feed) — i.e. **grounding the model in structured data instead of retrieved prose**:
- Structured, date-bounded match results as the factual base — who played, who won, set scores — fetched as data, not extracted by an LLM
- Web search demoted to *enrichment only*: tactical color on the top ~4 marquee matches, never the source of the result itself
- A clear separation of labor: the LLM writes the **why** (draw implications, milestones, stakes) and never determines the **what**; tactical "why" only where enrichment supplies evidence — never fabricated
- Unverifiable details (seed numbers, future rounds) omitted entirely — a hard **grounding** rule

**Result:** The **hallucination** class of error was *eliminated*, not reduced. The **eval harness** (`evals/eval_recap.py`) later scored the rebuilt pipeline's "explains why" dimension at 4.0/5 (up from 2.9). And the rebuild **deleted more code than it added** — the targeted-retrieval passes, the Haiku verifier, the dedup-against-published machinery, the date-uncertainty logic all became unnecessary once the facts came from a structured source.

*Code to examine:* compare the pre-rebuild search-extraction logic with the current Apify-grounded `--generate-recap` path in `generate_feed.py`; the Apify cache lives in `data/`; the eval that measured the 2.9 → 4.0 lift is `evals/eval_recap.py` with history in `evals/eval_log.jsonl`.

## The transferable lesson
**For time-sensitive factual content, ground the model in a structured data source — don't have an LLM extract facts from search results.** When you find yourself adding a guardrail on top of a guardrail (date checks, then a verifier for the date checks, then hardcoded rescue lists), stop: the foundation is wrong, and the correct architecture removes complexity rather than adding it.

---

# CASE 2 — NEWS: from commodity wire to grounded editorial pipeline

*The same lesson as recaps, learned again on a different feature — proof the principle is general.*

## Problem statement
The news agent surfaces current tennis stories (off-court news during tournaments, the main feed between them). It repeatedly produced duplicates, stale tournament recaps presented as news, results between players nobody follows, and stories that were no longer true by publish time (a "first-round exit" story published on quarterfinal day; a Serena doubles story published after she'd already exited — both **probabilistic failures** of a system that couldn't reason about time or significance). News competes directly with X and Reddit, so stale/trivial/wrong news has *negative* value.

*Code:* the news agent is `run_generate_news` in `generate_feed.py`; the rebuilt discovery/gating pipeline and its design rationale are in `news-agent-rebuild.md`.

## The iteration sequence

**Attempt 1 — Pivot queries off the ended tournament (retrieval steering).**
*What was built:* When no tournament was active, the agent's queries had stayed fixed on the tournament that just ended, so it kept resurfacing result-recaps as "news." The fix swapped in a diverse outward query set (injuries, rankings, coaching changes, comebacks) when no tournament is active.
*Result:* Stopped some stale-tournament recycling, but duplicates and trivia persisted.
*Lesson:* Steering retrieval toward the right *topic* doesn't address self-repetition or significance.

**Attempt 2 — Semantic deduplication via RAG.**
*What was built:* The agent had regenerated a card the user had already deleted; exact-string matching couldn't catch it because the wording differed. The fix is a **retrieval-augmented generation (RAG)** memory layer: every published/rejected card is **embedded** (OpenAI text-embedding-3-small, 1536-dim) and stored; before saving a new candidate, the agent embeds it and computes **cosine similarity** against the store, blocking anything above a 0.82 threshold as a **semantic duplicate**. Notably the **vector similarity is hand-implemented in NumPy over a flat-file store** (`memory.json`) rather than using a vector database — a deliberate choice to understand the mechanism rather than treat it as a black box. (Full detail: PDL-012, rag-memory-prd.md.)
*Result:* Stopped regeneration of the *same* story even when reworded — a durable fix that exact-match **string comparison** could never achieve, because the duplication was semantic, not lexical.
*Lesson:* RAG solved "have we said this before" at the level of *meaning*. It did nothing for "is this current" or "is this worth saying" — different problems needing different mechanisms.
*Code:* `memory.py` — `embed`, `cosine_similarity`, `search_memory`, `is_semantic_duplicate`; store in `data/memory.json`.

**Attempt 3 — Freshness rules in the prompt.**
*What was built:* Instructions telling the model to reject old tournament history, reject previews of already-started events, reject anything more than ~3 days old.
*Result:* Inconsistent. The model can't reliably judge an article's age from a snippet that doesn't state its date.
*Lesson:* You cannot prompt a model into judging freshness when the retrieved context carries no reliable date. An input-data problem masquerading as a prompt problem.

**Attempt 4 — Significance filter in the prompt.**
*What was built:* Instructions to favor Grand Slams/1000s/500s and major players, skip routine 250 first-rounders unless the story transcends the event.
*Result:* Erratic. The model pattern-matched the word "upset" and over-rated minor matches (e.g. flagging a low-ranked-vs-low-ranked match as a "significant upset") because it had no ranking data — significance was being decided by **model priors**, not facts.
*Lesson:* Significance judged by "vibes" is unreliable. The model was guessing importance without the data to measure it.

**Attempt 5 — Generate multiple candidates.**
*What was built:* Produce up to 3 candidates per run so the editor has options — with intra-batch semantic dedup so the three aren't variations of one story.
*Result:* Surfaced the risk of padding — three thin cards to hit a quota instead of one strong one.
*Lesson:* More output isn't better output. Quality must gate quantity, not the reverse.

**Attempt 6 — Recognize the pattern; root-cause the whole pipeline.**
*The turning point — the same realization as recaps.* Five prompt-level patches in, an **issue-tree** root-cause analysis (in news-agent-rebuild.md) identified three structural absences, mapping to the three jobs of a content system:
- *Discovery:* querying a relevance-ranked **search index** (Tavily) through a deprecated wrapper with no date parameters — retrieving "tennis articles," not "today's tennis articles." The wrapper hid date-filtering parameters the API actually supported.
- *Verification:* no **deterministic** date gate in code; no awareness of the current tournament round.
- *Judgment:* significance decided by model priors, not ranking data.

## Final solution — date-aware discovery + deterministic gates (PDL-016)
The architecture now splits **discovery (agentic) from verification and judgment (deterministic code)**:
- **RSS publisher feeds as the primary retrieval source** (ATP, WTA, BBC, ESPN) — real-time, dated, publisher-pushed — with the **search index demoted to a supplement** for long-tail coverage. (Live test: RSS returned 12 of 14 stories including all marquee ones; the index returned 2. PDL-014 explains why a search index structurally lags a publisher feed: indexing latency, plus relevance-ranking that buries fresh articles because they have no inbound links yet.)
- **A hard 48-hour date gate in code** — stale articles dropped **deterministically** before the model sees them, each drop logged with its age. This is the verification job moved out of the LLM and into code.
- **Tournament-round grounding** computed from the calendar, so a "first-round exit" story is flagged stale on quarterfinal day — with a content-type distinction: match-result stories expire when the draw advances, but player-news (retirement, comeback, injury) is exempt because those stay true regardless of round.
- **Deterministic significance scoring** — each story scored in code from ATP/WTA `rankings.json` + a founder-maintained `marquee-players.json` (top-10 +5, top-20 +3, marquee +4, big upset +2, Slam context +2, injury/comeback +3; threshold ≥5). Significance became an arithmetic function of facts, not a model judgment.
- **The LLM only writes** what cleared the gates — its role narrowed to prose generation over verified, pre-scored inputs.

**Result:** Discovery is fully agentic; verification and judgment are deterministic, data-grounded code; the human keeps taste. On a quiet pre-quarterfinal day the pipeline honestly narrowed 14 raw stories to a handful of genuinely fresh, significant ones — rather than confidently publishing four wrong cards.
*Code to examine:* `run_generate_news` in `generate_feed.py` (the RSS-primary discovery, the 48h gate, the scoring function); `data/rankings.json` and `data/marquee-players.json` (the scoring inputs); `news-agent-rebuild.md` (the full design with plain-English issue tree).

**Attempt 9 — Close the mission-vs-product gap: add a grounded WHY line (Levers 1 & 2).**
*What prompted it (proactive, not a bug):* A strategic review surfaced a gap between mission and product. TennisMind's mission promises WHY ("understand the sport, not just the scores"), but the news cards were almost pure WHAT — they reported results and stopped. A result with no editorial angle reads like a bot, because a bot is precisely a thing that reports what happened without explaining why it matters. This wasn't a failure that broke something; it was a quality gap between what the product promised and what it delivered.
*What was built:* Every news card now ends on a mandatory grounded WHY line — significance, not more facts. Crucially, the card length did NOT increase (readers had flagged cards as too long): the WHY budget comes from cutting redundant WHAT (facts already in the title or tags — score, venue, surface) and reallocating those words to one line of significance. Same word cap, better ratio. The WHY must be grounded — computable from data we have (ranking gap, round reached, surface, calendar proximity to the next Slam) or verifiable — never fabricated. A guardrail distinguishes COMPUTABLE grounding (safe: derivable from our data) from RECALLED grounding (risky: claims from the model's general knowledge like a player's season record, which can be confidently wrong); the WHY line prefers computable facts and only uses recalled ones when verifiable. Example: "Majchrzak beats De Minaur 6-3 2-6 7-6" (pure WHAT, 81 words) became a 60-word card ending "...for De Minaur, the loss means arriving at Wimbledon in two weeks as a seeded grass contender without a single grass title this season" (WHY, grounded in calendar + record).
*Result:* The highest-volume, most bot-like content gained an editorial point of view at the same or shorter length — directly attacking the "reads like a bot" problem. The cards now report, then land a take.
*Lesson:* A product can pass every technical test and still fail its mission. The pipeline was accurate, fresh, and significant — and still delivered WHAT when the mission promised WHY. Auditing the product against its stated purpose (not just against whether it works) is a distinct and necessary check. And the WHY line is exactly where hallucination can re-enter through the back door — fluent significance that isn't true — so grounding it in computable data, not the model's recall, is the safeguard.

## The transferable lesson
**Separate a content system's three jobs — discovery, verification, judgment — and assign each to the right mechanism:** an agent for discovery; **deterministic, data-grounded code** for verification and judgment; the human for taste. And, learned twice now: **prompt rules cannot compensate for missing data at the input layer.**

---

# CASE 3 — INSIGHTS: from static to context-aware, with disciplined fallback

*The shortest iteration — proof that not every problem is a six-round war, and that judgment about effort matters as much as persistence.*

## Problem statement
Insights (surprising tennis facts) were the most reliable feature but one-dimensional: evergreen-only, blind to live tennis. During a tournament, a relevant insight about that event engages far more than a random historical fact — but the agent had no **context** about live tournaments, and (discovered later) no **RAG dedup** wired in at all.

*Code:* `_run_generate_agent` in `generate_feed.py` (insights path); the tournament calendar it reasons over is defined in the same file.

## The iteration sequence

**Attempt 1 — Tournament awareness via the calendar (context engineering).**
*What was built:* Expanded the tournament calendar so the agent knew which events were active and could attempt tournament-flavored insights (both tours), with concurrent-tournament support (Stuttgart and 's-Hertogenbosch run simultaneously). This is **context engineering** — injecting structured world-state into the prompt so the model reasons over current reality, not just its training data.
*Result:* Worked in principle but surfaced two bugs: the calendar was incomplete (missing grass events) and the date logic mis-identified active tournaments — it claimed Halle and Queen's were active on June 11 when they didn't start until June 15.
*Lesson:* **Context quality determines reasoning quality.** An agent reasoning over a wrong calendar reasons wrongly — and confidently. The model wasn't the failure point; the **context** fed to it was.

**Attempt 2 — Fallback discipline with a quality comparison.**
*What was built:* When a tournament is active, try tournament-specific insights first; if the material is thin, fall back to evergreen — under an explicit rule that "a strong evergreen insight beats a weak tournament one."
*Result:* Correct behavior, but revealed that without the explicit comparison the agent had been *forcing* weak tournament angles when strong evergreen material was available.
*Lesson:* A fallback isn't just a safety net — it needs a quality bar deciding *when* to fall back.

**Attempt 3 — Fix calendar accuracy + close the silent RAG-dedup gap.**
*What was built:* Completed the calendar with verified dates and a correct "is today within start..end" filter; and — discovered during the RAG work (Issue #013) — wired `is_semantic_duplicate` into the insights path, which had silently never been connected (the **RAG dedup** existed only for news). This is why two near-identical Queen's Club insights were generated days apart ("WTA returns to Queen's after 50 years" and "Queen's first to host both ATP and WTA same year" — the same story, different words, exactly the **semantic** duplication string-matching can't catch).
*Result:* Insights now correctly identify active tournaments, prefer relevant angles, fall back to evergreen under a quality bar, and run the same **RAG dedup** as every other content type.

**Attempt 4 — Convert insights from trivia to because/therefore (Lever 2).**
*What prompted it (proactive):* The same mission-vs-product review that drove News Attempt 9. Insights are SUPPOSED to be the WHY layer (a surprising fact + its meaning), but many landed as trivia — a fact with no "so what" is still WHAT. "Queen's Club first hosted tennis in 1889" is a fact; it doesn't explain why it matters.
*What was built:* Insights now require a because/therefore structure — not "X is true" but "X is true, which is why Y." The fact is the setup; the WHY line is the payoff. Same grounding discipline and same length cap as the news change. Example: a flat statement that Grand Slam prize money doubled became a card landing on the consequence — the sport's commercial boom has accrued mainly to governing bodies, not players, grounded in the share math.
*Result:* Insights deliver the WHY they were always supposed to, instead of stopping at the fact.
*Lesson:* A fact is not an insight. The difference between trivia and an insight is the "therefore" — and requiring it structurally is what makes the content match the mission.

## The transferable lesson
**Context-awareness is only as good as the accuracy of the context, and every fallback needs a quality bar.** The dedup discovery reinforced a system-wide rule: **a capability added to one agent must be audited across all agents** — the RAG dedup built for news had silently never been wired into insights.

---

# CASE 4 — NEWS DISCOVERY: closing the ATP 500 / WTA 250 gap

## Problem statement
Halle Open and Queen's Club first-round match results were not appearing in the pipeline. The user could see them on Google News and YouTube, so the data existed — the pipeline just wasn't finding it.

## Hypothesis
The Google News RSS layer was too narrow in two ways: (1) a single generic query (`tennis+results+2026`) that doesn't surface tournament-specific coverage, and (2) a 6-source allowlist that excluded every publisher that actually writes ATP 500 R1 articles — Reuters, Eurosport, BBC Sport, tennismajors.com. Even if a good article appeared in the feed, the Tavily resolution step used a domain-restricted tool (`include_domains`) that couldn't fetch it.

## Solution
Three changes:

1. Added tournament-specific Google News queries — one per active tournament, derived at runtime from `TOURNAMENT_CALENDAR_2026`. No source filter; query specificity is the quality gate. FAQ/aggregation titles (`What are the X results?`) filtered before lookup so they don't consume the article cap.

2. Expanded `_GNEWS_ACCEPTED_SOURCES` from 6 to 12 publishers for the generic query (added BBC Sport, Guardian, Eurosport, tennismajors.com, Sky Sports, Sport.de).

3. Added `gnews_lookup_tool` — an unrestricted Tavily instance (no `include_domains`) used only for resolving GNews titles to content. URL-level dedup collapses the same article appearing from multiple sources. Tennis-relevance regex filters FIFA/World Cup false positives from ATP YouTube links.

## Result
Tiafoe d. Cobolli (Halle R1, Reuters roundup via Deadspin) now surfaces in the pipeline. The pipeline went from 0 tournament-specific articles to 1-2 per run. Other R1 results that don't get standalone articles (Altmaier, Tien) still don't appear — but that's correct: no publisher wrote text articles about those matches; only ATP Tour highlight video pages exist.

## The transferable lesson
**Generic queries + narrow source allowlists cover flagship outlets but miss the tail of ATP 500 / WTA 250 coverage**, which lands on wire services and specialist publishers. The right pattern for tournament coverage is: specific query (tournament name) + broad resolution (no domain restriction). The quality gate for broad resolution is query specificity, not publisher allowlisting. Also: `include_domains` on a Tavily tool is an invisible ceiling — it silently drops valid articles from any publisher not in the list, including Reuters.

---

## Post-implementation: cross-tournament contamination

### Problem statement
After shipping the title-parsing fallback, the pipeline surfaced articles about Vekic d. Raducanu (Queen's Club WTA final) and Raducanu's post-match reaction — events from a tournament that had already concluded. These appeared in the output despite the 48h date gate.

### Hypothesis
The 48h gate failed. Initial assumption: articles from a concluded tournament should be too old to pass.

### What actually happened
The 48h gate had not failed — it was working exactly as designed. Both articles were published June 14 (the day of the WTA final), well within 48h of June 16. The real failure was a **query boundary issue**: `"Queen's Club 2026 tennis"` is the query for the ATP Queen's Club (active June 15–21), but Google News returns articles from both the ATP and WTA events at the same venue. The WTA tournament (ended June 14) and the ATP tournament (started June 15) share the same name in search results. No existing gate distinguished them.

### Solution
One targeted check in the title-parsing fallback: require `pub_date >= tournament_start`. An article published before the queried tournament's own start date cannot be about that tournament. Articles published June 14 are dropped for the ATP Queen's Club query (which started June 15) but kept for the WTA Queen's Club query if that were active.

### Result
The WTA Queen's Club articles dropped cleanly. Remaining results: Tiafoe/Cobolli (Halle), Tien d. Schoenhaus (Halle), Shapovalov/Paul Day 1 wins (ATP Queen's Club, published June 15 — after the ATP start date). No false positives.

### Lesson
**Diagnose before assuming gate failure.** The instinct was "the 48h gate let through old events" — but the gate was correct; the source was wrong. The deeper failure was that a tournament name query (`"Queen's Club"`) was semantically ambiguous — it matched two different events at the same venue in consecutive weeks. The fix is structural: gate on the queried tournament's own date window, not just recency. Any system that queries by name rather than ID is vulnerable to this class of ambiguity.

---

## Post-implementation: why_source field/body decoupling

### Problem statement
A published card contained: *"The result marked Tiafoe's first top-10 win since 2024."* This is a recalled historical claim — match-by-match opponent ranking history across 2024-2025 is not in any pipeline data source. It passed the `why_source` validator cleanly.

### What actually happened
`why_source` is a citation forcing function, not a body validator. Its job is to make the model locate evidence *before* writing the WHY line. But the model writes the body and `why_source` in the same forward pass and treats them as independent fields. It wrote the historical claim in the body, then cited a different (computable) angle — `computable: stage/calendar` — in `why_source`. The validator accepted the computable declaration without checking whether it matched the actual claim in the body. The historical claim sailed through.

### Solution
Two targeted prompt changes:

1. **`why_source` field description rewritten** to make correspondence explicit: the field must back *the specific claim written in the final body sentence*, not just any WHY angle from the source. Verbatim: *"This field must correspond to the specific claim made in the final sentence of 'body'."*

2. **`computable:` explicitly forbidden for historical claims**: added rule that "first top-10 win since [year]", "career-best", "earliest X since Y" type claims must always be quoted verbatim from the source — `computable:` is not a valid declaration for them. If no verbatim quote exists, the model must rewrite the final sentence to use a computable angle instead.

3. **"first top-10 win since [year]" added to the common traps list** alongside "earliest result since [year]".

### Lesson
**A citation field only works if it's semantically coupled to the claim it's supposed to back.** `why_source` was designed as a forcing function but became a parallel field — the model satisfied it independently rather than using it to anchor the body. The fix is not more validation but tighter field semantics: the field description must name the specific output it corresponds to ("the final sentence of body"), and the rules must close the escape hatch (`computable:` not valid for historical claims). Without that closure, the model will always find a way to satisfy the form while violating the intent.

---

## Post-implementation: dual-marquee match scoring capped at single player

### Problem statement
After adding Giovanni Mpetshi Perricard to the marquee list (June 17), an investigation showed that his R1 Queen's Club match against Moutet — a three-set all-French thriller (6/7, 6/4, 7/6) — would score only **4** despite both players being on the marquee list. That's one below the significance threshold of 5, meaning the match result article would never have reached card generation.

### What actually happened
`score_story()` used `next()` to find marquee players in the title:

```python
marquee_hit = next((n for n in marquee_names if name_in_title(n)), None)
if marquee_hit:
    score += 4
    reasons.append(f"marquee ({marquee_hit})")
```

`next()` stops at the first hit. A match between two marquee players scored identically to a match involving only one — the second player's presence was silently ignored. A two-marquee matchup is inherently more newsworthy than a one-marquee story, but the scorer treated them as equal.

### Solution
Changed to iterate all marquee hits — first hit +4, each additional +2:

```python
marquee_hits = [n for n in marquee_names if name_in_title(n)]
marquee_hit = marquee_hits[0] if marquee_hits else None
for i, mh in enumerate(marquee_hits):
    pts = 4 if i == 0 else 2
    score += pts
    reasons.append(f"marquee ({mh})")
```

Moutet vs Mpetshi Perricard now scores 6 (PASS). Verified immediately: "Zverev digs in to oust Kopriva in Halle, equals Nadal's ATP record" jumped to [11] — top-10 (Zverev) +5, marquee (Nadal) +4, marquee (Zverev) +2 — confirming stacking works for stories that name multiple marquee players as context.

### Lesson
**`next()` on a scored dimension is a semantic bug: it answers "is there a marquee player?" instead of "how many?"** Whenever a scoring dimension can appear multiple times in a single item (two players in a match, two names in a headline), the scorer should aggregate, not short-circuit. The fix pattern: collect all hits with a list comprehension, then assign decreasing point values (first occurrence full weight, subsequent occurrences half weight). This also means adding a new player to the marquee list has an immediate, observable effect on real stories — a useful property for tuning the list iteratively.

---

# CROSS-CUTTING LESSONS (what a hiring manager should take from this)

1. **Diagnose to root cause, not symptom.** Every feature went through a symptom-patching phase before the real iteration began. The breakthrough each time was an **issue-tree** analysis that found the structural cause beneath the visible failures.

2. **Know when to stop patching and re-architect.** "A guardrail on a guardrail means the foundation is wrong" became a decision rule. The recap and news rebuilds both *removed* complexity — the signature of a correct architecture.

3. **Match the mechanism to the job.** LLMs for judgment and prose; **structured data and deterministic code** for facts, freshness, and significance; the human for taste. The recurring failure was asking an LLM to do a deterministic-data job.

4. **For time-sensitive factual content, structured/direct sources beat search indexes** — i.e. **ground** the model — proven independently in recaps (Apify) and news (RSS).

5. **Measure, don't assume — that's what evals are for.** The **eval harness** turned "the recaps feel better" into "explains-why 2.9 → 4.0." Live testing turned "RSS might help" into "RSS returned 12 of 14 vs the index's 2." (And: never let a model grade its own work uncritically — the **LLM-as-judge** runs with hostile framing.)

6. **A capability added to one part of a system must be audited across all of it** (the RAG-dedup-missing-from-insights bug).

7. **Honest output beats confident output.** Across all three features the target was a system that surfaces less but is trustworthy, rather than more but unreliable — because for a publication, **trust is the product.** Designing for **probabilistic failure** (assuming the model will sometimes be confidently wrong, and building deterministic gates around it) is the core discipline.

8. **Not every problem is a six-round war.** Insights took three focused iterations; recaps took six and a rebuild. Knowing how much effort a problem warrants is itself product judgment.

9. **A product can pass every technical test and still fail its mission.** The feed was accurate, fresh, deduplicated, and significance-scored — technically sound — yet still delivered WHAT when the mission promised WHY, which is why it read like a bot. Auditing the product against its stated purpose is a separate discipline from debugging it. The fix (a grounded WHY line at the same length) closed the gap proactively, before any user complaint forced it.

---

*Maintained as features iterate. Each significant new iteration appends an Attempt/Result/Lesson entry to the relevant case, keeping the development history a single coherent narrative rather than fragmenting across the issue and decision logs.*

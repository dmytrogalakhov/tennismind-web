# TennisMind — Product Decision Log

Strategic decisions, design pivots, and lessons learned that shaped the product direction. Different from the Issue Log (which tracks operational bugs).

---

## PDL-037: Deterministic quality hooks — move three quality rules from Tier 1 (prompt) to Tier 3 (code)

**Date:** 2026-08-06
**Trigger:** Course analysis (PrepGenAICerts — Agent SDK Hooks page) + recurring quality failures: hallucinated "Lucas Tien", vague-stat cards passing critique, Apify empty-name records reaching LLM

### Context

Several critical quality rules existed only in system prompts. Prompts fail at ~10–15% under production load. The Haiku critique gate is itself LLM-based and fails open on error — no deterministic backstop. Three specific failure patterns were traced to this gap:

1. Apify occasionally returns match records with empty winner/loser strings; LLM filled the gap from memory (hallucinated player names)
2. News card bodies contained stat language ("high win rate", "dominant serve performance") without a number — violating CLAUDE.md rule, not caught by Haiku
3. Same Tavily query fired multiple times in one cron run when recap enrichment and news research overlapped on the same story

### Decisions

**Hook 1 — `_validate_structured_matches()`**: PostToolUse on Apify data in `run_generate_recap()`. Drops records with empty winner/loser or missing sets_score before any LLM sees the data. If all records drop, fast-fails with no LLM spend.

**Hook 2 — `_validate_news_card_body()`**: Deterministic gate in `run_generate_news_from_queue()` after the critique loop, before `save_candidate()`. Enforces: body ≥ 40 words (truncation guard); stat keyword must be within 30 chars of a digit. Returns `(is_valid, reason)`; failed cards are logged and dropped.

**Hook 3 — `_TAVILY_CACHE` in `_tavily_results()`**: Tool call interception. Module-level dict keyed by raw query string. Same query in the same process run hits the cache, not the API. Transparent to all callers.

### Lesson

Hooks are the answer to "how do I prevent this specifically?" Prompts are the answer to "how do I describe the intent?" Both are needed — the prompt defines what good looks like, the hook enforces the parts where being wrong has a known shape that code can detect. A rule like "stat without a number" has a detectable pattern; it belongs in code, not in a prompt that the model will occasionally skip.

---

## PDL-036: Prediction cards — hard court palette + hard cap of 5 + deterministic priority gate

**Date:** 2026-07-13
**Trigger:** NBO QF day produced 14 prediction cards (expected 5); card design used generic AI-generated image instead of structured card format

### Context

The prediction pipeline had two separate problems discovered on the same day:

1. **14 cards instead of 5**: The `is_late_round` branch used `list(today_schedule)` with no cap, so a QF day with 14 scheduled ATP+WTA matches produced 14 cards. The cap (`top_n=8` → intended `5`) only applied in some code paths.
2. **Wrong card design**: The renderer only invoked the Wimbledon card for grass+Wimbledon specifically; hard court tournaments fell through to the generic AI image pipeline, producing mismatched visual identity.
3. **Match selection was LLM-only**: No deterministic gate meant the LLM could ignore high-interest matches in favour of narrative novelty.

### Decisions

**Hard cap of 5**: `_select_predictions(top_n=5)` replaces both `is_late_round` branches. Cap is universal — applies at QF, SF, Final, and early rounds.

**Deterministic priority gate**: `_is_priority(m)` runs before LLM selection. Priority = top-10 seed playing, OR Ukrainian player, OR SF/Final round. Priority matches fill the pool first; LLM picks from that pool by narrative value. Deterministic gate narrows; LLM picks the best stories from the narrowed pool.

**Hard court card** (`hardCourtPredictionCard.ts`): same layout as Wimbledon card, NBO/Cincinnati blue palette (`#005AAA` top bar, `#060E1A` background, `#4AA8FF` accent). Routed from `generate_feed.py` surface check: `surface == "hard"` → `_render_hard_court_prediction_card()`.

### Lesson

LLM match selection works for narrative framing but should never control which matches are covered — that's an editorial policy decision. Deterministic gates encode editorial policy; LLM chooses the best angle within the policy-approved pool.

---

## PDL-035: Tournament Recaps section added to home page and navigation

**Date:** 2026-07-13
**Trigger:** Recaps page launched; home page and nav did not link to it

### Decision

Added Tournament Recaps as a feature card in the "Built for tennis lovers" grid on the home page (after Tennis News). Added "Recaps" / "Recaps" / "Підсумки" nav link in all three dictionaries (EN/DE/UK) and `Navbar.tsx`.

---

## PDL-034: Orchestrator v2 — AGENT_REGISTRY, enumeration, brief per agent

**Date:** 2026-08-05
**Trigger:** Course analysis (PrepGenAICerts coordinator-subagent, narrow decomposition risk, subagent invocation, AgentDefinition config pages) surfaced three structural gaps in the v1 orchestrator

### Context

The v1 orchestrator was shelved as a portfolio artifact. It had the right topology (hub-and-spoke, isolated subagents) but the coordinator was Python `if/else`, not an LLM reasoning over agent descriptions. Three documented limitations remained unfixed:

1. Coordinator unaware of sub-agents' own rules — proposed "insights leveraging recent tournament matches" because it didn't know insights run from an evergreen pool between tournaments
2. Right answers reached via wrong reasoning — "no active tournament" instead of "we don't cover 250s"
3. Coordinator reasoning discarded at delegation — the plan said "recap" but the reasoning behind it never reached the recap agent

The course's AgentDefinition pattern (description + invoke_when + never_invoke_when per agent) and the subagent invocation principle (all required context must be explicitly passed) gave a concrete solution to all three.

### Decisions

**1. AGENT_REGISTRY dict** — formal descriptions for all 5 agents, formatted dynamically into the coordinator prompt. The LLM reasons over `invoke_when` / `never_invoke_when` rather than a hardcoded script. Fixes Limitation #1.

**2. Domain corrections encoded in registry** — two facts that were wrong in the design doc and would have caused bad coordinator reasoning:
- Recap covers *yesterday's* matches (cron runs at 08:00 before today's play begins)
- Predictions cover *today's* upcoming matches (not tomorrow's — generated in the morning for play later that day)

**3. Enumeration step** — coordinator must list every agent with a yes/no decision before committing to a plan. Cannot skip directly from context to plan. Directly addresses the narrow decomposition risk: the coordinator that decides "recap" without asking whether news is also warranted is a decomposition failure, not a subagent failure.

**4. Brief per agent** — plan output extended with a `brief` field (1-2 sentences of editorial framing). Brief is passed to `run_generate_recap(editorial_brief=...)` and injected into the recap writing prompt. Coordinator reasoning now travels with the task rather than stopping at the plan. Fixes Limitation #3.

### Impact

Live test output (Canadian Open, Day 6, unconfirmed match data):
- Correctly enumerated all 4 agent types
- Correctly skipped recap (unconfirmed data), insights (registry: "handled by 20:00 cron"), flash_alerts (registry: "fully automated")
- Correctly commissioned news with a specific brief: *"Lead with the most compelling off-court narrative... avoid retreading Draper (already published)... draw from 7 pending candidates"*
- Predictions correctly described as "--predict cron, not part of morning plan"

### What was deferred

Parallel execution (ThreadPoolExecutor for independent agent pairs) and post-agent quality gate — both require evals (roadmap 1.1). The quality gate without evals would only check "did the agent return output?" — trivial, doesn't need a coordinator.

### Lesson

Routing logic encoded in a Python script is invisible to the coordinator. The moment routing becomes a prompt — with explicit `invoke_when` and `never_invoke_when` per agent — the coordinator can reason about it, cite it, and apply it correctly. The same information in code vs. in a registry produces fundamentally different coordinator behaviour.

---

## PDL-033: News card format constraint — 3-4 sentences, not an article

**Date:** 2026-08-05
**Trigger:** First live test of agentic research loop produced a 4-paragraph, ~400-word card — more article than card

### Context

The `_AGENTIC_NEWS_SYSTEM` prompt instructed the agent to write "2-3 paragraphs of editorial analysis." With access to tool-sourced research data (H2H records, surface stats, tournament history), the agent used the space and produced thorough but oversized output. A standard TennisMind news card is 3-4 sentences, ~75 words.

### Decision

The body instruction was changed to: *"3-4 sentences only. What happened, why it matters, what comes next. Name specific players and consequences. No vague language. This is a card, not an article."* A matching rule was added: *"Keep the body tight — 3-4 sentences maximum."*

The quality bar is not length — it is specificity and angle. A 4-sentence card with a concrete H2H stat and a forward-looking consequence is worth more than a 400-word summary of what happened.

### Impact

The Draper re-test produced 4 sentences citing: exact scores, former world ranking (No. 4), Eastbourne H2H loss to the same opponent, six tournaments played in 2026, ranking outside the top 100. Same research depth, format-compliant output.

### Lesson

Agentic research increases the agent's knowledge. The output format still needs to be explicitly constrained — more information available does not mean more information should be printed.

---

## PDL-032: Agentic dedup threshold — keyword queries need a lower similarity floor

**Date:** 2026-08-05
**Trigger:** `check_memory` tool failed to catch a Draper story already published under a different headline

### Context

The pipeline dedup gate uses a 0.82 similarity threshold — calibrated for title-vs-title comparisons where the phrasing is close. The agent's `check_memory` tool passes its own keyword phrases (e.g. *"Jack Draper Canadian Open comeback defeat tears"*), not the original headline. The published card was titled *"Tearful Draper Exits Canadian Open on Emotional Return"* — semantically the same story, but the embedding similarity was 0.5979, below the 0.82 threshold. The duplicate passed through.

### Decision

`_tool_check_memory` uses a separate threshold of 0.60. The pipeline gate remains at 0.82. Two thresholds for two different callers: tight matching for deterministic pipeline comparisons, looser matching for agent keyword queries.

### Impact

Draper story now correctly detected as already covered at 0.5979 similarity. No false positives on unrelated queries (Alcaraz, Sinner, Swiatek) at the 0.60 threshold.

### Lesson

Dedup thresholds are not universal. They depend on what is being compared. When an agent paraphrases a query rather than passing the original headline, the expected similarity score drops — the threshold must account for that.

---

## PDL-031: Agentic news research loop — replace one-shot LLM generation with per-item research

**Date:** 2026-08-05
**Trigger:** Recognition that one-shot LLM evaluation produces competent wire copy but cannot do journalism — it processes what exists, not what the evidence suggests

### Context

The news pipeline used a one-shot LLM call: all surviving candidates were batched together, the LLM scored and wrote cards from article snippets alone. This produced correct but shallow output. The LLM had no way to verify a stat, follow a thread across two articles, or ask "what does this result mean given where the player was a month ago?" Those questions require a second and third search — which the pipeline never made.

The architecture question is not pipeline vs agent. It is *where in the pipeline to introduce agentic behaviour.* The deterministic gates (relevance, staleness, dedup, significance scoring) remain as pipeline — cheap, fast, debuggable, not the right place for LLM reasoning. After the gates, each surviving candidate goes through an agentic research loop where the LLM decides what to look up and in what order.

### Decision

Replace `generate_cards()` batch call with `_agentic_research()` per-item loop. Each candidate gets up to 6 tool-call iterations across 5 tools: `search_news`, `get_tournament_history`, `get_surface_form`, `get_h2h`, `check_memory`. The agent decides the sequence. It produces a card JSON or returns `None` (story dropped after research). The rest of the pipeline — Telegram queue, human review — is unchanged.

Six tools are narrow and specific by design. Generic tools (`get_player_stats`) force the agent to reason about what to do with a blob of data. Specific tools (`get_surface_form`, `get_tournament_history`, `fetch_url`) give the agent pre-structured answers to the exact questions a journalist would ask. `fetch_url` was added after the initial 5-tool build: discovery produces only snippets, and the agent was researching context around stories it hadn't fully read.

### Impact

Live test on Draper/Canadian Open: agent made 7 tool calls across H2H, surface form, tournament history, two search queries, and memory check. Card cited facts not present in the original snippet — Eastbourne H2H loss to the same opponent, ranking collapse out of top 100, six tournaments played in 2026. That context required research; it could not have been produced from the snippet alone.

### Lesson

The pipeline/agentic split is a design decision, not a technology choice. Deterministic gates are better as pipeline — they are cheap, parallelisable, and their failures are easy to diagnose. Exploratory tasks (what does this mean? what context is missing?) are better as agentic — the agent needs to follow the evidence, not execute a script. The discipline is knowing where the handoff belongs.

---

## PDL-030: Grand Slam news cutoff — recap covers final results, not news discovery

**Date:** 2026-07-13  
**Trigger:** Wimbledon final day — user received Sinner/Zverev news cards in Telegram after manually clearing the queue; a new discovery run refilled it from the 6-query GS bucket

### Context

When a Grand Slam is the active tournament, `build_news_queries()` generates a 6-query Grand Slam bucket (results, human interest, incidents). On final day (e.g. Wimbledon July 13), these queries surface the men's final result stories — which then pass all gates and get queued. The `--news` cron generates cards from them and they go to Telegram.

The problem: the recap agent already covers tournament results comprehensively. Running news discovery for the same match creates duplicate coverage and sends redundant Telegram cards the user doesn't want.

### Decision

1. **Calendar end date = day of women's final, not men's final.** Wimbledon changed from `2026-07-13` → `2026-07-12`. On men's final day (July 13), Wimbledon is "recently concluded" rather than "active" — the 6-query GS bucket never fires.

2. **Exclude Grand Slams from `concluded_queries`.** `build_news_queries()` generates a `"[Name] final result champion"` query for recently-concluded tournaments. Grand Slams are now excluded: the recap agent owns GS final coverage; news discovery should not duplicate it.

### Impact

- Post-GS final day: zero Wimbledon queries in discovery, 3 generic tennis queries instead
- Recap agent skips cleanly when no active tournament is found — no stale coverage of concluded events
- Pattern applies to all future Grand Slams (Roland Garros, US Open, Australian Open)

---

## PDL-001: LLM for reasoning, database for facts

**Date:** April 2026
**Trigger:** Racket finder showed wrong prices, stiffness, and tension values

### Context

The racket finder initially let the LLM generate all output including specs. It showed €200-260 for a racket priced at €150-200 in the database, 71 RA stiffness instead of 66 RA, and wrong string tension values. Multiple prompt engineering attempts ("CRITICAL: use exact values from database") failed — the LLM consistently overrode database values with its own training knowledge.

### Decision

Stop trusting the LLM for any factual data. After the LLM returns its recommendation (which racket and why), look up specs directly from the database and render them on the frontend. The LLM generates ONLY:

- Which racket to recommend (the name)
- "Why it suits you" explanation
- "Key strengths" bullet points
- "Worth knowing" tip

Everything else (price, weight, stiffness, balance, string pattern, tension) comes from the database.

### Impact

Zero spec errors since implementation. This pattern became a core product principle applied to every feature: the AI reasons, the database provides facts.

### Lesson

This is likely the most transferable insight from TennisMind. In any domain where factual accuracy matters (tax, finance, healthcare, legal), you cannot trust an LLM to reproduce known facts reliably. Architecture must enforce the separation.

---

## PDL-002: Pivot from "ask and answer" to "discover without asking"

**Date:** May 2026
**Trigger:** Prototype validation feedback — "Why wouldn't I just ask ChatGPT?"

### Context

During validation, the most common feedback on the match analysis and racket finder was: "I could just ask ChatGPT this." For generic questions, users are right — ChatGPT gives a solid answer. The racket finder wins on structured elicitation and domain expertise, but users didn't perceive the difference as enough to switch tools.

Meanwhile, the insight cards (surprising tennis stats, gear stories, historical patterns) got significantly more engagement — likes, shares, and comments. Users said things like "I didn't know that" and "where do you find this stuff?"

### Decision

Pivot the core value proposition from "ask TennisMind a question" to "TennisMind shows you interesting things without you asking." This means:

- Feed/insights become the primary engagement driver (daily habit)
- Racket finder remains a strong utility tool (occasional use)
- Match analysis becomes a bonus feature (during tournaments)

Nobody opens ChatGPT to browse interesting tennis stats over morning coffee. That's the wedge.

### Impact

Led to building the autonomous insights agent, the news agent, the daily cron pipeline, and restructuring the homepage to lead with News and Insights instead of Match Analysis and Predictions.

### Lesson

AI products don't compete with AI models on "ask and answer." They compete on curation, editorial voice, and structured delivery. The value isn't in having a better model — it's in knowing what questions to ask before the user does.

---

## PDL-003: Curation prompt rewards "safe" stories over interesting ones

**Date:** May 2026
**Trigger:** News agent consistently finding stats/records instead of human interest stories

### Context

The news agent was finding stories like "Sinner extends winning streak to 34" — factually correct but boring. Meanwhile, genuinely interesting stories (Monfils organizing an exhibition at Roland Garros with Djokovic, Sinner, Shelton) were being missed. The curation prompt said "find interesting tennis news" but the LLM interpreted "interesting" as "statistically notable."

Stats are easier for LLMs to identify as "interesting" because they're quantifiable. Human stories require cultural understanding of what makes tennis fans care.

### Decision

Rewrote the news curation prompt to explicitly prioritize story types in this order:

1. Human stories and off-court moments (farewells, exhibitions, emotional scenes)
2. Upsets and dramatic results
3. Records and milestones (only if genuinely historic)
4. Player drama (boycotts, protests, rivalry moments)
5. Behind-the-scenes stories

Added negative instructions: skip routine wins, old results, generic previews. Added the key test: "A story that makes the reader say 'oh that's cool, I wish I'd seen that' is 10x more valuable than 'top seed wins again.'"

### Impact

Too early to measure — implemented during Roland Garros 2026. The hypothesis is that engagement (likes, shares, click-throughs) will increase with more human-interest content.

### Lesson

LLM curation prompts need explicit priority ordering, not just "find interesting things." What an LLM considers interesting (quantifiable, verifiable) differs from what humans find interesting (surprising, emotional, cultural). The prompt must encode editorial taste, not just editorial standards.

---

## PDL-004: Image strategy by content type

**Date:** May 2026
**Trigger:** DALL-E generating wrong venues, generic tennis scenes, and inconsistent styles

### Context

Early image generation used one generic prompt for all card types: "create a tennis-related illustration." Results were inconsistent — a card about Rome showed the Eiffel Tower, player-specific cards showed generic figures, gear cards showed action scenes instead of rackets.

Attempted AI background removal (rembg) for racket photos — it destroyed grip and string pixels. Attempted simple pixel threshold removal — it removed white from the racket itself.

### Decision

Implemented a three-tier visual identity:

1. **News cards:** real photographs provided manually. No AI generation. Journalistic style.
2. **Insight cards:** AI-generated illustrations via gpt-image-1 using retro French poster aesthetic. Subject varies by card type (player silhouette, product hero, venue, trophy) but style stays consistent.
3. **Match analyses:** code-generated SVG stat graphics. No AI, no photos. Clean dark data-focused design.

Added an art director layer (Sonnet) that extracts venue, city, and landmarks from card content before building the DALL-E prompt. Added prompt logging for debugging.

### Impact

Image relevance improved significantly. Tournament cards now show correct venues. The consistent retro French poster style became a recognizable TennisMind visual identity.

### Lesson

"Generate an image" is not a product feature. "Generate the RIGHT image for THIS content in THIS style" is. The gap is filled by classification → routing → structured prompting → review, not by better models.

---

## PDL-005: Split news and insights into two separate agents

**Date:** May 2026
**Trigger:** Insights agent kept finding news instead of evergreen content

### Context

The single feed agent searched for "tennis interesting stats facts today" and consistently returned current news (match results, tournament updates) rather than the evergreen insights that users engaged with most. The top-performing cards ("40% of ATP Top 100 came from multi-sport backgrounds", "65% of tennis fans hold a college degree") were manually created — the agent never found content like this because its search queries were date-stamped.

### Decision

Split into two completely separate agents with different:

- **Search queries:** insights use research-focused queries without dates; news uses time-sensitive queries with today's date
- **Curation prompts:** insights prompt rejects current events; news prompt prioritizes them
- **Image strategies:** insights use DALL-E; news uses manual photos
- **Approval flows:** insights have two-step (text + image); news has one-step (text + manual photo)
- **Candidate folders:** feed-candidates/insights/ and feed-candidates/news/
- **Website pages:** /feed for insights, /news for news
- **Review commands:** --review-insights and --review-news

### Impact

Clean separation of concerns. Each agent can be optimized independently. Insights searches now target the right content type.

### Lesson

When one pipeline tries to serve two different content needs, it optimizes for the easier one (news is easier to find than evergreen insights). Splitting the pipeline forces each agent to be good at its specific job rather than mediocre at both.

---

## PDL-006: Tournament-aware search

**Date:** May 2026
**Trigger:** News agent finding old Rome results during Roland Garros week

### Context

During Roland Garros, the news agent's generic queries ("ATP WTA tennis news today") were still returning Italian Open recaps instead of Roland Garros stories. The agent had no concept of the tennis calendar and couldn't prioritize the current tournament.

Additionally, even when the agent found the right tournament stories, the analysis was vague and dramatic rather than specific and useful. A card about Alcaraz's withdrawal said "creates massive power vacuum in men's draw" — CNN-style language that tells the reader nothing specific. A TennisMind card should say exactly who benefits, who is now the favorite, what the concrete draw implications are with named players and numbers.

### Decision

Added a tournament calendar to generate_feed.py with dates for all major 2026 tournaments. A `get_current_tournament()` function checks what tournament is currently running (including the week before for buildup stories).

**News agent (hard focus):** All queries are rewritten to include the tournament name. No generic fallback query. Curation prompt gets: "DURING {name}: Only cover stories related to {name}. Ignore all other ATP/WTA news. If nothing interesting happened at {name} today, return 0 cards."

**Insights agent (soft preference):** 3 tournament-specific queries (history, records, traditions) + 2 random evergreen queries each run. Curation prompt gets: "DURING {name}: Prefer insights related to {name} or its history, but don't reject a genuinely great evergreen insight just because it's not tournament-related."

Also added a rule to the news curation prompt rejecting vague dramatic framing ("creates a power vacuum", "shakes up the draw", "sends shockwaves"). Every news card must explain the specific implications: who benefits, who is now the favorite, what changes for named players. "Alcaraz withdraws, creating a power vacuum" is lazy. "Alcaraz withdraws — Musetti and Ruud become top seeds in his quarter, and Djokovic now has a clear path to the final" is useful.

### Impact

News agent immediately started finding Roland Garros-specific content. Hard focus for news (return 0 if nothing interesting) prevents low-quality filler during quiet tournament days. Insights agent surfaces Roland Garros history and records while not losing access to great evergreen content.

### Lesson

News and insights need different levels of tournament focus. News should be exclusively about the active tournament — that's what readers expect during a Slam. Insights can be tournament-flavored but shouldn't be constrained to it, since the best evergreen facts are timeless by definition. Hard vs soft focus is the right distinction.

---

## PDL-007: Recap accuracy over completeness

**Date:** May 2026
**Trigger:** Day 2 Roland Garros recap included matches from Day 1, missed Monfils' farewell, and listed wrong players

### Context

The Day 2 recap card contained five factual errors: it included Zverev and Djokovic results from Day 1, missed Monfils' last-ever Roland Garros match, included Snigur and Baptiste results from the wrong day, and buried Wawrinka's farewell at the bottom of the card. Root cause: Tavily searches return articles from the past 48-72 hours without clear day boundaries, and the LLM couldn't distinguish Day 1 from Day 2 results.

### Decision

Implemented four reliability mechanisms:
1. Date verification as the first rule in the prompt — if unsure which day a match was played, exclude it
2. Deduplication — read all previously published recaps, pass them to the prompt, and explicitly forbid repeating covered matches
3. Priority reordering — farewell matches are always the lead story, above upsets and top seeds
4. Quality check — a second Haiku call after generation verifies no duplicates or date-uncertain matches made it through

Core principle: "Accuracy over completeness. A 100-word recap with 4 verified results beats a 200-word recap with 2 wrong ones."

### Impact

Adds ~$0.01 per recap (one extra Haiku verification call). Eliminates the class of errors that most damages trust in a daily sports content product.

### Lesson

When an AI agent operates on time-sensitive data (yesterday's results vs today's), the prompt alone cannot ensure temporal accuracy — the search results themselves mix timeframes. You need structural guardrails: deduplication against known-good published content, explicit date verification rules, and a second-pass quality check. Trust but verify applies to LLM outputs just as much as to human work.

---

## PDL-008: Search for editorial articles, not score pages

**Date:** May 2026
**Trigger:** Recap agent returned "matches still in progress" despite full day of completed matches

### Context

Tavily was scraping live score pages (rolandgarros.com/matches, wtatennis.com/scores, flashscore.com) which are JavaScript-rendered and return garbled HTML — image tags, navigation fragments, and scores formatted as "3 6 3 4" instead of readable match results. The LLM received garbage input and produced a generic "matches still in progress" response despite dozens of completed matches.

### Decision

Changed search queries from targeting score pages to targeting editorial recap articles from sites like ESPN, Tennis.com, The Guardian. These produce clean, parseable text with match context and narrative. Added a content quality filter that strips results with excessive HTML artifacts or under 100 characters of actual text.

### Impact

Recap agent immediately started producing accurate, narrative-rich match summaries. The quality filter also improved results for the news and insights agents by removing low-signal search results.

### Lesson

Not all web content is equal for AI consumption. JavaScript-rendered score pages look perfect in a browser but return garbage through search APIs. Editorial articles are less structured but far more parseable. When building AI pipelines that depend on web search, optimizing which SOURCES you target matters more than how you prompt the LLM downstream.

---

## PDL-009: Prediction card prompt — from stat dump to editorial opinion

**Date:** May 2026
**Trigger:** First prediction card (Djokovic vs Fonseca) read like a betting preview, not a TennisMind card

### Context

Built a match prediction feature for Roland Garros. First version produced stat-heavy output: "Djokovic has a 39.5% return points won rate on clay and a 41.6% breakpoint conversion rate. Fonseca's first serve percentage dropped to 58%." Technically accurate but unreadable — felt like a spreadsheet, not an editorial take a tennis fan would want to read in a feed.

### Iteration 1: Basic prompt

Prompt asked for "WHY X WINS, WHY Y COULD UPSET, KEY MATCHUP, PREDICTION" with four separate sections. Result: too long, too structured, overloaded with stats. Every claim backed by a percentage. Read like a betting analyst's report.

### Iteration 2: Added style constraints

Added rules: "max ONE stat per card, prefer narrative over numbers, sound like a smart tennis friend." Result: improved significantly — fewer numbers, more readable. But still opened with generic phrases like "fascinating clash" and included report-like language ("six hours already spent on court through two rounds").

### Iteration 3: Structural constraint + examples

Reduced to exactly 4 sentences with specific jobs:
1. Matchup dynamic — why this match is interesting
2. Upset path — how the underdog wins
3. Favorite's edge — why the favorite prevails
4. Final call — punchy one-liner ("Djokovic in four")

Added a GOOD and BAD example directly in the prompt. Added ban on generic openers ("fascinating clash", "exciting matchup"). Added ban on betting language.

### Final output

"Djokovic's tactical control meets Fonseca's raw power, with the Brazilian riding big momentum after his comeback against Prizmic from two sets down. Fonseca can make this uncomfortable if he starts fast, keeps the rallies short, and keeps swinging freely, especially with Djokovic showing some physical wear after a long opening week. But Djokovic's clay-court experience and ability to absorb pace should matter more as the match wears on. Djokovic in four sets."

### What changed between versions

| Aspect | V1 | V3 |
|---|---|---|
| Length | 200+ words, 4 sections | 4 sentences, ~60 words |
| Stats | 5-6 percentages per card | Maximum 1, only if essential |
| Tone | Betting analyst | Smart tennis friend |
| Structure | Free-form with headers | Rigid 4-sentence framework |
| Opening | "Fascinating clash" | Specific matchup dynamic |

### Decision

Locked the V3 prompt with:
- 4-sentence rigid structure (each sentence has a defined job)
- Good and bad examples embedded in the prompt
- Explicit bans: no generic openers, no stat dumps, no betting language, no hedging
- "Sound like a smart tennis friend making a call" as the core voice directive

### Lessons learned

1. **Structure beats instruction.** Telling the LLM "use fewer stats" doesn't work reliably. Telling it "write exactly 4 sentences, each with a specific job" works every time. Constraining the format constrains the content.
2. **Examples are 10x more effective than rules.** The BAD example ("39.5% return points won") taught the LLM more about what to avoid than five lines of "don't use too many statistics."
3. **Prompt iteration follows the same loop as product iteration.** Ship → observe → diagnose → fix → ship again. The first version is never the final version — and that's fine. The skill is in knowing what to change.
4. **The AI generates 80%, the human polishes 20%.** The final published card was a human edit of the AI output — tightening phrases, removing generic language. This is the right workflow for editorial AI: machine drafts, human sharpens.
5. **Generic openers are the most common LLM crutch.** Banning "fascinating", "exciting", "intriguing" forces the model to describe the ACTUAL matchup. This single rule improved every subsequent prediction.

---

## PDL-010: Rebuilding the recap pipeline on structured data — from LLM extraction to a sports API

**Date:** May 2026
**Trigger:** Seven consecutive days of recap failures during Roland Garros, culminating in published hallucinations

### Context

The daily tournament recap was the single most failure-prone feature in TennisMind. Over one week of Roland Garros it produced a steady stream of errors despite repeated fixes:

- Day 2: included Day 1 results, missed Monfils' farewell, buried Wawrinka's farewell
- Day 4: missed Djokovic's loss (the day's biggest story), missed a lucky-loser run, included a routine win instead
- Day 5: published Sinner "winning" the day AFTER he was eliminated, and Alcaraz "advancing" despite having withdrawn weeks earlier — both fully fabricated
- Day 6: missed the top seed's elimination, missed a retiring player's win, mislabeled opponents
- Day 7: recapped the wrong day's matches entirely, with wrong opponents

### The architecture that was failing

The original recap pipeline was: Tavily web search → Sonnet reads raw article text → Sonnet extracts results AND writes the recap in one step. The fundamental flaw: it asked an LLM to extract precise, date-bounded match results from unstructured article text. But tennis recap articles don't cleanly separate days — an article published on Day 7 might recap Days 5-6, preview Day 7, and summarize a player's whole tournament run. The LLM couldn't reliably tell "this happened yesterday" from "this happened earlier this week."

### The patching trap

Each failure got a patch:
1. Anti-hallucination rule ("return INSUFFICIENT_DATA if unsure")
2. Cross-reference against published content (to catch eliminated/withdrawn players)
3. Structured fact extraction step (Haiku extracts a match list before Sonnet writes)
4. Confidence scoring (high/medium/low per extracted match)
5. Expanded retiring-players list + dedicated storyline queries + strict priority tiers
6. Dedicated per-top-seed searches

Six patches, each addressing a real symptom, none addressing the root cause: the source data was unstructured and undated. When a system needs a guardrail on top of a guardrail on top of a guardrail, the architecture is wrong, not under-patched.

### The decision

Stop patching. Replace the data source. Move from "LLM extracts results from articles" to "LLM writes from a structured results feed."

New architecture:
- **Apify Flashscore scraper (statanow/flashscore-scraper-live)** as the structured source — returns yesterday's finished matches as clean JSON: winner, loser, set score, game-by-game detail, tour
- **Tavily demoted to enrichment** — used only to add tactical context (how a match was won) for the 3-4 marquee matches, never as the authority on what happened
- **Sonnet writes from verified data only** — it can no longer hallucinate a match because it only sees a structured list of real results
- **Haiku verification kept** as a cheap final safety net
- **Human review unchanged**

### Four principles that governed the rebuild

1. Structured results data as the primary recap input
2. Tavily for enrichment, not authority
3. The LLM only after the match set is already correctly bounded by date
4. Human review for final editorial polish

### What the rebuild deleted

The structured source made three entire subsystems unnecessary — they had existed only to compensate for unstructured input:
- The structured fact extraction step (data arrives pre-structured)
- The confidence scoring filter (structured data is either there or not)
- The cross-reference-against-published-content filter (no longer needed — the feed only contains real, finished matches)

The rebuild removed more code than it added. That was the signal it was the right architecture.

### The path was not clean

The rebuild itself took several iterations:
- First attempt used the wrong Apify actor (extractify-labs/flashscore-tennis-matches), which only returns today's schedule with no historical parameter
- Discovered the correct actor (statanow/flashscore-scraper-live) by checking which actor the manual test had actually used
- Found the actor's parameters were simple (Sport: Tennis, Days: Yesterday), not the complex ones initially assumed
- Data inspection revealed 51 of the "SINGLES" results were junior draws (Boys/Girls) that would have contaminated the recap — the filter had to require "ATP" or "WTA" in the league string, not just "SINGLES"
- Discovered game-by-game scores were available in a nested history array, eliminating the need for Tavily to supply scores at all

### Cost discipline during the rebuild

The recap was also the most expensive feature (multiple Sonnet + Haiku calls per run) and repeated debugging runs were burning Anthropic credits. The rebuild was staged deliberately: fetch and print raw Apify JSON FIRST, confirm the data is correct, and only THEN wire in the expensive LLM processing. Cheap checks before expensive steps.

### A later refinement: omitting seeds

Even with structured data, one field was unreliable: seedings. The data source didn't include them, and when Sonnet added them from its own knowledge it sometimes got them wrong. A wrong seed ("No. 5 Swiatek" when she's No. 3) is a credibility hit. Decision: omit seed numbers entirely. "Kostyuk stunned Swiatek" is accurate and compelling; "No. 15 Kostyuk stunned No. 5 Swiatek" with wrong numbers damages trust. Drop what you cannot verify.

### Lessons learned

1. **When you're adding a guardrail to protect a guardrail, the foundation is wrong.** Six patches to the extraction pipeline were treating symptoms. The disease was unstructured input. Stop patching and fix the foundation.

2. **Match the data source to the job.** Asking an LLM to extract precise, dated facts from prose that mixes timeframes is using the wrong tool. Structured data eliminates an entire class of errors by construction, not by prompting.

3. **The right architecture deletes complexity.** If a redesign adds more layers, be suspicious. This one removed three subsystems. Simpler AND more reliable is the signal you've found the real fix.

4. **Inspect raw data before processing it.** Printing the raw JSON caught the junior-draw contamination before it reached the LLM, and confirmed the dates were correct before spending credits. Cheap checks before expensive steps.

5. **Knowing when to stop is a senior skill.** The hardest part wasn't building the fix — it was recognizing that the seventh patch would fail like the first six, and that the problem was architectural. Patching feels like progress; re-architecting feels like admitting failure. The opposite is true.

6. **Even structured sources have unreliable fields.** Seeds were missing/wrong. The principle held: include only what you can verify, omit the rest. Reliability comes from discipline about what NOT to publish.

---

## PDL-012: Semantic memory (RAG) to give content agents recall

**Date:** June 2026
**Trigger:** Issue #011 — the news agent regenerated already-published and even manually-deleted cards because it had no memory of its own output

### Context
Content agents generated in isolation with no memory of what already existed. The mitigation was exact-string matching against the content folder — brittle, because it only caught identical wording. "Zverev wins Roland Garros" and "Zverev breaks through in Paris" are the same story; string matching treated them as different and regenerated the duplicate.

### Decision
Add a retrieval-augmented memory layer. Every published or rejected card is embedded (OpenAI text-embedding-3-small) and stored. Before generating, the agent embeds the candidate and runs a semantic similarity search against memory; near-duplicates above a calibrated threshold are blocked.

### Deliberate implementation choices
- **Embeddings via API, retrieval by hand.** The vector store and cosine-similarity search were implemented directly in NumPy rather than using a vector database (Chroma/Pinecone). Reason: understanding over convenience — and at hundreds of items, a flat-file store with in-memory cosine similarity is more than sufficient. Sizing infrastructure to the data, consistent with PDL-010.
- **Scope: v1 = news-agent dedup only.** Continuity and other agents deferred. Prove the retrieval loop on the highest-pain case first.
- **Rejections are remembered too.** A deleted card is stored as "rejected" so it is never regenerated — the direct fix for the Issue #011 symptom.

### Threshold calibration
0.82 similarity threshold. Confirmed: a near-duplicate scored 0.86 (blocked); an unrelated pair scored 0.48 (passed). Tunable as results accumulate.

### Scope boundary (carried from PDL-010)
RAG solves "have we said something like this" — a retrieval problem. It does NOT solve "what are the authoritative facts of yesterday's matches" — that remains structured data (Apify). The boundary is deliberate: retrieval for memory, structured data for facts.

### Result
The news agent stopped regenerating covered/deleted stories and began surfacing genuinely new material (e.g. ranking-movement stories in the grass-season window). Issue #011 resolved at the mechanism level, not patched.

### Lessons
1. Semantic memory beats string matching wherever "similar" matters more than "identical."
2. Building retrieval by hand (vs. a library) was worth it for understanding — and sufficient at this scale.
3. Every generative agent eventually needs memory of its own output; this is the reusable primitive.

---

## PDL-011: What is "news" for TennisMind? (open strategic question)

**Date:** June 2026
**Status:** Open — deferred pending Wimbledon

### The question
The news agent is consistently the weakest content producer (see Issue #011). Each fix improves it incrementally, but a deeper question keeps surfacing: should TennisMind produce straight news reporting at all?

### The tension
TennisMind's mission and differentiator is explaining WHY things matter, not just WHAT happened — the curated, contextual, craft-driven content (articles, insights) that X/Twitter doesn't provide. Straight news is the OPPOSITE of that: it's the most commoditized content type, where X and dedicated tennis media are faster and broader. News is the one feature competing head-on with free, instant alternatives — the same trap identified for recaps.

### Options
1. **Fix-and-keep:** continue improving the news agent as straight reporting (current path — Issue #011 fixes). Accepts that news will likely remain the weakest feature.
2. **Reframe as news-as-insight:** stop trying to match the news wire. Produce fewer, deeper cards that take a current development and explain what it MEANS in the TennisMind voice — turning news into a differentiated, on-mission product rather than a commodity feed.
3. **Cut news:** drop the feature, redirect energy to articles and insights (the genuinely differentiated content).

### Leaning
Option 2 is most aligned with the mission, but unproven. Decision deferred until after observing news performance through Wimbledon (a live tournament, where news has more raw material and the agent's tournament-mode is stronger). Revisit then: if news still underdelivers relative to effort even during a Slam, commit to Option 2 or 3.

### Why this is logged
The recurring weakness of one feature is itself a strategic signal. The instinct to keep patching a commodity feature instead of questioning whether it fits the product is the same trap as the recap over-patching (PDL-010). Logging the question prevents drifting into "fix forever" without ever deciding what news is for.

---

## PDL-013: Telegram editorial workflow — plan approval, save-for-later, and lifecycle-aware dedup

**Date:** June 2026
**Trigger:** Telegram review flow lacked a "save for later" action, plan messages had no interactivity, and un-actioned candidates were invisible to the RAG dedup system.

### Context
The Telegram review flow had only Publish / Reject. Missing a "save later" option meant any card the editor wanted to revisit had to be either rejected (losing it) or left unactioned, with no way to signal intent. The morning orchestrator plan was sent as a read-only message — the editor had to switch to a terminal to approve or skip. And any card sitting in the "sent" state (awaiting a decision) was in no memory index, so the next generation run could regenerate the same card.

### Decision
1. **Added "📅 Later" as a third Telegram button** (callback `later:{sid}`). Status becomes `saved_later` in the queue. A `--include-saved` flag on `--send-pending` lets the editor resurface saved cards.
2. **Wired plan approval into Telegram.** The morning plan message now carries `[✅ Run Plan] [❌ Skip Today]` buttons. Tapping ✅ triggers background generation via `asyncio.create_task()` — non-blocking, listener stays live. The plan queue (`data/tg-plan-queue.json`) tracks plan state.
3. **Closed the lifecycle gap in RAG dedup.** Cards sent to Telegram are now written to memory with `status="pending"` immediately on send (in `_send_all_pending`, after a successful Telegram send). The reject handler was fixed to parse the card file BEFORE deleting it (the parse-after-delete bug meant rejected cards were stored with the slug as title, not the real title). Publish and reject handlers flip the status to "published" / "rejected" using the upsert `update_memory_status()` function, so no duplicate entries are created.

### Impact
- An un-actioned card now blocks regeneration of the same story — the lifecycle gap that caused three duplicates in one morning (Issue #013) is closed.
- The editor can approve the day's generation plan without leaving Telegram.
- A "save for later" shelf exists for cards the editor wants to reconsider.

### Lesson
A content platform's dedup system is only as good as its lifecycle coverage. "Published or rejected" is not exhaustive — the in-flight state between generation and decision is a gap that accumulates fast and silently. Instrument every state transition that matters to recall, not just the terminal ones.

**Follow-up (PDL-014):** The plan-approval button in item 2 above was removed — see PDL-014.

---

## PDL-014: Remove orchestrator plan-approval gate

**Date:** June 2026
**Trigger:** The plan-approval tap (✅ Run Plan / ❌ Skip Today) added friction without adding value. The orchestrator's smart scheduling (LLM reasoning + guardrails) already produces a trustworthy plan; requiring a manual tap before generation just delays the morning cards by however long it takes to open Telegram.

### Context
PDL-013 added plan-approval buttons so the editor could veto the day's generation before it ran. In practice, the plan had never been wrong enough to skip, and the tap was never used as an override — it was just a gate. Meanwhile it blocked generation until the editor woke up and opened Telegram, shifting the first cards from 7 AM to whenever the tap happened.

### Decision
Remove the plan-approval gate. The orchestrator now:
1. Sends a plain FYI message ("Generating: news + insight. Skipping: recap.") — transparent, no tap required.
2. Runs generation immediately after.
3. Cards arrive in Telegram with the usual ✅/📅/🗑 buttons for card-level approval.

Kept: `--plan` flag for on-demand reasoning inspection. The editor still controls every card; they just no longer control whether generation runs at all (the orchestrator is trusted to make that call).

### Impact
Cards arrive earlier. The morning workflow is simpler: wake up to approval-ready cards, not a pending plan button. The transparency is preserved (FYI message) without the friction.

### Lesson
Approval gates are only worth the friction if the editor would actually veto. If a gate has never been used to say "no," it's a delay, not a control. Move approval to the granularity where it genuinely matters — individual cards — not the meta-decision of whether to generate at all.

---

## PDL-015: Multi-candidate generation — up to 3 per run, quality-gated

**Date:** June 2026
**Trigger:** Generation was producing 1 candidate per run even though prompts allowed 3. The cause was narrow search coverage (all queries about one tournament) and no instruction to produce distinct stories.

### Context
News and insights agents each ran 5-6 search queries but all queries clustered around the same tournament or topic. Sonnet would correctly find 1 interesting story rather than produce 3 variants of the same one. The result was 1 candidate per run — far below the potential 3.

### Decision
1. **Restructured search queries for guaranteed topic diversity.** News: 3 buckets (results / human-off-court / incidents), 2 queries sampled per bucket = 6 distinct-topic queries. During grass week with multiple active events, one result query per active event so Stuttgart, Halle, and Queen's Club all get coverage. Insights: 7 queries guaranteed across 5 topic buckets (stats, business, gear, history, training) plus max 2 tournament-specific.
2. **Widened content window** from 14,000 to 22,000 chars so more diverse sources reach the model.
3. **Sharpened the "distinct stories" rule** in both prompts: produce 3 cards only if 3 genuinely different stories exist; never pad with 3 angles on the same story.
4. **Added within-batch pairwise dedup** (`_deduplicate_within_batch()`): after Sonnet returns cards, embed all of them and run pairwise cosine similarity at the same 0.82 threshold. Near-duplicates within the batch are dropped before the memory check runs.

### Impact
News: Sonnet returned 3 candidates from multi-tournament grass week queries; 1 correctly blocked as memory duplicate (Udvardy story already rejected), 2 distinct cards saved.
Insights: 3 distinct cards generated and saved (Stuttgart history, Queen's Club history, Murray's Queen's record).

### Lesson
Search query diversity is upstream of LLM output diversity. If 6 queries all cover the same story, the model can't produce 3 distinct cards no matter how the prompt is worded. The fix isn't a better prompt — it's ensuring the search basket actually contains material for 3 different stories.

---

## PDL-016: News discovery rebuild — date-aware search + deterministic significance scoring

**Date:** June 2026
**Trigger:** Issue #014 — news agent producing stale, insignificant, and false cards despite multiple prompt-level patches

### Context
After five rounds of patching (query pivots, dedup, freshness rules, significance filter, multi-candidate), news quality remained the weakest content type. Root-cause analysis (Issue #014) identified three structural absences rather than prompt problems. All five previous patches were fixing symptoms at the wrong layer.

### Decision
Rebuild news discovery on three structural changes, staged:

1. **Date-aware search (Stage 1 — highest impact):** migrate from deprecated TavilySearchResults to langchain_tavily.TavilySearch with topic="news", days=2, include_domains (trusted tennis sources), max_results=8. Hard-gate in code: any result older than 48h is dropped before the LLM sees it — a deterministic rule, not a prompt instruction. Compute current tournament round from the calendar; inject into queries.

2. **RSS as a second channel (Stage 2):** parse ATP/WTA/BBC-tennis/ESPN-tennis RSS feeds for last-48h items. Merge with Tavily results as candidate material. RSS gives fully structured, dated, trusted-source material — the news equivalent of what Apify is to recaps.

3. **Deterministic significance scoring (Stage 3):** weekly-cached ATP/WTA top-100 (data/rankings.json) + a maintainable marquee-player list (data/marquee-players.json). Score each candidate story in code (ranking of player involved, marquee flag, upset ranking-gap size, tournament tier, injury/comeback flag). Publish-threshold ≥5. Stories that don't clear the bar never reach Sonnet. Significance becomes a scoring problem instead of a vibes problem.

### Alternatives considered

**"Human-curated news" (rejected):** founder flags interesting stories; agent writes them. Rejected because it contradicts the product vision (autonomous agent finds interesting content in a large internet) and the founder's time budget. Valid as an optional bonus channel; not the design.

**Change search provider entirely (deferred):** NewsAPI.org, GNews, Exa are all date-filterable alternatives. Deferred because Tavily in news-mode with proper parameters is untested and likely sufficient — change providers only if Stage 1 doesn't resolve the discovery problem.

**Prompt-only fixes (rejected, pattern well-established):** five prior patches were prompt-only. Each fixed a symptom while the structural absence remained. The lesson is institutionalized: prompt rules cannot compensate for missing data at the input layer.

### Scope boundary
This rebuild addresses discovery and judgment. It does not change what the LLM does after passing candidates — it writes cards as before. It does not address the recap pipeline (separate, already solid). It does not address insights (different failure mode — tournament-calendar accuracy, handled separately).

### Expected outcome
News cards that reach the founder for approval are: published within 48h, about the current tournament round, involving players the audience cares about. The founder's review collapses from "is this even true and current?" to taste ("is this well-written and the right story for today?"). That is the correct division of labor between code and human.

---

## PDL-017: RSS as primary news source, search index as supplement

**Date:** June 2026
**Trigger:** During the news discovery rebuild (PDL-016), live testing showed RSS feeds dramatically outperforming the Tavily search index for current news.

### The evidence
On a single test day: Tavily news-mode returned 2 stories; RSS feeds (BBC, ESPN only — ATP/WTA were down) returned 12, including all the marquee stories Tavily missed entirely (Boulter's upset of world #2 Rybakina, Kyrgios's comeback ending, Evans's retirement announcement).

### Why the search index underperformed (the technical reason)
A search index (Tavily) and a publisher feed (RSS) are structurally different tools:
- **Indexing lag:** a search engine must discover, crawl, and index an article before it can return it — hours of delay. RSS is publisher-pushed: the article appears the instant it's published, zero lag.
- **Relevance ranking ≠ recency:** search ranks by authority signals (links, popularity). A freshly published article has no links yet, so it ranks LOW precisely when it's most current. RSS doesn't rank — it returns everything in chronological order, so the freshest stories sit at the top.

Plain English: a search engine is like asking a librarian for "good tennis books" — you get established, well-regarded ones, which takes time to become established. RSS is like standing at the newspaper's printing press grabbing each paper as it comes off. For TODAY's news you want the printing press, not the librarian. Tavily wasn't the wrong tool — it was the wrong tool for THIS job (current news). It's built for discovery, not for current truth.

### Decision
Make RSS the primary news source (the trusted, real-time, dated backbone) and the search index the supplement (the wide net for stories breaking on sources we don't have a feed for).
- RSS first: ATP, WTA, BBC, ESPN publisher feeds.
- Tavily second: catches the long tail — stories on publications outside our feed list.
- On duplicates, RSS wins (accurate publisher pubDate vs. indexing-lag-affected estimate).
- Robustness: if RSS feeds are down, continue with what works; if all are down, fall back to Tavily-only with a degraded-mode warning.

### Why not RSS-only
RSS only covers feeds we've configured — its strength (everything from these publishers) is its limit (nothing from publishers we haven't added). Tavily provides the long-tail breadth. The two together — RSS for depth on known sources, search for breadth across unknown ones — beat either alone.

### The pattern (third instance — see master PRD lessons)
This is the same lesson as the recap rebuild (PDL-010): for time-sensitive, factual content, a structured/direct source beats a search index. Recaps: web search → Apify structured data. News: search index → RSS publisher feeds. The principle is now institutionalized.

---

## PDL-018: Event-centric significance scoring — title-only player detection + stage signals

**Date:** June 2026
**Trigger:** Post-SF diagnostic showed Raducanu's SF/final headline scored [4] (dropped) while a QF recap scored [11] (due to incidental body mentions). See Issue #015.

### The problem with full-text scoring

`score_story()` checked `title + content` for player names and marquee membership. This is wrong for two reasons:

1. **Incidental body mentions inflate scores.** A QF recap might say "Raducanu and Boulter through, while Mboko [world no. 9] withdrew from doubles." Mboko's mention as context adds +5 (top-10). The article is genuinely about a QF result, not about a top-10 player. Score inflates by 5 because of a parenthetical.

2. **Important late-round results deflate.** A marquee player's SF win headline scored [4] (marquee only) because the opponent wasn't top-20, the tournament wasn't GS/1000, and "powers into" isn't in the upset vocabulary. There was simply no signal for "the tournament is now at semifinal stage."

### The fix: two-part

**Score the EVENT, not the article.** Titles are written to name the story subject — they reliably tell you who the article is about. Bodies contain contextual mentions that have nothing to do with the event. Player/marquee detection now uses TITLE ONLY.

**Add tournament stage as a first-order signal.** Final: +4. Semifinal: +2. Floor rule: any featured player (marquee/top-20/top-10) reaching SF or later → unconditional pass. A marquee player's final is always news, regardless of opponent rank or tournament tier.

### Rubric after this change

| Signal | Scope | Points |
|--------|-------|--------|
| Top-10 player | Title only | +5 |
| Top-11-to-20 player | Title only | +3 |
| Marquee player | Title only | +4 |
| Stage: final | Title only | +4 |
| Stage: SF | Title only | +2 |
| Floor (featured + SF+) | — | ≥5 guaranteed |
| Upset vocabulary | Title only | +2 |
| GS/1000 context | Active tier or title | +2 |
| Injury/comeback/retirement | Title + lead para | +3 |

### Why lead-only for injury (not full body)?

Injury and retirement are typically confirmed in the title or opening paragraph. Using `content[:200]` captures the lead paragraph where the fact is stated, without scanning deep-body context where recovery rumours or historical injuries might appear.

### The pattern (now second instance)

The recap rebuild (PDL-009) made the same move: stop asking the LLM to judge significance from open-ended text; give it structured inputs where the facts are already pre-filtered. Significance scoring now follows: structured short-form (title) for who → deterministic rubric for how important. The LLM never sees a candidate below threshold.

---

## PDL-019: Pre-filter pool before Sonnet using semantic dedup + keyword overlap

**Date:** June 2026
**Trigger:** Even after removing significance-filtering from the curation prompt, Sonnet still used its internal card budget (1-3 per call) to write already-covered stories, leaving no budget for genuinely new ones. See Issue #016.

### The problem with post-generation dedup only

The semantic memory dedup ran AFTER Sonnet generated cards. With a pool of 7 stories, 4-5 of which were already covered in memory, Sonnet would write 2-3 already-covered stories (Raducanu final, Boulter, Williams/Muchova), use up its budget, and never reach Stuttgart [5]. The dedup would then block the covered cards — net result: 0 new cards, despite a passing story sitting in the pool.

### Decision: pre-filter the pool before Sonnet sees it

Run semantic dedup (memory store, threshold 0.78) and keyword overlap (2+ shared significant words with already_covered titles) on each event group BEFORE formatting the pool for Sonnet. Already-covered groups are dropped. Sonnet receives only genuinely new stories.

**Why 0.78 threshold (not 0.82)?** The post-generation check compares Sonnet's generated card title+body against memory. The pre-generation check compares raw article title+body against memory. Raw article text is more verbose and less focused than a generated card, so embedding similarity is lower. The gap observed in practice: Raducanu SF article vs "Raducanu battles through Queen's semis" scored 0.84 post-generation but ~0.79 pre-generation. Setting threshold to 0.78 closes this gap.

**Why keyword fallback?** For stories sharing the same player name AND tournament name (e.g., "Raducanu reaches last four at Queen's" vs "Raducanu battles through Queen's semis"), keyword overlap catches near-duplicates that fall slightly below the semantic threshold. Two significant words (>4 chars) in common is the heuristic — verified not to false-positive on "Shelton Stuttgart" vs "Shelton cracks top 5" (only "Shelton" shared → 1 word, below threshold).

### Pool formatting change

Pool items grouped by event (title-word overlap ≥50%). Grouped as "STORY N (score: N)" with a "POOL: N distinct event(s)" header. Sonnet sees exactly how many new stories it needs to write, sorted by score.

### Impact

After fix: pool pre-filter drops covered stories silently, Sonnet receives 2-3 genuinely new events, writes cards for all of them. Stuttgart [5] generated on first Sonnet call after fix. No more already-covered stories consuming the card budget.

### The pattern (now second instance — see PDL-018)

Pre-filter before LLM; post-filter as backup. Don't rely on post-generation dedup as the only gate when the LLM has a hard card budget. The budget gets consumed by duplicates before it reaches new stories. The principle: give the LLM a clean input, not a dirty pool with dedup as a cleanup step.

---

## PDL-020: Google News RSS as ATP/WTA discovery layer; Flashscore as gap-fill

**Date:** June 2026
**Trigger:** ATP/WTA official RSS feeds confirmed dead (Issue #018); Libema Open coverage gap structural diagnosis

### Context

The news discovery pipeline was BBC RSS + ESPN RSS + Tavily. For tournaments not covered by Anglophone broadcasters (Dutch ATP 250, smaller WTA events), we had a structural gap. We also knew ATP official RSS was returning 403 and WTA had no RSS endpoint — these were previously just logged and skipped.

### Decision

Two complementary fixes at different layers:

**Layer 1 — Google News RSS** (live now, zero cost):
- Queries `news.google.com/rss/search?q=tennis+results+2026` 
- Filters by `_GNEWS_ACCEPTED_SOURCES` (ATP Tour, WTA Tennis, tennis-specific publishers)
- For each fresh item from accepted sources, fetches actual content via Tavily (which already includes atptour.com + wtatennis.com in its domain list)
- Deduplicates against existing RSS pool before adding
- This replaces the dead official feeds with a Google-proxied version

**Layer 2 — Flashscore gap-fill** (feature-flagged off, enable June 29 / Wimbledon):
- Pulls last 48h structured results from ALL tournaments via Apify Flashscore
- Scores each match against the significance rubric using synthetic titles
- For significant results with no corresponding article in the pool → adds as a structured gap-fill item (`_source: "flashscore"`, `_structured: {...}`)
- Sonnet writes from structured facts only: ranking upset, stage, tier, surface — no invented tactical detail
- Enable: `FLASHSCORE_NEWS_ENABLED=true`

### Impact

Layer 1: ATP Tour and WTA Tennis content (3 items within 48h in June 2026 testing) now enters the pool. Official ATP/WTA story angles that BBC/ESPN don't lead with become discoverable.

Layer 2: Eliminates the Libema-class gap — non-Anglophone tournament finals with significant players pass through significance scoring regardless of whether BBC/ESPN covered them.

### Lesson

Structured data beats article search for gap-fill. When no article exists, the significance scorer works better on synthetic titles built from match facts (winner vs. loser, round, tournament) than on article prose that mentions 10 players in one paragraph. The division: Google News/BBC/ESPN for narrative coverage; Flashscore for tournament breadth.

---

## PDL-021: Mandatory WHY line with computable/recalled grounding distinction

**Date:** June 2026
**Trigger:** Audit of generated cards showed WHY lines containing recalled claims — some inverted (N2 said "players accepted" when sources said "dispute continues"), some unverifiable ("earliest exit since 2009"), some fabricated (invented Roddick quote).

### Context

Card bodies had a soft "explain significance" rule but no structure enforcement. The model consistently filled the final sentence with impressive-sounding recalled claims: career records, historical comparisons, player sentiment — often wrong or unverifiable. Prompt-based guardrails ("if in doubt, write a computable WHY") were ignored; the model rationalized around them.

### Decision

Three-layer change to `generate_feed.py`:

**1. Structural JSON requirement (`why_source` field):**
Both prompts now require a `why_source` field alongside each card body. The model must either (a) copy-paste the exact phrase from the search results that backs the WHY, or (b) write `computable:` + the field (calendar date, stage, ranking gap) it derives from. This forces the model to locate evidence before writing the WHY rather than inventing it after.

**2. Post-generation validation (`_validate_why_source`):**
`generate_cards()` now calls `_validate_why_source()` on each card. It normalizes the `why_source` text and checks whether it appears in the search content string. If not found, it prefixes the field with `⚠ RECALLED (not found in source):` — visible at review time, not published.

**3. Named grounding tiers (computable vs. recalled):**
Both prompts define two explicit tiers. Computable grounding (ranking gap, stage, calendar proximity, tournament tier, any number from the source) is always safe. Recalled grounding (season records, historical comparisons, player sentiment, economic trends) requires passing a mandatory checkpoint: "Can I quote the exact source sentence?" If not, fall back to a computable WHY.

### Impact

Validator catches all three audit failure classes: unsourced historical claim, inverted fact (model said "accepted" when source said "dispute continues"), and fully invented quote. Cards with unverified recalled WHYs are flagged at review, not silently published.

### Lesson

Prompt guardrails alone don't stop hallucination in the WHY line — the model generates text in one forward pass and rationalizes that it's grounded. The only reliable control is structural: require evidence citation as part of the output format, then validate that citation programmatically. The cost is one extra JSON field; the benefit is that fabricated WHYs surface at review rather than going live.

---

## PDL-022: Tournament-specific Google News queries to catch ATP 500 / WTA R1 results

**Date:** June 2026
**Trigger:** Halle Open and Queen's Club R1 results (e.g. Tiafoe d. Cobolli) were not appearing in the pipeline despite being covered on Google News and YouTube.

### Context

The Google News RSS layer (`fetch_google_news_atp_wta`) used a single generic query (`tennis+results+2026`) with a 6-source allowlist. ATP 500 / WTA 250 first-round articles are published by Reuters, Eurosport, tennismajors.com, and others — none of which were in the allowlist. The generic query also didn't surface tournament-specific news from BBC Sport, Guardian, or Sky Sports because those publishers post standalone articles only for notable matches, not all R1 results. The domain-restricted `news_search_tool` (`include_domains`) prevented resolution of articles from non-trusted publishers even when their titles appeared in the GNews feed.

### Decision

Three changes to `generate_feed.py`:

**1. Tournament-specific GNews queries:** In addition to the generic query, `fetch_google_news_atp_wta()` now fetches one Google News RSS query per active tournament (from `TOURNAMENT_CALENDAR_2026` via `get_active_tournaments(lookahead_days=1)`). These queries use no source filter — the specificity of the tournament name is the quality gate. FAQ/aggregation titles (`What are the X results?`, `How to watch...`) are filtered before Tavily lookup.

**2. Expanded `_GNEWS_ACCEPTED_SOURCES`:** Added BBC Sport, The Guardian, Eurosport, tennismajors.com, Sky Sports, Sport.de to the generic-query allowlist.

**3. `gnews_lookup_tool` (no `include_domains`):** Tournament-specific GNews items are resolved via a new unrestricted Tavily tool that can reach Reuters, Eurosport, tennismajors etc. Domain-restricted `news_search_tool` stays for the main discovery pipeline. URL-level dedup prevents the same article appearing multiple times from different GNews sources. Non-tennis results (e.g. FIFA videos linked from ATP YouTube) filtered by regex.

### Impact

Halle Open R1 results (Tiafoe d. Cobolli, Reuters roundup) now surface in the pipeline. ATP 500 / WTA 250 first-round coverage from sports wire services is now reachable. Each pipeline run gains 1-3 tournament-specific articles that the generic query missed.

### Lesson

Generic queries + narrow source allowlists miss the tail of ATP 500 / WTA 250 coverage because those results don't appear on a handful of flagship outlets — they appear on wire services, local sports portals, and specialist publishers. Tournament-specific queries + broad resolution (no `include_domains`) is the right pattern. The quality gate for these queries is query specificity, not source allowlisting.

---

## Template for New Entries

---

## PDL-023: Orchestrator design — card approval, not plan approval

**Date:** June 2026
**Trigger:** Orchestrator had an interactive plan-approval step that blocked autonomous operation. The right abstraction was cards flowing to the phone for approval, not the generation decision itself.

### Context

Early orchestrator design included an interactive terminal step: Sonnet proposes a plan → human sees it → human approves → generation runs. This meant the orchestrator couldn't run on a cron and required babysitting each morning. The alternative was fully autonomous generation with no human checkpoints at all — which risked generating content nobody wanted.

### Decision

Removed the plan-approval step entirely. The orchestrator now: reasons → sends FYI to Telegram (informational only) → commissions agents immediately. Cards generated by agents flow to Telegram with ✅/📅/🗑 buttons — these are the approval checkpoints. The editorial decision (what to commission) is trusted to the orchestrator. The content decision (approve/reject this specific card) remains with the editor.

Commands finalized:
- `--plan`: reasoning only, terminal display, no generation, no Telegram
- `--run`: full daily path (reason → FYI → commission → cards on phone)

### Impact

Orchestrator can run unattended on a cron. The FYI message keeps the editor informed without requiring a response. The card-approval layer provides quality control where it actually matters — at the output, not at the planning stage.

### Lesson

Human oversight is most valuable at the content level (approve this card before it publishes), not at the planning level (should we generate a recap today?). The orchestrator's judgment about WHAT to generate should be trusted — its errors are cheap (the card gets rejected). An editor approving 2-3 cards is far lighter than an editor approving a generation plan every morning.

---

## PDL-024: Orchestrator content definitions locked — NEWS ≠ match results

**Date:** June 2026
**Trigger:** Risk of orchestrator conflating NEWS and RECAP — e.g., commissioning a "news" card about who won yesterday, duplicating the recap's job.

### Decision

Locked NEWS to "off-court player narratives only": injuries, comebacks, coaching changes, ranking shifts, controversies, wildcard decisions, retirement announcements, player statements. Match results are RECAP's exclusive domain. This distinction is hardcoded into the orchestrator's planning prompt and cannot be overridden by Sonnet's reasoning.

Additionally locked PREDICTION rules: at Grand Slams, all R1+ matches are prediction-worthy; at non-Grand Slam events, QF-onward only. A hard guardrail blocks any prediction item that doesn't contain "Player A vs Player B" in its details field.

### Lesson

Content type boundaries must be defined in the prompt AND enforced by deterministic guardrails. The LLM's definition of "news" will drift toward match results unless explicitly prevented — the guardrail is the backstop.

---

## PDL-025: Recap match selection delegated to LLM; two deterministic floors retained

**Date:** July 2026
**Trigger:** Static tier system in the recap prompt was encoding editorial judgment that Claude already possesses — a redundant approximation that capped quality rather than ensuring it.

### Context

The recap prompt contained an explicit TIER 1/2/3 selection hierarchy: top seeds losing = always include, qualifiers advancing = include if space, routine wins = omit. This was built defensively early on to prevent Claude from covering meaningless matches or missing obvious leads. Over time it became clear the rules were unnecessary for selection (Claude knows a top-seed exit matters more than a routine straight-sets win) while being actively limiting — a static tier can't weigh whether a specific upset opens a specific quarter of a specific draw in a way that matters for today's narrative.

Separately, the 8 matches selected for Tavily enrichment were chosen by a Python heuristic (marquee-player names first), meaning Tavily budget went to pre-decided names rather than the matches Claude actually wanted to write about.

### Decision

1. **Removed the tier system from the recap prompt.** Replaced with a single editorial instruction: cover what a knowledgeable fan would want to read about, omit what doesn't earn its place. No checklist.

2. **Two deterministic floors kept, computed from data before the prompt is sent:**
   - Retiring players (Wawrinka, Cirstea, Monfils, Murray etc.) — always first bullet in their section
   - Top-10 losses — always included. These are injected as a `MANDATORY FLOORS` block with named matches, so Claude cannot miss them by editorial misjudgment.

3. **Enrichment selection delegated to Sonnet.** A pre-call asks Sonnet to pick the 8 matches most worth Tavily research (favouring upsets, close matches, surprising results). The marquee-name heuristic becomes a fallback only if the call fails.

### Impact

Recap editorial quality should improve on days with complex draws or non-marquee storylines — the model can weigh draw implications, career arcs, and narrative texture that our tier rules couldn't capture. The floors ensure the two categories readers would notice if missing (farewell seasons, big upsets) are never dropped.

### Lesson

Distinguish between accuracy guardrails (must be deterministic — don't invent scores) and editorial guardrails (should be delegated — the model has better judgment than a static tier list). Encoding editorial rules in code is a ceiling, not a floor. Reserve deterministic enforcement for factual correctness and explicit brand promises; trust the model for everything else.

---

## PDL-026: Match Analysis card — separate interpretation from take text

**Date:** July 2026
**Trigger:** The `interpretation` frontmatter field drives both the on-card take line (limited vertical space, ~2 lines at 22px) and the Telegram caption "What the numbers say" paragraph (500 chars, no length constraint). Shortening one shortened the other.

### Context

The first published match-analysis card (Noskova vs Kostyuk, Wimbledon SF) had a long interpretation that worked well as a Telegram caption. The same text overflowed the card's take area at the bottom of the PNG. Truncating it fixed the card but cut the Telegram caption. The user: "you also shortened the What the numbers say section which was perfect and you should not have changed it, only the bottom line of the card/image."

### Decision

Do not shorten `interpretation` to fit the card. Instead, write a separate short take sentence at render time (passed as `--take` to the render script, or hardcoded in the frontmatter as a future `take` field). The card PNG uses the short take; the Telegram caption uses `interpretation[:500]`.

The card's `wrapTake()` function splits at ~88 chars to two SVG lines at y=585 and y=611 — this is the physical limit. Any take longer than ~176 chars will still overflow.

### Impact

Not yet fully wired. Current workaround: pass the short take at render time; do not touch `interpretation`. A `take` frontmatter field would clean this up permanently without needing a render-time flag.

### Lesson

When the same field drives multiple display surfaces with different constraints (card image vs. Telegram vs. website), it will eventually be too long for one and too short for another. Fields that drive multiple surfaces should be split at the data model level, not patched at render time.

---

## PDL-027: Match Analysis publish flow — destructive publish_card() requires PNG in git

**Date:** July 2026
**Trigger:** First match-analysis card approved via Telegram; image showed on Telegram but not on the website.

### Context

`publish_card()` moves the .md from `feed-candidates/` to `feed/` and updates `image_url` to `/feed/<slug>.png`. The PNG is also moved to `public/feed/`. But Vercel builds from git — untracked files in `public/feed/` are invisible to Vercel. The website showed the card title but no image.

### Decision

After approving any match-analysis card, immediately commit the PNG to git:
```bash
git add public/feed/<slug>.png content/feed/<slug>.md
git commit -m "Publish match analysis: ..."
git push
```
This is documented in commands.md. No automated solution — the PNG commit is a manual step after Telegram approval.

Secondary issue: `publish_card()` deletes the candidate .md and moves the PNG on the first approval. Re-approving a card (after e.g. a listener restart) always fails with "file already gone." The only fix is to recreate the candidate manually or post directly to the channel.

### Impact

The PNG-in-git requirement is now documented in commands.md, current-operations-flow.md, and strategic-roadmap.md. The re-review-after-publish gap is an acknowledged limitation.

### Lesson

Static hosting (Vercel) requires assets to be in the git repository at build time. Any pipeline that moves files programmatically (e.g., candidate → published) must also commit and push those files, or they will never appear on the live site.

---

```
## PDL-XXX: [Short decision title]

**Date:** [Month Year]
**Trigger:** [What happened that led to this decision]

### Context
[The situation before the decision — what was happening, what wasn't working]

### Decision
[What you decided to do and why — be specific about the change]

### Impact
[What changed as a result — measurable if possible, directional if not]

### Lesson
[The generalizable takeaway — what would you tell someone building a similar product?]

---

## PDL-028: News pipeline observability — truthful queue states + structured event log

**Date:** July 13, 2026
**Trigger:** Pre-hard-court-swing audit revealed all 206 discovery queue items were falsely marked `generated`; no funnel visibility; preview-mode news silently not generating

### Context

Before DC Open (July 25), an observability analysis revealed: the discovery queue was a black box. 206 items all showed `generated` — the same false status regardless of whether Sonnet selected the story, it was deduped, or it was rejected. The generation path also had a bug: during the preview window, `--news` would skip and never generate cards from queued preview stories.

### Decision

Implemented a 4-fix pre-swing bundle:
1. **Truthful queue states**: `run_generate_news_from_queue()` now returns `dict[id → outcome]` with real states: `skipped`, `dup_slug`, `dup_semantic`, `card_ready`. Title-overlap matching links Sonnet's output cards back to their source queue items.
2. **Structured event log** (`data/events.jsonl`): one JSON line per discovery/generation run. Each discovery event carries gate counts (RSS raw, post-48h, post-dedup, post-significance, post-staleness, queued_new). Each generation event carries outcome counts.
3. **`--report` command**: reads `events.jsonl` + `tg-review-queue.json`, prints a full funnel from raw RSS fetch through Telegram review + queue all-time snapshot.
4. **Preview-mode news fix**: `run_news_only()` guard changed from `if not active: return` to `if not active and not preview: return`.

### Impact

From DC Open onward: every discovery and generation run is traced. The morning `--report` answers in seconds: how many stories discovered, how many gated out and why, how many Sonnet picked, how many deduped, how many published. The preview-mode bug fix means lead-up coverage for DC Open, National Bank Open, and Cincinnati will actually publish.

### Lesson

Build the instrument before the campaign. We had 7 weeks of Wimbledon data with no funnel visibility — couldn't see why stories weren't publishing. One day of instrumentation work pays back immediately on the next tournament. The right order is: instrument → observe → tune, not: tune → wonder why it's not working.
```

---

## PDL-031 — Rejection-reason capture before editorial gate (Phase A of 60→20% rejection rate fix)

**Date:** 2026-07-17
**Decision:** Ship rejection-reason buttons in Telegram as the first step toward cutting the news card rejection rate from 60% to <20%. Defer the editorial gate (Phase B) until reason data exists.

---

### The diagnosis (evidence-based)

Full review history: 75 news cards reviewed, 47 rejected (63%). Clustering rejected slugs by subject surfaced the actual failure modes:

| Bucket | Example slugs | Share (inferred) |
|---|---|---|
| **Storyline over-coverage** | 8 Eala cards, 7 Serena cards — every round of a run becomes a card | largest |
| **Routine result / no angle** | `fritz-books-halle-qf`, `svitolina-into-berlin-r16` — top name, no story | large |
| **True duplicate** | `vondrousova-four-year-ban` rejected; `vondrousova-four-year-doping-ban` published | meaningful |
| **Taste / audience mismatch** | stories about players or sub-plots that don't fit TennisMind | moderate |
| **Writing quality** | vague WHY, inaccuracy — what Phase 3 (critique loop) targeted | **smallest** |

**The smoking gun — two root causes, not one:**

1. `SIGNIFICANCE_THRESHOLD = 5`. The top-10 bonus is `+5`. Any headline containing a top-10 player's name clears the gate by itself — win or loss, first round or final, story or non-story.

2. The generation prompt explicitly disables curation: *"Your job is to WRITE excellent cards for them, not to re-decide whether they are worth publishing."* Sonnet — the only component that understands language — is instructed to switch editorial judgment off. Selection is delegated entirely to a keyword scorer that detects "notable player present" but cannot detect "is this a story."

**The structural consequence:** you are the only editor in the pipeline, operating at maximum friction (end of the chain, after generation has run). The 63% rejection rate is not a bug — it is the design working as intended.

**Why Phase 3 (critique loop) wasn't enough:** it targets the smallest bucket (writing quality) while the three largest buckets are all upstream selection failures. Polishing cards that shouldn't have been generated doesn't change the denominator.

---

### What to build (3-phase plan)

**Phase A — Capture the rejection signal** *(this decision)*
Replace the single Reject button in Telegram with a two-step flow: tap Reject → see four reason buttons → tap the reason. Store the reason on every rejection.

Reason vocabulary (6 options — founder's taxonomy, fast to tap on mobile):

| Button | Code | Meaning |
|---|---|---|
| ↩ Covered | `cov` | Same story, same narrative — we already published this angle |
| 🔁 Duplicate | `dup` | Already seen and rejected a similar card this cycle |
| 📅 Stale | `sta` | Tournament is over but we're still posting about it |
| ⚠ Inaccurate | `bad` | False facts, wrong numbers, wrong players |
| — Weak story | `wk` | No WHY — just what happened, no angle or significance |
| 😴 Boring | `bor` | Simply bad news — not interesting enough to publish |

**Covered vs Duplicate distinction:** "Covered" = we published this angle. "Duplicate" = we already rejected something similar this cycle and are seeing it again. This separation matters for Phase B — "Covered" points to the pre-filter (semantic dedup), "Duplicate" points to Sonnet generating multiple cards from the same source pool.

**Phase B — Editorial gate between significance and generation** *(after 2+ weeks of Phase A data)*
Insert a dedicated LLM selection pass that sees the full day's queue and makes card-level decisions: does this have an angle? have we already covered this storyline? one card per storyline. This is where Sonnet's judgment belongs — as a dedicated editor, not buried inside the writing prompt.

**Phase C — Taste learning** *(after Phase B)*
Feed Phase-A labels back as few-shot examples into the Phase B gate. The gate stops guessing what you find newsworthy and starts modeling your actual publish history.

---

### Why Phase A first

Phase A costs ~1 hour to ship. More importantly: without real rejection reasons, Phase B is built on inferred buckets. With 2 weeks of Phase A data (roughly 15–20 labeled rejections), Phase B can be tuned to the actual distribution rather than a guess. Phase A also makes the 60→20% target *measurable* — we currently have no way to know which bucket we've improved.

**The one thing we don't do:** raise `SIGNIFICANCE_THRESHOLD`. It would drop volume but cut real stories (upsets by lower-ranked players score low) while still passing routine top-10 results. The threshold selects on player ranking, not on "is this a story" — raising it solves the wrong problem.

---

### Expected trajectory
- Phase A alone: no rejection drop, but the target becomes measurable
- Phase B: absorbs over-coverage + duplicate + no-angle — the bulk. Should take 60% → ~25–30%
- Phase C: closes the taste gap, locks in <20% and keeps it there

---

## PDL-035 — Orchestrator v2.1: Close 5 Identified Pipeline Gaps

**Date:** August 2026
**Decision:** Implement all 5 gaps identified in the Section 10 audit of the orchestrator solution design.

**What was built:**

1. **Gap 1 — Redundant Apify fetch**: `run_generate_recap()` accepts a `context_bundle` parameter. If the orchestrator's ESPN fetch already confirmed no matches yesterday (`status == "confirmed_no_matches"`), the recap fast-fails before making the Apify call. Saves ~1 Apify credit on rest days.

2. **Gap 2 — Context sharing between agents**: `run_generate_recap()` now returns the card title (str) on success, None on any failure. `delegate()` captures the return value and sets `gf._ACTIVE_RECAP_TITLE` before calling news. The news agent's `_agentic_research()` injects a "recap already covers X" note into the research prompt when this is set.

3. **Gap 3 — Few-shot for agentic news**: Added two concrete examples to `_AGENTIC_NEWS_SYSTEM`: (a) thin snippet → fetch_url → search → card output; (b) candidate → check_memory → already covered → skip. Demonstrates the full tool-call sequence and card format.

4. **Gap 4 — Programmatic quality guards**: Added `_validate_card_structure()` that runs before the LLM critique. Checks body word count (50–120 words) and presence of at least one digit. Zero tokens spent. Cards failing structure checks are dropped immediately with a logged reason.

5. **Gap 5 — Human handoff provenance**: `_format_message()` in telegram_review.py now surfaces the `why` field (editorial rationale) and `critique_status` (pass/rewrite). Both fields are persisted in candidate frontmatter via `_build_frontmatter()`.

**Lesson:** All 5 fixes were mechanical — no new architecture required. They demonstrate the value of naming gaps explicitly before building: "critique_status not surfaced" is a solvable engineering task; "cards feel arbitrary" is not.

---

## PDL-036 — Recap: Evening Timing, Hard Court Colors, WTA Supplement

**Date:** August 2026
**Trigger:** Day 5 National Bank Open recap used orange (clay) image, missing WTA data, and covered yesterday's matches instead of today's.

**Decisions:**

1. **Recap timing shifted to 23:00**: Recap now runs at 23:00 CET after today's play ends, covering `recap_date = datetime.now().date()` (today). Previously ran at 08:00 covering the previous day. Added dedicated `--recap` cron at 23:00. Morning `--run` orchestrator no longer commissions recap. Apify dayOffset changed from `"-1"` to `"0"`. Tavily fallback search uses `today` not `yesterday`.

2. **Hard court color styles**: Added "National Bank Open", "Western & Southern Open", "Canadian Open", "Rogers Cup", "Miami Open", "Indian Wells Masters" to `_RECAP_TOURNAMENT_STYLES` with US Open Series blue `(0, 90, 170)`. Previously all non-Slam tournaments fell through to the charcoal default.

3. **WTA supplement via Tavily**: After primary fetch (`fetch_structured_results`), if WTA count < 2, `_fetch_wta_supplement()` runs a WTA-specific Tavily search and appends new matches (deduplicated). Addresses persistent issue of primary sources (ESPN/Apify) returning thin WTA data for 1000-level events.

4. **Bold header normalization**: Added post-processing regex normalization after `json.loads()` to force `**MEN'S DRAW**` / `**WOMEN'S DRAW**` markers regardless of LLM compliance. Fixes persistent regression where LLM returned plain text headers.

**Lesson:** Timing and surface color were config gaps, not reasoning failures. The LLM can't pick the right image style if the style dict doesn't contain the tournament.

---

## PDL-037 — Recap Data Sources: Apify Pricing Discovery + Google News RSS Fallback

**Date:** August 2026
**Trigger:** Apify live fetch repeatedly failing after first successful call; discovered actor is $4.99 per-call (not per-month) on the free plan.

**Findings:**

- Apify `statanow/flashscore-scraper-live` charges **$4.99 per actor run** (PAID_ACTORS_PER_EVENT pricing model). On the free plan, the first successful call exhausts the budget; subsequent calls fail with "Maximum charged results must be greater than zero."
- ESPN returns 403 intermittently (primary structured source).
- Google Search results are bot-protected (CAPTCHA redirect).
- Direct Flashscore/Sofascore APIs require authentication headers that change frequently.
- WTA/ATP official websites are JavaScript-rendered, not parseable with requests + BeautifulSoup.

**Decisions:**

1. **Keep Apify cache** as tier 3 (free — reads the cached JSON from the previous successful run). Cache is dated by day so it's automatically stale-aware.
2. **Replace Tavily (paid) with Google News RSS** as tier 5 fallback. Uses `feedparser` to fetch article headlines + links from Google News RSS, then fetches article HTML with `urllib.request` + BeautifulSoup, then extracts structured results with Haiku. Free, no API key required.
3. **WTA supplement** similarly uses Google News RSS instead of Tavily.
4. **Apify live remains tier 4** for when cache is cold (first run of a tournament day). Limit to one live call per cache TTL; do not retry on failure.

**Lesson:** "We have Apify credits" was factually true but the pricing model is per-run, not per-month. $4.99/day for a daily recap is unsustainable. Google News RSS + article scraping is the correct free fallback.


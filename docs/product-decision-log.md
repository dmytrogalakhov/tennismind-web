# TennisMind — Product Decision Log

Strategic decisions, design pivots, and lessons learned that shaped the product direction. Different from the Issue Log (which tracks operational bugs).

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
```

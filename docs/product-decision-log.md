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

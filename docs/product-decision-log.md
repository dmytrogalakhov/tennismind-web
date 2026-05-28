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

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

### Decision

Added a tournament calendar to generate_feed.py with dates for all major 2026 tournaments. A function checks what tournament is currently running (including the week before for buildup stories). When a tournament is active, search queries are dynamically rewritten to include the tournament name, and the curation prompt gets a context injection: "Roland Garros is currently happening. Prioritize stories from this tournament."

### Impact

News agent immediately started finding Roland Garros-specific content instead of generic or outdated results.

### Lesson

Context injection is one of the cheapest and highest-impact improvements you can make to an AI pipeline. The model doesn't know what month it is or what tournament is happening unless you tell it. A simple calendar lookup + prompt injection transforms result quality.

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

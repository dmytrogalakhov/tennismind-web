# TennisMind — Issue Log

Tracking bugs, root causes, and fixes across both projects (match-analyst-bot and tennismind-web).

---

## Issue #001: Racket images returning 404 on the website

**Date:** May 4, 2026
**Project:** tennismind-web
**Severity:** High — core feature broken (racket recommendation page shows no image)
**Reporter:** Manual testing

### Symptoms

- Racket image placeholder showed alt text "Babolat Pure Aero 2026" instead of the actual image
- After converting .avif to .png and clearing cache, image still didn't load
- Direct URL `http://localhost:3000/rackets/pure-aero-2026.png` returned 404

### Investigation

1. **File exists?** Yes — `public/rackets/pure-aero-2026.png` confirmed on disk (2.4MB, 3024x3024)
2. **Image resized?** Yes — resized to 500x500 to reduce load time
3. **Other public files work?** Yes — `http://localhost:3000/next.svg` loaded fine
4. **Cache issue?** Partially — stale `.cache/racket-recommendations.json` had entries without `image_url`. Cache cleared, but image still 404.
5. **Key finding:** `http://localhost:3000/rackets/pure-aero-2026.png` returned 404, meaning the dev server wasn't serving the file at all despite it being in `/public/rackets/`

### Root Cause

`proxy.ts` (the i18n middleware) had a URL matcher that caught all paths except `/api`, `/_next/*`, and `/favicon.ico`. It did NOT exclude paths with file extensions.

When the browser requested `/rackets/pure-aero-2026.png`, the middleware intercepted it, treated "rackets" as a missing locale, and redirected to `/en/rackets/pure-aero-2026.png` — which doesn't exist as a Next.js route. Result: 404.

### Fix

Added `.*\\.[^/]+$` to the negative lookahead in `proxy.ts`. This regex matches any path ending with a file extension (a dot followed by non-slash characters), so all static assets in `/public/` now bypass the i18n proxy entirely.

### Lessons Learned

1. **i18n middleware must always exclude static assets.** Any middleware that rewrites URLs needs to explicitly skip file extensions (`.png`, `.jpg`, `.svg`, `.css`, `.js`, etc.). This is a common Next.js i18n pitfall.
2. **Test static file serving directly.** When images don't load, go to the direct URL (`localhost:3000/path/to/file.png`) before debugging component code. A 404 at the server level means the problem is routing, not React.
3. **Image format matters.** The original `.avif` file was 138KB but less universally supported. Converting to `.png` increased size to 2.4MB (at 3024x3024). Always resize images for web — 500px is plenty for a product card.
4. **Clear caches after schema changes.** The recommendation cache stored results without `image_url`. Old cache entries persisted even after the database was updated. Always clear `.cache/` after adding new fields.

---

## Issue #002: Feed card translation generating new content instead of translating

**Date:** May 10, 2026
**Project:** tennismind-web
**Severity:** High — visible to users, broken core feature
**Reporter:** Manual testing

### Symptoms

When switching to German (DE), the Italian Open feed card showed:
1. A completely new multi-paragraph essay about Rome that didn't exist in the original card
2. Both English AND German text displayed simultaneously in the same card
3. Random bold formatting on the generated content
4. The title was translated but the body was replaced with invented content

### Investigation

1. Checked the /api/translate route — the LLM prompt was too open-ended
2. The prompt said "translate this tennis insight" without explicitly constraining the LLM from adding new content
3. The LLM interpreted "translate" as "write a German version about this topic" rather than "convert these exact words to German"
4. The frontend was appending the translation to the original text instead of replacing it

### Root Cause

Two separate bugs:
1. **Prompt too permissive:** The translation prompt didn't enforce "translate ONLY these exact words." The LLM took creative liberty and generated entirely new paragraphs about the topic instead of translating the original 3-sentence card.
2. **Frontend display logic:** The component rendered both the original English text and the translated text instead of showing only the translated version when the language was set to DE or UA.

### Fix

1. Updated the translation prompt to: "Translate the following tennis insight to {language}. Translate ONLY the text provided. Do not add any new information or context. Keep all numbers, player names, tournament names, and tennis terms intact. Return ONLY the translated text, nothing else."
2. Fixed the frontend to display ONLY the translated version when language is DE/UA, replacing the English text entirely
3. Added separate translation for title and body, both cached independently

### Lessons Learned

1. LLMs interpret "translate" loosely unless explicitly constrained. Always add "do not add, remove, or change any information" to translation prompts.
2. Translation prompts need negative instructions — telling the LLM what NOT to do is as important as telling it what to do.
3. Test translations with short content first — a 3-sentence card that returns 3 paragraphs is an obvious red flag that's easy to catch early.
4. Frontend must replace content on language switch, not append. This is a display logic issue separate from the translation quality.

---

## Issue #003: Feed card images rendering as square on mobile

**Date:** May 20, 2026
**Project:** match-analyst-bot + tennismind-web
**Severity:** Medium — poor mobile layout, image dominates card vertically
**Reporter:** Manual testing

### Symptoms

Feed card images were rendering as square (1:1) on mobile, causing them to dominate the card vertically. The top portion of the image (the narrative payoff) was cropped or pushed above the visible area. All cards looked like tall tiles instead of wide content cards.

Additional symptom: even after regenerating images in landscape format, mobile browsers (Chrome specifically) were still showing old square images due to aggressive caching.

### Investigation

1. Checked image file dimensions — confirmed all were 1024x1024 (square)
2. CSS aspect-ratio fix alone couldn't help — source images were square
3. gpt-image-1 API call was using size='1024x1024' instead of landscape
4. Three separate places in the code all specified square format:
   - The gpt-image-1 API call: size='1024x1024'
   - The _art_direct_card prompt: "Square format"
   - The _build_image_prompt constraints line: "Square 1:1 format"
5. After regenerating images, mobile Chrome still showed old images due to browser cache

### Root Cause

Two separate bugs:
1. **Wrong API size parameter:** All three places specifying image format pointed to square. Fixing one without the others caused conflicts — the art director still composed for square even when the API generated landscape.
2. **Browser cache:** Chrome on mobile caches images aggressively. Even after deploying new landscape images, users saw the old square versions until cache was cleared.

### Fix

1. Changed all three locations to landscape:
   - API call: size='1536x1024' (only landscape size gpt-image-1 supports — 1792x1024 not available)
   - _art_direct_card prompt: "LANDSCAPE (3:2 ratio), horizontal composition"
   - _build_image_prompt constraints: "Landscape 3:2 format, horizontal composition"
2. Updated FeedStatCard.tsx image container from fixed height to aspectRatio: '3/2'
3. Regenerated all existing square images using a batch script that detected 1:1 files and

### Lessons Learned
1. Aspect ratio must be pinned in the API call — prompt text alone does not control output dimensions.
2. When the same setting appears in multiple places (API param, art director prompt, constraints line), all must be updated together or they conflict.
3. Always check model-specific size support before specifying dimensions — gpt-image-1 and dall-e-3 have different supported sizes.

---

## Issue #004: News card image path not saved to frontmatter or Telegram

**Date:** May 21, 2026
**Project:** match-analyst-bot
**Severity:** Medium — news cards published without images despite user providing image path
**Reporter:** Manual testing during --review-news flow

### Symptoms

During --review-news, after approving a news card, the terminal asked for an image path. User provided "/feed/roland-garros.svg.png". The card was published to both the website and Telegram without any image. The saved markdown file had no image_url field in the frontmatter.

### Investigation

1. The image path provided was a relative web path (/feed/roland-garros.svg.png) not an absolute Mac file path (~/Downloads/roland-garros.jpg)
2. The code did not validate whether the provided path pointed to an existing file on disk
3. The code did not use os.path.expanduser() to expand ~ in paths
4. Even if the file existed, the code was not copying it to ~/tennismind-web/public/feed/
5. The image_url field was not being written to the markdown frontmatter
6. Telegram publishing was not using bot.send_photo() when an image was available

### Root Cause

Two separate bugs:
1. **No file validation:** The code accepted any string as an image path without checking if the file exists on disk. A web path like "/feed/roland-garros.svg.png" is meaningless as a local file path.
2. **Incomplete pipeline:** Even with a valid path, the code was not completing the full image pipeline — copy to public/feed/, add image_url to frontmatter, use send_photo() for Telegram.

### Fix

Updated generate_feed.py --review-news image handling:
1. Show a clear example path in the prompt: "Provide image path (e.g. ~/Downloads/roland-garros.jpg) or press Enter to skip:"
2. Expand ~ using os.path.expanduser() before processing
3. Check if file exists with os.path.exists() — if not, print warning and publish without image
4. If file exists: copy to ~/tennismind-web/public/feed/{card-slug}.png
5. Add image_url: "/feed/{card-slug}.png" to the markdown frontmatter
6. Use bot.send_photo() for Telegram when image is present, bot.send_message() when not

### Lessons Learned

1. Always validate file paths before using them — distinguish between web paths (/feed/...) and local Mac paths (~/Downloads/...).
2. When building a multi-step pipeline (approve → image → publish), test each step independently before assuming the full chain works.
3. Show a concrete example in prompts asking for file paths — users need to know the expected format.
4. The image pipeline has three separate concerns that all need to work together: copy file, update frontmatter, update Telegram format. Missing any one of them silently breaks the feature.

---

## Issue #008: Telegram photo upload timeout on recap cards

**Date:** May 27, 2026
**Project:** match-analyst-bot
**Severity:** Medium — card published to website but not Telegram
**Reporter:** Manual testing

### Symptoms

After approving a Day 3 recap card, the image was sent to Telegram but the follow-up text message timed out. Error: telegram.error.TimedOut. The card was successfully saved to the website.

### Root Cause

The generated image was too large for Telegram's default upload timeout. The Bot instance used default timeouts (5-10 seconds) which weren't enough for large landscape images over slow connections.

### Fix

1. Increased Bot timeouts to 60 seconds for read/write operations
2. Added image compression: if file exceeds 1MB, compress to quality=85 before uploading
3. Added retry mechanism: on timeout, wait 5 seconds and retry once before failing gracefully
4. Telegram failures no longer crash the pipeline — card is saved to website regardless

### Lessons Learned

1. Always set explicit timeouts on API clients — defaults are often too aggressive for media uploads.
2. Pipeline should never crash on a publishing failure — the card is already approved and saved, so a Telegram failure is a partial success, not a total failure.
3. Compress images before uploading to external APIs — there's no reason to send a 3MB image when Telegram will display it at 1000px wide anyway.

---

## Issue #009: Recap agent hallucinated match results for eliminated and withdrawn players

**Date:** May 29, 2026
**Project:** match-analyst-bot
**Severity:** Critical — published completely false match results
**Reporter:** Manual review

### Symptoms

Day 5 Roland Garros recap stated:
- "No. 1 Jannik Sinner began his title campaign with a commanding straight-sets victory" — Sinner was ELIMINATED the day before (we published a news card about it)
- "No. 3 Carlos Alcaraz advanced comfortably" — Alcaraz WITHDREW from the tournament weeks ago (we published a news card about it)

Both results were fabricated by the LLM. Neither appeared in any search results.

### Root Cause

Three failures compounding:
1. Tavily returned insufficient Day 5 results — either no articles indexed yet or garbled HTML from score pages
2. Sonnet hallucinated plausible results when search data was insufficient instead of saying "I don't have enough data"
3. The agent never cross-referenced against its own published content — it didn't know Sinner lost yesterday or that Alcaraz withdrew, despite both being published TennisMind cards

### Fix

1. Added anti-hallucination rule as the first prompt instruction: if search results don't contain explicit match results with scores, return INSUFFICIENT_DATA instead of fabricating
2. Added cross-reference against all published content: extract known eliminations and withdrawals from content/feed/, pass them to the prompt with explicit instruction that these players cannot have played
3. Added post-generation Haiku verification: checks the generated recap against known eliminations/withdrawals before saving — blocks the card if errors are found

### Lessons Learned

1. LLMs will confidently fabricate sports results when given insufficient data — this is the single most dangerous behavior for a content product
2. "Don't hallucinate" as a prompt instruction is not enough. You need structural guardrails: known-state cross-referencing and post-generation verification
3. The agent must read its OWN published content before generating new content — otherwise it contradicts itself
4. An empty recap is infinitely better than a wrong recap. The pipeline must have a "refuse to generate" option when data quality is insufficient

---

## Template for New Issues

## Issue #011: News agent regenerated deleted cards and produced stale tournament recaps

**Date:** June 2026
**Project:** match-analyst-bot
**Severity:** Medium — repetitive, low-value output
**Reporter:** Manual review

### Symptoms
After Roland Garros ended, the news agent produced three cards that were all RG result-recaps (Andreeva's win, Chwalinska's run, Zverev's win) — content already covered and no longer "news." A Zverev card that had been manually deleted regenerated identically on the next run.

### Root Cause
Three compounding issues:
1. News queries were still tournament-focused (Roland Garros) after the tournament had ended — so search kept returning RG result articles, which are history, not current news.
2. No deduplication: the agent didn't read its own published or pending content before generating, so it had no memory of what was already covered or deleted — the same lesson learned for recaps (Issue #009) had never been applied to news.
3. No quality bar distinguishing "current and newsworthy" from "stale recap."

### Fix
1. Pivot queries off the ended tournament: when no tournament is active, use a diverse forward/outward query set (injuries, coaching changes, rankings, comebacks, upcoming-season previews, schedule).
2. Deduplication: before generating, read published news (content/feed/) and pending candidates (feed-candidates/news/), extract core subjects, and instruct the agent not to reproduce them. Log deleted candidates to logs/rejected-news.jsonl so the agent won't regenerate anything the user explicitly rejected.
3. Quality bar in the prompt: reject ended-tournament recaps, generic filler, and already-covered stories; favour current/specific developments; generate fewer cards rather than padding. One real story beats three stale ones.

### Lessons Learned
1. Every generative agent needs to read its own output before producing more — the dedup lesson from recaps (Issue #009) applies to all agents, not just the one where it was first learned. A fix learned in one place should be audited across the whole system.
2. Queries tied to a transient context (a live tournament) must change when that context ends — otherwise the agent mines a past that's no longer relevant.
3. "Generate fewer, better" must be explicit. Left unconstrained, agents pad to fill a quota with low-value output.

---

## Issue #012: Image generation failed silently at candidate creation

**Date:** June 2026
**Severity:** Medium — cards sent to Telegram for approval had no image; one published to the public channel without an image (the Halle card)
**Trigger:** transient OpenAI API error during image generation at candidate creation time

### What happened
After the publish-path unification (which moved image generation from review-time to candidate-creation time), a transient API error hit during the first run. The except block caught it and returned False with only a print() — no log, no traceback. The candidates saved without an image_url in frontmatter, and when sent to Telegram appeared as text-only. One was approved via Telegram and published to the public channel without an image.

### Root cause
Every image-generation except block was silent — it caught the error, printed one line or nothing, and returned False. No log file, no traceback. This made transient failures invisible and indistinguishable from code bugs.

### Fix
Added `_log_image_error(context, exc)` helper that writes the full traceback to `logs/image-generation.log` AND prints a visible ⚠ with a pointer to the log. Applied to 5 exception sites:
- `_art_direct_card` (was completely silent)
- `_update_candidate_image_url`
- `generate_image_for_candidate` outer except
- `generate_image_for_candidate` inner collage fallback
- `generate_image` (was one line)

The Halle card was retrofitted with the correct image using `--generate-image-for slug`.

### Lesson
Silent exception handlers are production bugs waiting to happen. Every caught exception in an AI pipeline must log the full traceback. "It failed silently" should never be a valid answer to "what went wrong?" The move to candidate-creation-time image generation made this more critical — previously, a failure at review time was immediately visible to the human; now it happens in the background and must be logged.

---

## Issue #013: RAG dedup silently absent for non-news content types

**Date:** June 2026
**Severity:** High — duplicate content reached the public channel; the platform's core dedup feature was only working for one of several content types
**Reporter:** Manual review (spotted three duplicate cards in one morning)

### Symptoms
Three duplicate cards regenerated in a single day despite the RAG semantic-dedup system being "live":
1. A news card about Mboko's injury regenerated (yesterday's version was un-actioned, sitting in "saved_later")
2. An insight about defending champion Tatjana Maria regenerated (un-actioned the day before)
3. An insight "Queen's Club becomes first grass tournament to host both ATP and WTA events" regenerated, despite a near-identical insight ("Queen's Club makes WTA history after 50-year absence") having been PUBLISHED two days earlier. These are the same story in different words — exactly what semantic dedup exists to catch.

### Root Cause
Three distinct bugs, one shared origin. The RAG dedup system was built and tested with an explicit v1 scope of "news-agent dedup only" (PDL-012). When the other content types flowed through the same pipeline, the dedup logic was never extended to them. The fix learned for one agent was never audited across all agents.

1. **publish_card wrote only news to memory.** A guard `if card.get("type") == "news"` meant published insights, history, form, stat, and gear cards were never written to RAG memory. The Queen's insight (type "history") was published but left no trace, so the next day's near-duplicate had nothing to match against. (The reject path had the same guard — rejected non-news cards also failed to enter memory.)
2. **Insights generation never called the dedup check.** `_run_generate_agent` had only an exact-slug check; `is_semantic_duplicate` was wired into news generation alone. Insights had zero semantic dedup.
3. **Lifecycle gap — un-actioned candidates aren't in memory.** A card is only written to memory on publish or reject. A generated-but-un-actioned card (status "sent" or "saved_later", e.g. a card sitting in Telegram awaiting a decision) is in no index, so the next generation run regenerates it.

### Fix
1. Removed the `== "news"` guard in both publish_card and the reject path — all content types now write to memory with their correct content_type. Backfilled memory.json with all already-published cards of every type (previously only news).
2. Added `is_semantic_duplicate` to `_run_generate_agent` (insights) at the same 0.82 threshold, keeping the slug check as a second line. Audited every candidate-creating path (news, insights, recap, prediction) to confirm the check runs in all of them — not just the one where the bug was first seen.
3. Closed the lifecycle gap so an un-actioned candidate cannot regenerate (cards entering the review queue are tracked in memory with a status that flips through pending → published/rejected as they're actioned).

### Verification
Re-ran the Queen's test: embedded the regenerated Queen's insight and searched memory — it now matches the earlier published Queen's card above the 0.82 threshold and is blocked. Confirmed memory.json now contains all content types, and the dedup check fires in every generation path.

### Lessons Learned
1. **A fix scoped to one agent must be audited across all agents.** This is the same lesson as Issue #011 (news dedup), now proven again: the dedup pattern built for news silently failed everywhere else it should have applied. When a capability is added to one part of a multi-agent system, explicitly check every other part that shares the pattern.
2. **"v1 scope: news only" is a real boundary that must be tracked.** The dedup was correctly scoped to news for v1 (PDL-012) — but the scope boundary wasn't documented as an open gap, so it read as "dedup is done" when it was "dedup is done for news." Deliberate scope limits need to be visible as outstanding work, not invisible assumptions.
3. **Type guards (`== "news"`) are a code smell in a multi-type pipeline.** A single line restricting behavior to one type silently excludes all others. Where logic should apply to every type, the default should be "all types" with explicit exclusions, not "one type" with everything else implicitly dropped.
4. **A feature being "live" is not the same as a feature being "complete."** RAG dedup was demonstrably working (on news) and therefore assumed working (everywhere). Visible success on a subset masked silent absence on the rest.

---

## Issue #014: News agent produces stale, insignificant, and sometimes false cards

**Date:** June 2026
**Severity:** High — trust-breaking; output cannot be published without manual fact-checking, which eliminates the value of automation
**Examples:** R1 exit story published on R16 day; McNally–Navarro (both low-ranked) flagged as "significant upset"; Serena/Mboko doubles story published after they had already exited via walkover
**Root cause:** three compounding structural failures across discovery, verification, and judgment

### Discovery failure
The news agent calls Tavily through a deprecated wrapper (TavilySearchResults) with no time-axis parameters — no topic="news", no days, no time_range, no include_domains. Tavily's news-mode returns results with published_date and enforces recency; general-mode returns results ranked by relevance and link density. We called a date-capable API in dateless mode. Older, well-linked articles (R1 results) outrank fresher ones (R16 results) because they've accumulated more links over the tournament. Additionally: queries weren't anchored to tournament state (no round number injected), and no trusted-domain steering used.

Plain English: we asked for "tennis articles" instead of "today's tennis articles from trusted sources." The search tool could have given us fresh, dated results the whole time — we just never asked it to.

### Verification failure
No published_date gate exists in code. The LLM was asked to "judge freshness" from text snippets, which is impossible when articles don't include their own date in the snippet. No event-date grounding: the system doesn't know what round the tournament is on, so it cannot flag a "first-round exit" story as stale on R16 day. Single-snippet claims are never re-verified against a second source.

Plain English: we were reading newspaper clippings with the dates cut off, then asking the model to guess which ones were from today.

### Judgment failure
Significance decisions were made by the LLM from prompt instructions ("is this interesting?") without any structured data. No ranking data: the agent doesn't know that #25 vs unranked is a minor match. No marquee player model: "upset" was pattern-matched from article phrasing, not computed from ranking gap. The agent guesses importance instead of measuring it.

Plain English: the system had no editorial rulebook — it was trying to infer what a tennis fan cares about without knowing who the fans' favourite players are or what the rankings actually say.

### Proposed fix
See PDL-016 and docs/news-agent-rebuild.md for the full solution. In summary: replace dateless discovery with date-aware Tavily news-mode + RSS feeds; add a hard 48h published_date gate in code; compute current tournament round from the calendar; score significance deterministically from ATP/WTA rankings and a marquee-player list. Discovery stays agentic; freshness and significance become code, not vibes.

### Lesson
"Using Tavily" is not the same as "using Tavily well." A tool that supports date-filtering used without date parameters is a dateless tool. Always verify that API parameters match the use case, not just that the API is connected. The fix that unlocks most of the value here is a parameter change, not an architecture change.

---

## Issue #015: Significance scoring dropped SF results and inflated QF scores via body-text scanning

**Date:** June 2026
**Project:** match-analyst-bot
**Severity:** High — correct late-round results missed; stale early-round results surfaced instead
**Reporter:** Live diagnostic after `--generate-news` surfaced QF results on Sunday instead of SF results

### Symptoms

- Saturday's SF results (Raducanu into Queen's final) absent from generated cards on Sunday
- Sunday generated Boulter/Rybakina QF story instead, as if it was Saturday
- "Brits Emma Raducanu and Katie Boulter through to Queen's quarterfinals" scored [11] — incorrectly high

### Root cause: two compounding flaws in `score_story()`

**Flaw 1 — No stage signal.** `score_story()` had no signal for tournament stage. Raducanu's SF headline "'I'm back and better' - Raducanu reaches Queen's final" scored only [4] (marquee only) — one below the threshold of 5. Opponent Jovic was outside the top 20. "Powers into" isn't in the upset vocabulary. Queen's is a 500-level event (not GS/1000). The article existed in the pool but was gated out.

**Flaw 2 — Full-body player detection.** `name_hit()` scanned `title + content` to find player names. Articles often mention top-ranked players incidentally (doubles asides, historical context, quotes). "Brits Raducanu and Boulter through to Queen's quarterfinals" scored [11] because the body mentioned Mboko (top-10 at the time) and Zverev (marquee) as context. Score: Raducanu marquee (+4) + Mboko top-10 (+5) + Zverev marquee (+4) = would've been even higher if not capped, then injury term in body (+3) = 11. The article was a QF recap — it had no business scoring that high.

### Fix

**Stage signals:** Added +4 for "final" and +2 for "SF/last four" detected from **title only**. Added a floor rule: marquee/top-20 player at SF or later → unconditional pass (score = max(score, threshold)).

**Title-only player detection:** Changed `name_hit()` to `name_in_title()` — ranking and marquee checks now scan **title only**. Contextual signals (injury/comeback, GS/1000 from active tournament calendar) use title + lead paragraph where appropriate.

**Marquee list fix:** Changed "Serena" → "Serena Williams" in `data/marquee-players.json` so titles that say "Williams" (without "Serena") now trigger the marquee signal via the multi-word name match.

### Verification

Post-fix `--discover-news` output (June 14):
- "'I'm back and better' - Raducanu powers into Queen's final" → [8] ✅ (marquee +4, stage: final +4)
- "Emma Raducanu reaches last four at Queen's" → [6] ✅ (marquee +4, stage: SF +2)
- "Raducanu loses Queen's final as trophy wait continues" → [8] ✅
- "Brits Raducanu and Boulter through to QF" → too old (52h gate), but hypothetical title-only score = [4] 🚫 correct

### Lesson

Score the EVENT, not the article. Titles are written to capture the story subject; bodies contain all kinds of contextual mentions. The fix pattern: use the structured short-form (title) for who-is-this-about; use the long-form only for signals that can't be in a title (injury confirmed in lead para). Also: tournament stage is a first-order editorial signal — a marquee player reaching a final is significant regardless of opponent rank or tournament tier.

---

## Issue #016: Deterministic significance scorer overruled by Sonnet's internal editorial judgment

**Date:** June 2026
**Project:** match-analyst-bot
**Severity:** High — stories that passed the gate were silently dropped by the LLM before a card was written
**Reporter:** Diagnostic after Stuttgart final (Shelton beats Fritz, [5] pass) produced no card despite reaching Sonnet in the 7-story pool

### Symptoms

- `--generate-news` on Sunday evening: Stuttgart final not generated. Pool had 7 stories; Sonnet produced 1-2 cards, always picking Queen's stories over Stuttgart.
- Repeatable: even after removing the significance-filtering language from the curation prompt and raising the card cap from 3 to 6, Sonnet still wrote 2 cards and skipped Stuttgart.
- Diagnostic confirmed the story cleared all gates (48h, relevance, significance [5], round-staleness) and was in the pool Sonnet received.

### Root Cause (3 compounding issues)

**1. Dual significance filters.** `build_news_curation_prompt()` included a "PRIORITIZE/DE-PRIORITIZE" block that told Sonnet to independently judge tournament significance. This re-applied significance logic AFTER the deterministic scorer had already decided. Sonnet's filter (ATP 250 = skip) overrode the scorer's verdict ([5] = pass). Stuttgart, being an ATP 250, was silently dropped.

**2. Already_covered list suppressed same-player stories.** "Ben Shelton cracks top 5 for first time" was published weeks earlier. The covered-section instruction said "do NOT generate any card whose CORE SUBJECT matches." Sonnet interpreted "Shelton" as the core subject shared with Stuttgart, and skipped it — same player ≠ same event.

**3. Post-generation dedup was the only dedup.** The semantic memory dedup ran only AFTER Sonnet generated cards. This meant Sonnet spent its limited card budget writing Raducanu/Queen's and Boulter/Rybakina stories (all already in memory), leaving no budget for Stuttgart. By the time dedup blocked the duplicates, Stuttgart had never been written.

### Fix

Three changes:

**Prompt layer:** Removed the "TOURNAMENT SIGNIFICANCE — PRIORITIZE/DE-PRIORITIZE" block from `build_news_curation_prompt()`. Rewritten: "Every story in the pool passed the gate — your job is to write cards, not re-decide significance." Fixed the covered-section instruction from "core subject matches" to "exact same EVENT — same player ≠ same event; 'Shelton wins Stuttgart' and 'Shelton cracks top 5' are different events, write both."

**Pool formatting:** `collect_search_content_news()` now groups pool items by event (title-word overlap ≥50%), numbers each group explicitly as "STORY N (score: N)", and passes a "POOL: N distinct event(s)" header. Sonnet sees the exact count of stories it needs to write, sorted by score.

**Pre-filter (semantic + keyword):** Before sending the pool to Sonnet, each story group is checked against the memory store (semantic similarity threshold 0.78 — slightly below the post-gen threshold of 0.82 to account for raw article vs. generated card embedding divergence) AND against the already_covered title list (2+ significant words in common). Groups that are already covered are dropped before Sonnet sees the pool. This gives Sonnet a clean pool of genuinely new stories to write.

### Verification

After fix: pre-filter correctly dropped 4 already-covered stories (Williams/Muchova, Raducanu final ×2, Raducanu SF), leaving Sonnet with 3 genuinely new events. Sonnet wrote cards for all 3; within-batch dedup collapsed 2 Raducanu articles to 1; net 2 saved: Raducanu "double duty" angle + Stuttgart final. Stuttgart card in Telegram.

### Lesson

The deterministic scorer and the LLM prompt must not both be significance filters. Once you've built a deterministic gate, remove the equivalent logic from the LLM prompt — otherwise the LLM silently overrides the gate using different (and harder-to-debug) criteria. Division of labor: gate = code, writing = LLM. Post-generation dedup is not enough when the card budget is small; a pre-filter using the same dedup logic gives the LLM a pre-curated input rather than asking it to curate from a dirty pool.

---

Copy this template for each new issue:

```
## Issue #017: @resvg/resvg-js fontBuffers missing from .d.ts — production build fails

**Date:** June 15, 2026
**Project:** tennismind-web
**Severity:** High — production build blocked; news tile image generation broken at deploy time
**Reporter:** `npm run build` TypeScript error

### Symptoms

- `npm run build` failed with a TypeScript error on `lib/cards/newsCard.ts` line 233: property `fontBuffers` does not exist on the Resvg font config type
- Error only appeared on build; local `npx tsx` runs worked fine (tsx skips type-checking)
- Switching to the type-safe `fontFiles` API caused silent font failure: the card rendered correctly (background, frames, rule, icon) but all text was blank

### Investigation

1. Checked installed version: `@resvg/resvg-js@2.6.2`
2. Read `node_modules/@resvg/resvg-js/index.d.ts` — `fontBuffers` absent; only `fontFiles`, `fontDirs`, and family-name options present
3. Read `node_modules/@resvg/resvg-js/README.md` — `fontBuffers` documented as "New in 2.5.0" with a WOFF2 example; confirms it exists at runtime
4. Switched to `fontFiles` as the "type-safe" fix — rendered a card → 11K output (vs 44K with fonts), all text blank
5. Checked `@fontsource/newsreader` and `@fontsource/inter` for TTF/OTF files → none; packages ship WOFF/WOFF2 only
6. Confirmed root cause: `fontFiles` only loads TTF/OTF via resvg's fontdb; WOFF silently fails through that path

### Root Cause

The `@resvg/resvg-js@2.6.2` `.d.ts` was never updated to include `fontBuffers`, which was added to the runtime in v2.5.0. The fonts in `assets/fonts/` are WOFF1 files (from `@fontsource`), which only load correctly via `fontBuffers`. `fontFiles` silently ignores WOFF inputs and produces blank text with no error.

### Fix

Added a local type extension in `lib/cards/newsCard.ts` that augments the package's font options with `fontBuffers`:

```typescript
type ResvgFont = NonNullable<ResvgRenderOptions["font"]> & {
  fontBuffers?: Uint8Array[];
};
```

Font config is assigned through `ResvgFont`, satisfying TypeScript while using the correct runtime API. `fontBuffers` remains in use; `fontFiles` was reverted.

### Lessons Learned

`fontFiles` ≠ "works with any font file." resvg's fontdb only loads TTF/OTF via that path — WOFF silently produces blank text with no warning. When a package's `.d.ts` is behind its runtime (documented feature missing from types), the fix is a local type extension, not switching to a different API that appears type-safe but breaks the actual output.

---

## Issue #018: ATP/WTA official RSS feeds dead — silent discovery gap

**Date:** June 15, 2026
**Project:** match-analyst-bot
**Severity:** Medium — reduces news coverage of official ATP/WTA content; BBC/ESPN RSS still functional
**Reporter:** Investigation after Libema Open miss

### Symptoms

- ATP Tour RSS (`atptour.com/en/news/rss`): 403 Forbidden on all requests, including browser User-Agent
- WTA Tennis RSS: 404 on all candidate paths; no RSS endpoint exists anywhere on wtatennis.com
- ATP news was listed in `RSS_FEEDS` at some point and silently dropped; WTA was never added after testing

### Investigation

1. Tested `atptour.com/en/media/rss-feed-results`, `atptour.com/en/news/rss` — both 403 with curl default UA
2. Retested with full browser User-Agent (Chrome 124) — still 403; intentional CDN-level block
3. Tested `wtatennis.com` for any RSS paths — all 404; site is a React SPA using PulseLive API
4. Probed PulseLive API at `api.wtatennis.com` — `content/wta/en/*` returns 400 (requires session cookie)
5. Tested Google News RSS `news.google.com/rss/search` — returns 200, includes source labels ("ATP Tour", "WTA Tennis")
6. Confirmed fresh ATP/WTA content from Google News with `tennis+results+2026` query: 3 items within 48h (WTA Tennis 15h, ATP Tour 41h, WTA Tennis 42h)

### Root Cause

ATP intentionally blocks all RSS/crawl access via CDN rules. WTA decommissioned their RSS feed when they migrated to a React SPA (PulseLive platform) — no replacement was provided.

### Fix

Added `fetch_google_news_atp_wta()` as a new discovery layer in `collect_news_pool()`:
- Parses Google News RSS with `tennis+results+2026` query
- Filters by `_GNEWS_ACCEPTED_SOURCES` (ATP Tour, WTA Tennis, Tennis365, etc.) + 48h freshness gate
- For each accepted item, fetches content via Tavily title search (Tavily already includes `atptour.com` and `wtatennis.com` in trusted domains)
- Deduplicates against existing BBC/ESPN RSS items before adding to pool

### Lessons Learned

Official sport federation RSS feeds are maintained on IT timelines, not editorial timelines — they can die silently. Google News RSS is a reliable proxy: it indexes content from any source, provides clean publisher name labels, and has no auth requirement. The architecture should treat `_GNEWS_ACCEPTED_SOURCES` as a curated list of publishers we trust, maintained alongside `marquee-players.json`.

---

## Issue #019: Marquee scorer capped at one player per story — dual-marquee matches scored as single-player

**Date:** June 17, 2026
**Project:** match-analyst-bot
**Severity:** Medium — newsworthy dual-marquee matchups scored below significance threshold and never reached card generation
**Reporter:** Manual review after adding Giovanni Mpetshi Perricard to the marquee list

### Symptoms

Moutet vs Mpetshi Perricard (Queen's Club R1, 6/7 6/4 7/6 — three-set all-French thriller) was not discovered as a candidate story. The match result article would have scored only **4** despite both players being on the marquee list — one below the threshold of 5.

### Root Cause

`score_story()` used `next()` to find the first marquee name in the title, scored it +4, and stopped:

```python
marquee_hit = next((n for n in marquee_names if name_in_title(n)), None)
if marquee_hit:
    score += 4
    reasons.append(f"marquee ({marquee_hit})")
```

A match between two marquee players scored identically to a match involving only one. The second marquee player was silently ignored.

### Fix

Changed to iterate all marquee hits — first hit +4, each additional +2:

```python
marquee_hits = [n for n in marquee_names if name_in_title(n)]
marquee_hit = marquee_hits[0] if marquee_hits else None
for i, mh in enumerate(marquee_hits):
    pts = 4 if i == 0 else 2
    score += pts
    reasons.append(f"marquee ({mh})")
```

Verified immediately: "Zverev digs in to oust Kopriva in Halle, equals Nadal's ATP..." scored **[11]** — top-10 (Zverev) +5, marquee (Nadal) +4, marquee (Zverev) +2 — confirming stacking works.

### Lessons Learned

`next()` on a scored dimension is a semantic bug: it finds "is there a marquee player?" instead of "how many marquee players are here?" Whenever a dimension can appear multiple times in a single item, the scorer should aggregate, not short-circuit. Matchups between two known players are inherently more significant than unilateral stories — the scorer should reflect that.

---

## Issue #020: --generate-news scored 9 passing stories then produced 0 cards — two stacked silent failures

**Date:** June 2026
**Project:** match-analyst-bot
**Severity:** Critical — entire card generation step produced no output with no visible error
**Reporter:** Manual observation after `--generate-news` ran to completion with 0 candidates saved

### Symptoms

- `--discover-news` showed 9 stories passing the significance gate (threshold ≥5)
- `--generate-news` ran to completion with no crash, no error message, 0 cards saved
- The pipeline appeared to succeed — the only sign of failure was the absence of output

### Root Cause — two stacked failures

**Failure 1: single-tournament curation filter discarded concurrent-tournament stories**

`build_news_curation_prompt()` called `get_current_tournament()` — a function that returns one tournament — and injected:

```
DURING Halle: Only cover stories related to Halle. Ignore all other ATP/WTA news.
If nothing interesting happened at Halle in the last 24-48 hours, return 0 cards.
```

Three tournaments were active simultaneously (Halle, Queen's Club, Nottingham). The 9 passing stories were spread across all three. The curation prompt told Sonnet to ignore everything except Halle — so any story from Queen's or Nottingham was silently discarded before a card was written. Sonnet obeyed and returned 0 cards.

**Failure 2: JSON parse failure returned silently**

When Sonnet's response couldn't be parsed as a JSON array (prose preamble before the `[`), `generate_cards()` caught the `JSONDecodeError` and returned `[]` with only a `print()`:

```python
except json.JSONDecodeError:
    print("Failed to parse response as JSON")
    return []
```

No retry. No traceback. No log file entry. The empty list propagated silently up the call stack, and the pipeline printed its normal completion message.

### Fix

**Tournament filter:** replaced `get_current_tournament()` with `get_active_tournaments(lookahead_days=1)` (returns a list). The injected context now names ALL active tournaments and explicitly removes the filter:

```
CONTEXT: TODAY IS {date}. Active tournaments right now: Halle, Queen's Club, Nottingham.
Cover stories from ALL active tournaments and breaking player news.
The significance scorer already decided what is worth publishing —
do NOT apply a tournament filter. Write a card for every story in the pool.
```

**JSON parse failure:** added `_strip_json_fences()` to find `[` buried after prose preamble, plus a retry with a strict repair prompt ("return ONLY the JSON array, start with `[`, end with `]`"). On second failure, logs `🚨 GENERATION FAILED` with the raw response to stderr — never silently returns `[]`.

### Lessons Learned

1. **A single-tournament selector in a multi-tournament context is a silent data loss bug.** When three tournaments run concurrently, any code path that filters to one will discard 2/3 of the data without warning. Always use the plural form (`get_active_tournaments`) when multiple events can overlap.
2. **"Return 0 cards if nothing happened" is a dangerous fallback phrase in a prompt.** Combined with an overly narrow filter, it gives the LLM permission to produce empty output and report success. The prompt should never offer silence as a valid outcome when a non-empty pool was supplied.
3. **Silent `except: return []` in a generation function is a production bug.** An empty list is indistinguishable from "nothing to generate" — the pipeline can't tell whether it ran correctly or crashed. Every parse failure must log the full response and either retry or raise visibly.
4. **Two silent failures can compound into a completely invisible total failure.** Neither bug alone would have been obvious — the filter would have left some Halle cards, the parse retry would have recovered. Together they produced zero output with a success exit code. Stack-rank silent failures as the highest-severity class of bug.

---

## Issue #021: WTA 500 Berlin (bett1open) invisible to pipeline; top-10 Halle players missing from discovery pool

**Date:** June 18, 2026
**Project:** match-analyst-bot
**Severity:** High — world #1 WTA player's tournament win produced zero candidates; multiple top-10 ATP players' match results never reached scoring
**Reporter:** Manual review after `--generate-news` produced no card for Sabalenka's Berlin win and nothing for Medvedev/Fritz/Auger-Aliassime at Halle

### Symptoms

- `--generate-news` output: no Sabalenka story despite her winning at bett1open (Berlin)
- Discovery pool contained no articles mentioning Medvedev, Fritz, or Auger-Aliassime results from Halle, despite all three playing R2 that day
- Active tournament banner showed `Halle Open | Queen's Club | Nottingham Open` — no Berlin

### Root Cause — two independent gaps

**Gap 1: bett1open absent from TOURNAMENT_CALENDAR_2026**

`TOURNAMENT_CALENDAR_2026` had no entry for bett1open (Berlin, WTA 500, grass, June 15–21). `get_active_tournaments()` returned only `[Halle, Queen's, Nottingham]`. As a result:
- `fetch_google_news_atp_wta()` never generated a `"bett1open 2026 tennis"` Google News query
- `build_news_queries()` never emitted `"bett1open R16 results"` Tavily queries
- The curation prompt listed Berlin as neither active nor relevant

Sabalenka is both WTA #1 (top-10 +5) and on the marquee list (+4) — any article with her name in the title would score [9]. The problem was no article appeared at all. The one Berlin article that surfaced ("Serena/Muchova doubles") came via BBC RSS by chance, not via a targeted query.

**Gap 2: Top-10 ATP singles results produce roundup articles with generic titles**

Medvedev (rank 8, marquee), Auger-Aliassime (rank 4, marquee), Fritz (rank 9), Shelton (rank 5) are all correctly in `rankings.json`. The scorer would give them [5]–[9] if their names appeared in any title. The problem was upstream: BBC and ESPN don't write standalone articles for routine top-10 wins at ATP 500s — those only appear in roundup pieces titled "Halle Day 2 results" or "R16 recap" with no player name in the title. Title-only scoring (introduced to fix Issue #015's body-inflation problem) means a roundup with Medvedev's result in the body but not the title scores [0] and never reaches the significance gate.

Tavily queries for `"Halle R16 results"` returned +0 net-new articles because everything it found was already in the pool — the same generic-title roundups.

### Fix

**Gap 1:** Added `{"name": "bett1open", "start": "2026-06-15", "end": "2026-06-21", "surface": "grass", "tier": "500", "tour": "WTA", "recap_eligible": False}` to the calendar. bett1open now appears in `get_active_tournaments()`, generates its own Google News and Tavily queries, and is listed in the curation prompt.

**Gap 2:** Added a player-targeted query layer to `build_news_queries()`: for multi-tournament weeks, generate one Tavily query per top-5 ATP/top-5 WTA player combining their last name with the active tournament names (e.g. `"Sinner Halle Open Queen's Club 2026"`). Capped at 4 queries to stay within budget. Raised total query cap from 9 to 13 to accommodate the new layer.

### Lessons Learned

1. **Every WTA event running concurrently with ATP grass events must be in the calendar.** The pre-Wimbledon weeks have 4-event stacks (Halle, Queen's, Nottingham, bett1open). Missing one silently removes an entire tour's results from the pipeline.
2. **Title-only scoring is correct but requires query compensation.** Moving from body-text to title-only scoring (Issue #015) was the right fix for inflation, but it created a blind spot: players covered only in roundup bodies are invisible to the scorer. The counter-measure is richer queries that surface player-specific articles in the first place, not reverting to body scanning.
3. **`+0 net-new from Tavily` is a signal worth investigating.** When Tavily returns no new articles on a day with multiple active tournaments and top-10 players competing, it often means the queries are too generic to find the player-specific articles that do exist.

---

## Issue #022: --force failed silently for passing stories; stage guard blocked advancing-round results

**Date:** June 20, 2026
**Project:** match-analyst-bot
**Severity:** High — "Fritz defeats Zverev to reach Halle final" [13] was blocked by `--force` and by the pre-filter despite being the day's top story; 0 cards generated
**Reporter:** Manual observation after `--generate-news --force "Fritz defeats Zverev"` produced no output

### Symptoms

- `--force "Fritz defeats Zverev"` printed `⚠ --force 'Fritz defeats Zverev' matched no below-threshold stories in today's pool.` and generated 0 cards
- The story scored [13] and appeared in the significance log as ✅ PASS
- Pre-filter log showed: `Fritz defeats Zverev once again to reach Halle final` blocked by `Cobolli & Shelton Knock Out Zverev in Halle Doubles`

### Root Cause — two stacked failures

**Failure 1: `--force` only scanned `sig_drop`, not `sig_pass`**

The force logic searched only the below-threshold bucket:
```python
rescued = [r for r in sig_drop if fq in (r.get("title") or "").lower()]
```
Fritz scored [13] — comfortably in `sig_pass`, never in `sig_drop`. The warning was technically accurate ("no below-threshold stories match") but the story wasn't below threshold at all. It had already passed significance and was waiting for the pre-filter, which blocked it. `--force` had no path to bypass the pre-filter for a story that was already passing.

**Failure 2: stage guard required `old_stage > 0`, blocking finals against stageless cards**

The stage-progression guard (added to fix Issue #020's QF→final false duplicate) had the condition:
```python
if new_stage > old_stage > 0:
    is_dup = False
```
"Fritz defeats Zverev to reach Halle final" (new_stage=5) was matched against "Cobolli & Shelton Knock Out Zverev in Halle Doubles" — a doubles result with no round indicator (old_stage=0). The `> 0` requirement caused the guard to skip: `5 > 0` is true, but `0 > 0` is false, so the whole condition failed. A finals result was blocked by a stageless doubles card sharing only the player name "Zverev".

### Fix

**Fix 1:** Extended `--force` to also scan `sig_pass` and mark matching stories as `_forced=True`, which causes the pre-filter to bypass them:
```python
rescued_pass = [r for r in sig_pass if fq in (r.get("title") or "").lower()]
if rescued_pass:
    for r in rescued_pass:
        r["_forced"] = True
        # logged as: 🔑 FORCED [13] ... (already passes significance — pre-filter bypassed)
```

**Fix 2:** Changed the stage guard condition from `new_stage > old_stage > 0` to `new_stage >= 3 and new_stage > old_stage`. Any QF/SF/final (stage ≥ 3) is never blocked by a stageless card (old_stage=0). Fritz final (5) > Doubles (0) → clears. Fritz final (5) > Fritz QF (3) → clears. Raducanu final (5) > Raducanu SF (4) → clears.

### Lessons Learned

1. **`--force` must bypass every automated gate, not just the one where the story is currently stuck.** The force was designed for below-threshold stories, but the same override intent applies to pre-filter blocks. An editorial override means "publish this regardless" — it needs to propagate through the entire pipeline.
2. **A stage guard that requires `old_stage > 0` silently fails for the most common case: a player's later-round result matched against their earlier mention in a roundup or doubles article.** Stageless cards are common (injury news, doubles results, profile pieces that mention a player); any final/SF/QF result should clear the guard against them.
3. **Two silent failures compound into a total failure, again.** The story was at [13] — the highest score of the day — and generated 0 cards. Neither failure alone would have been obvious without reading the pre-filter log carefully.

---

## Issue #023: Tournament finals by lower-ranked players score [0] and never surface

**Date:** 2026-06-21
**Project:** match-analyst-bot
**Severity:** High — entire class of major stories silently dropped
**Reporter:** User noticed neither Queen's nor Halle final was published despite being the day's lead stories

### Symptoms

- "Cerundolo wins biggest title of career at Queen's" → scored [0] "no signals" — never entered pool
- "Cerundolo tops Paul to win Queen's Club title" → scored [0] "no signals"
- "Bouzkova beats Navarro to clinch Nottingham title" → scored [0]
- "Tiafoe beats Fritz to win all-American Halle final" → scored [9], passed significance, but was blocked by pre-filter as duplicate of the "Fritz beats Zverev to reach Halle final" story published the day before
- Agent published a Murray interview instead

### Root Causes

**Root cause 1 (scoring):** `is_final` in `score_story()` checked for the word `"final"` and exact phrases `"wins title"`, `"lifts trophy"`. But publishers often use bare `"title"` ("wins biggest title"), `"champion"`, or `"clinches"` in headlines. These words weren't recognised as final-stage indicators, so articles scored 0. With no top-10 or marquee player in the title (Cerundolo is ranked ~23, Bouzkova ~40), the score stayed 0 — below threshold.

**Root cause 2 (floor rule):** The existing floor rule only promoted scores to threshold for featured players (top-20/marquee) at SF+. There was no floor for the tournament final itself. A 500-level final between two players outside the top 20 scored below the gate by design.

**Root cause 3 (pre-filter):** Fritz-Zverev SF ("Fritz beats Zverev to reach Halle final") was published Thursday. Friday's Tiafoe-Fritz Final ("Tiafoe beats Fritz to win all-American Halle final") matched against it in semantic memory: shared entity "Fritz", both at stage 5. Stage guard requires `new_stage > old_stage` (5 > 5 fails). Entity guard doesn't fire because Fritz overlaps. Result: the Final story is blocked as a duplicate of the SF story.

### Fix

**Fix 1 — Expanded `is_final` detection:** Added bare `"champion"`, `"clinches"`, `"crowned"` to `is_final`, and a combined check `title + (win|wins|beats|tops|claims)` to catch "wins the title" phrasing where "wins" and "title" are separated by the tournament name.

**Fix 2 — Tournament-final floor:** Added a second floor rule: if `is_final` is True and score is still below threshold, force score to threshold. Any tournament final is always significant regardless of player ranking.

**Fix 3 — Stage guard B2 (win-indicator check):** Added sub-check to the pre-filter stage guard: if the new story is at SF+ stage, `new_stage >= old_stage`, AND the title contains a win indicator (`win`, `title`, `champion`, `clinches`, `claims`, `crowned`) — clear the duplicate flag. "Tiafoe wins Halle final" is not a duplicate of "Fritz reaches Halle final" regardless of equal stage.

**Fix 4 — `_STAGE_ORDER` level 6:** Added `"title"`, `"champion"`, `"clinches"`, `"crowned"` at stage 6 (above `"final"` at 5). Title-win articles now parse as a higher stage, so they naturally satisfy the existing `new_stage > old_stage` guard even without the B2 check.

### Verification

```
✅ [ 5] Cerundolo wins biggest title of career at Queens    → stage: final, floor: tournament-final
✅ [ 5] Cerundolo tops Paul to win Queens Club title        → stage: final, floor: tournament-final
✅ [ 9] Tiafoe beats Fritz to win all-American Halle final → top-10 (Fritz), stage: final
✅ [ 5] Bouzkova beats Navarro to clinch Nottingham title   → stage: final, floor: tournament-final
```

Pre-filter stage guard: Tiafoe-Fritz Final vs Fritz-Zverev SF → B2 clears (win=True, new_stage=5 ≥ old_stage=5).

### Lessons Learned

1. **"Title" and "final" are not synonymous in sports headlines.** Publishers use "title", "champion", "clinches" interchangeably with "final" — the scorer must recognise all of them.
2. **Any tournament final is always significant.** The player-tier requirement on the floor rule was wrong. A 500-level final between two rank-22 players is always publishable news.
3. **The stage guard only considered `new_stage > old_stage`, missing the case where new and old are both stage 5 but represent fundamentally different events** (reaching a final vs winning it).

---

## Issue #024: Video agent missed Tennis TV finals because query didn't match "For The Title" format

**Date:** 2026-06-21
**Project:** match-analyst-bot
**Severity:** Medium — finals-day video discovery silently incomplete
**Reporter:** User noticed Cerundolo vs Paul highlights visible on Tennis TV YouTube but not surfaced by `--generate-video`

### Symptoms

- `--generate-video` found the Halle Final (Fritz vs Tiafoe) but not the Queen's Club Final (Cerundolo vs Paul)
- Running the standard queries returned only SF videos and day-compilation clips for Queen's
- The video existed on Tennis TV's YouTube channel and was publicly available

### Investigation

1. Ran targeted Tavily searches for the Cerundolo-Paul final directly
2. Found `youtube.com/watch?v=JZYZQvA8vV0` — "Francisco Cerundolo vs Tommy Paul For The Title" — in results for the query "Tommy Paul Francisco Cerundolo Queens Final Highlights Tennis TV 2026"
3. Checked allowlist: the signal `"For The Title"` was already present in the Tennis TV entry — the video would have passed validation if returned
4. Conclusion: the video wasn't missing from YouTube; it was missing from our query results

### Root Cause

Tennis TV uses two different title formats:
- **Standard highlights:** `"Cerundolo vs Nakashima | HSBC Championships 2026 SF Highlights"` — contains "Final Highlights" or "SF Highlights"
- **Finals day branding:** `"Francisco Cerundolo vs Tommy Paul For The Title"` — no round word, no "highlights"

The discovery queries targeted `"Final highlights"` phrasing exclusively. Tavily matched those queries to videos containing those exact words. The Cerundolo-Paul video title contained neither, so it was never returned despite the `"For The Title"` signal already being in the allowlist.

### Fix

Added a dedicated `"For The Title"` query that runs on finals day for all ATP tournaments:

```python
queries.append((f"{short} 2026 For The Title tennis", name))
```

This runs alongside the existing `"Final highlights"` query when `min_stage >= 4`, so both Tennis TV title formats are covered.

### Lessons Learned

- Having the right allowlist signal is not enough — the query also needs to return the video in the first place
- When a video is known to exist but isn't found, test queries directly against Tavily before assuming the video isn't indexed
- Official channels use different title branding for flagship content (finals) vs routine matches; query strategy should cover both patterns

## Issue #025: Serena Wimbledon singles wildcard not published — three stacked failures

**Date:** 2026-06-23
**Project:** match-analyst-bot
**Severity:** High — major story missed entirely; multiple pipeline failures compounded
**Reporter:** User noticed the story was not broadcast despite being top tennis news

### Symptoms

- Serena Williams receiving a Wimbledon singles wildcard (her first singles match since retiring in 2022) was not published
- Only the earlier doubles wildcard (Serena + Venus) from June 17 had been covered
- Running `--force "Serena Williams Wimbledon singles wildcard"` generated unrelated cards (Vondrousova, Draper, Osaka/Zheng) alongside or instead of the Serena card
- Vondrousova card appeared twice in the review queue (two different titles, both pending)

### Investigation

1. Checked `orchestrator-cron.log` — found a `404 Not Found` error on model `claude-sonnet-4-20250514`; the orchestrator had been crashing on every cron run since the model was retired
2. The story was in the Tavily pool but was blocked by the pre-filter as "covered" — keyword overlap with the already-published doubles wildcard card matched "Serena" + "Wimbledon"
3. Ran `--force` to bypass the pre-filter, but `--force` did not filter the pool to the requested story — all uncovered stories were passed to Sonnet, generating unintended cards
4. Semantic dedup was skipped run-wide during `--force`, so Vondrousova (generated in run 1) was generated again in run 2 with a slightly different title that had a different slug, bypassing slug dedup

### Root Cause

Three independent failures stacked:

**1. Orchestrator model retired.** `orchestrator.py` was hardcoded to `claude-sonnet-4-20250514`, which Anthropic retired. Every cron run since retirement crashed with a 404 before reaching the discovery step. The Serena story landed during the outage window and was never automatically surfaced.

**2. Pre-filter false positive.** The singles wildcard was flagged as already covered because it shared two long words (`serena`, `wimbledon`) with the previously published doubles wildcard card. Different story, same subject — the keyword-overlap heuristic has no awareness of "singles" vs "doubles" as distinct contexts.

**3. `--force` passed the entire uncovered pool to Sonnet.** The flag marked the target story as forced but did not filter the pool — every story that survived the pre-filter was sent to Sonnet and generated a card. Combined with the run-wide semantic dedup skip, duplicate and unrelated cards were saved and sent to the review queue.

### Fix

1. Updated `orchestrator.py` model to `claude-sonnet-4-6`
2. Made `--force` bypass the pre-filter covered check (singles wildcard now passes through even when a related doubles wildcard is already published)
3. After the pre-filter, when `--force` is active, filtered `groups` to only the forced groups before sending to Sonnet — suppresses all unrelated stories
4. Scoped the semantic dedup skip to the forced card only (previously skipped for the entire run)

### Lessons Learned

- Hardcoded model IDs are a silent failure risk — when a model is retired the process crashes with a 404 and no alert is raised; consider reading the model ID from an env variable or config file
- Pre-filter keyword overlap is too blunt for update stories: "Serena Wimbledon singles" is not a duplicate of "Serena Wimbledon doubles" — distinct context words should prevent the covered flag
- `--force` must mean "generate only this" not "make sure this gets through" — any other interpretation creates queue pollution

## Issue #026: Recap duplicated next morning; no plan/FYI/predictions at 08:00

**Date:** 2026-06-30
**Project:** match-analyst-bot
**Severity:** High — duplicate recap sent to review queue; orchestrator plan, FYI message, and all match predictions failed silently
**Reporter:** User observation

### Symptoms

- At 08:00 on Day 2 of Wimbledon, a "Day 2" recap was generated and sent for review — but its content was identical to the Day 1 recap published the previous evening
- No plan message, no FYI, and no match predictions arrived at 08:00 despite the orchestrator cron being scheduled

### Root Cause — three compounding failures

**Failure 1: Wrong day number in recap.** `_get_day_number()` returns `(today − tournament_start).days + 1`. At 08:00 on Day 2, today is Day 2 — but Day 2 matches haven't started yet. ESPN only has Day 1 data. The recap was labelled "Day 2" but written from Day 1 match results, duplicating the previous night's card.

**Failure 2: Dedup filename mismatch.** The existing-recap check looked for `wimbledon-day-1-recap.md` in candidates/ and feed/. The actual published file is `wimbledon-day-1-men-women.md` (named from the card title slug by `publish_card`). The check never matched, so dedup passed and a duplicate was generated.

**Failure 3: `--run` cron missing `cd`.** The `--run` crontab entry was:
```
0 8 * * * /Users/dg/match-analyst-bot/venv/bin/python3 orchestrator.py --run
```
No `cd /Users/dg/match-analyst-bot &&` prefix. Cron's working directory is the user home (`/Users/dg/`), so Python couldn't find `orchestrator.py`. The process crashed with `No such file or directory` before any planning, FYI, or prediction work ran. The `--recap` cron had the correct `cd` prefix and ran fine.

### Fix

1. **Yesterday's day number:** `run_generate_recap` now computes `recap_date = (datetime.now() − timedelta(days=1)).date()` and `day_number = (recap_date − tournament_start).days + 1`. The 08:00 run always recaps yesterday's play, not today's.

2. **Glob-based dedup:** Replaced the exact filename check with `glob(f"{tournament_slug}-day-{day_number}*.md")` against both candidates/ and feed/. This catches any filename variant for that day — `wimbledon-day-1-recap.md`, `wimbledon-day-1-men-women.md`, or any future naming convention.

3. **Fixed `--run` crontab:** Added `cd /Users/dg/match-analyst-bot &&` before the python call. All four cron entries now consistently use `cd` before invoking python.

### Lessons Learned

1. **A cron job running the wrong working directory is a silent total failure.** The process exits immediately with a file-not-found error, logs nothing useful, and leaves no trace in the application log — only the cron stderr log. Always verify that every cron entry uses `cd /path/to/project &&` before the python invocation, not just some of them.
2. **Morning recaps must always be keyed to yesterday, not today.** The pattern "run at 08:00, recap today" is always wrong for a tournament where play starts at 11:00. Day N recap should never run before Day N matches exist.
3. **Dedup checks must use the same filename convention as publish.** Candidates use one naming scheme; published files use another (title-slug). An exact filename check breaks silently the moment the two diverge — always use a glob or a type+day key that is independent of filename formatting.

---

## Issue #027: Recap failed silently at 08:00 — stale ESPN cache had no completed matches

**Date:** 2026-07-01
**Project:** match-analyst-bot
**Severity:** High
**Reporter:** User (no recap in Telegram at 08:00)

### Symptoms

Recap cron fired at 08:00 but produced no card. Log showed 478 matches loaded from cache for both ATP and WTA, then: `⚠ No structured results available for 2026-06-30.` and `⚠ No structured results — card not saved.`

### Root Cause

The `espn-atp-20260630.json` and `espn-wta-20260630.json` cache files were written by the 10:00 predictions run on June 30 — at that time, all 478 matches had `status.completed = false` (play hadn't started). When the recap ran the next morning, `fetch_espn_events` loaded the stale cache and `_parse_espn_results` found zero completed matches.

### Fix

Added `skip_cache: bool = False` parameter to `fetch_espn_events`. `fetch_structured_results` now passes `skip_cache=True` so the recap always fetches live data. The cache is still used by the predictions path (schedule data is valid all day).

### Lessons Learned

A single ESPN cache file was being used for two purposes with opposite freshness requirements: schedule (valid all day) and results (stale the moment matches finish). Any shared cache serving both read patterns needs either separate keys or a caller-controlled bypass.

---

## Issue #028: Recap not sent to Telegram after regeneration; predictions dispatched at wrong time

**Date:** 2026-07-01
**Project:** match-analyst-bot
**Severity:** Medium
**Reporter:** User (recap missing from Telegram; Toby Samuel prediction arrived at 08:00 instead of 10:00)

### Symptoms

1. After recap was successfully regenerated (Day 2, correct content), it never appeared in Telegram for review.
2. The Toby Samuel vs Jakub Mensik prediction card was dispatched at 08:00 during the recap run — it should only fire at 10:00 via `--predict`.

### Root Cause

**Issue 1:** `_recap_already_queued()` treated `"rejected"` as a terminal state. The Day 2 recap had been sent the previous day with bad content and rejected. When regenerated with the same filename, the queue check found the old rejected entry and skipped it silently.

**Issue 2:** `run_generate_recap()` called `send_pending()` with no type filter. `send_pending()` iterates all candidate directories, so any pending prediction card was also dispatched alongside the recap.

### Fix

1. Removed `"rejected"` from `_recap_already_queued`'s terminal set — a rejected recap can always be retried.
2. Added `only_types: set | None` to `send_pending()` and `_send_all_pending()`. The recap path now calls `send_pending(only_types={"recap"})`.

### Lessons Learned

1. "Rejected" should never block a retry on content that may have been regenerated — the queue tracks message state, not content validity.
2. Any `send_pending()` call from within a specific agent should pass an explicit type filter. A shared flush with no scope guard is a cross-contamination risk when multiple agents have pending candidates simultaneously.

---

## Issue #029: Prediction cards showed wrong round label throughout the fortnight

**Date:** 2026-07-01
**Project:** match-analyst-bot
**Severity:** Medium
**Reporter:** User (cards showed "R1" on Day 2 of Wimbledon)

### Symptoms

All prediction card titles and visuals displayed "R1" regardless of the actual tournament round. On Day 2 of Wimbledon, cards for Djokovic/Tsitsipas and Andreeva/Krejcikova read "R1 Prediction" instead of "R2 Prediction".

### Root Cause

Two compounding errors:

1. `_parse_espn_fixtures` hardcoded `"round": "R1"` for every match with a comment saying ESPN doesn't expose round data. This was incorrect — `comp['round']['displayName']` contains the actual round ("Round 1", "Round 2", "Quarterfinal" etc.).

2. `run_predictions_only` attempted to correct this by stamping all matches with the tournament-derived round label (`_get_tournament_round_label`). This created a different bug: R1 matches legitimately scheduled on Day 2 (Wimbledon runs R1 across two days) were incorrectly labelled R2.

### Fix

Read `comp['round']['displayName']` directly from ESPN and map to display labels (R1/R2/R3/R4/QF/SF/F). Removed the blanket tournament-level round stamping from `run_predictions_only` — each match now carries its own accurate round from the data source.

### Lessons Learned

Always inspect the actual API response before concluding a field is unavailable. The round data was there from the beginning — the incorrect assumption ("ESPN doesn't expose round labels") was never verified against the raw payload.

---

## Issue #030: Completed match (Cobolli/Navone) promoted into predictions schedule

**Date:** 2026-07-01
**Project:** match-analyst-bot
**Severity:** Medium
**Reporter:** User (Cobolli/Navone don't play today)

### Symptoms

A prediction was generated and sent for Flavio Cobolli vs Mariano Navone despite the match having already been played. The card appeared in Telegram review.

### Root Cause

ESPN's scoreboard API sometimes lags on updating `status.completed` after a match ends — the field remained `False` for several hours after the match finished. The schedule filter in `_parse_espn_fixtures` only checked `status.completed`, so the match leaked through as an upcoming fixture. The result was already visible in `comp['notes']` ("Flavio Cobolli bt Mariano Navone 1-6 7-6 6-3") before the status was updated.

### Fix

Added a secondary completed guard in `_parse_espn_fixtures`: if any entry in `comp['notes']` contains "bt " or " def ", the match is treated as finished and excluded from the schedule regardless of `status.completed`.

### Lessons Learned

`status.completed` is a lagging indicator on ESPN's API. Treat the notes field as the authoritative signal for whether a match has a result — it is updated faster than the status flag.

---

## Issue #031: Stale rejected video candidate re-surfaced after queue cleanup

**Date:** 2026-07-01
**Project:** match-analyst-bot
**Severity:** Low
**Reporter:** User (why did the agent generate Berlin semifinal video?)

### Symptoms

An old video candidate (`aryna-sabalenka-vs-jessica-pegula-2026-berlin-semifinal.md`) that had previously been rejected was re-sent to the Telegram review channel during a `send_pending` call, weeks after it was generated and rejected.

### Root Cause

During manual queue cleanup, entries were filtered by player name ("sabalenka") rather than by content type and slug. This accidentally removed the `"rejected"` status from the Berlin video entry alongside the intended prediction entries. With its status cleared, `send_pending` treated it as a new unsent candidate on the next run.

### Fix

Deleted the stale candidate file and its queue entry. Going forward, queue cleanup filters must scope by both content type (`card_type`) and a slug pattern specific enough to avoid cross-type collisions — player names alone are too broad.

### Lessons Learned

Queue status is the only thing preventing old rejected candidates from re-surfacing. Any operation that bulk-modifies queue entries by a loose keyword risks clearing protective statuses from unrelated cards. Always filter by `card_type` in addition to any name-based criteria.

---

## Issue #032: News card images generated with dark navy PIL fallback instead of branded SVG

**Date:** 2026-07-02
**Project:** match-analyst-bot
**Severity:** Medium — published cards have wrong visual design
**Reporter:** User noticed Andreeva news card had "weird design in dark blue"

### Symptoms

News cards published on 2026-07-02 (Andreeva, Djokovic, Shelton) had a dark navy (#121826) background instead of the on-brand dark green (#123A2A) SVG card design.

### Investigation

1. Checked `image-generation.log` — found `FileNotFoundError: [Errno 2] No such file or directory: 'npx'` for all three cards.
2. `generate_news_tile_branded()` calls `npx tsx scripts/renderNewsCard.ts` via `subprocess.run(["npx", ...])`.
3. When Python spawns a subprocess from cron or non-login shells, PATH does not include `/opt/homebrew/bin`, so `npx` is not found.
4. The function catches the exception and falls back to `generate_news_tile()` (PIL, dark navy `#121826` background).

### Root Cause

`subprocess.run(["npx", ...])` relies on `$PATH` to resolve the binary. Cron and Python subprocess environments do not inherit the user's shell PATH, so `npx` at `/opt/homebrew/bin/npx` is not found.

### Fix

Used `shutil.which("npx")` to resolve the binary at runtime, with `/opt/homebrew/bin/npx` as an explicit fallback:

```python
_npx = _shutil.which("npx") or "/opt/homebrew/bin/npx"
subprocess.run([_npx, "tsx", "scripts/renderNewsCard.ts"], ...)
```

Regenerated the Andreeva card image directly via the Node renderer.

### Lessons Learned

Never pass bare binary names to `subprocess.run()` when the code may run outside an interactive shell. Always resolve with `shutil.which()` and provide an explicit absolute fallback for known locations (Homebrew: `/opt/homebrew/bin/`, nvm: `~/.nvm/versions/node/*/bin/`).

---

## Issue #033: Recap hallucinating Serena Williams — chain reasoning + narrow verified pool

**Date:** 2026-07-03
**Project:** match-analyst-bot
**Severity:** High — recap generation fails verification, cannot publish
**Reporter:** Recap VERIFICATION FAILED repeatedly at Wimbledon Day 4

### Symptoms

Wimbledon Day 4 recap failed verification: `VERIFICATION FAILED — recap mentions unverified player(s): ['Serena', 'Shelton', 'Williams']`. Neither Serena Williams nor Ben Shelton played on Day 4.

### Investigation

1. Added debug context print to the verifier to show WHERE in the body suspicious names appear.
2. Context for 'Serena'/'Williams': `"the Filipino star, who beat the player who beat Serena Williams"` — Sonnet used transitive chain reasoning to connect Eala → Joint → Serena, drawing on training data about past matches.
3. Context for 'Shelton': `"Fery beat Virtanen's conqueror of Shelton"` — Shelton DID play Wimbledon (lost to Virtanen in R1) but played 3 days ago, so wasn't in today's `all_matches` verified pool.
4. Root cause 1: verified pool only included today's 34 matches, not all tournament players across all previous rounds.
5. Root cause 2: NOTABLE ABSENCES exception in the prompt explicitly permitted naming players who didn't play today, which opened the door for chain reasoning.
6. Root cause 3: prompt allowed "BACKGROUND KNOWLEDGE" without hard constraints on chain/transitive references.

### Root Cause

Two compounding issues: (a) the verifier's player pool only covered today's matches — a player eliminated in R1 would be flagged as hallucinated on Day 4 even if correctly referenced; (b) the prompt's NOTABLE ABSENCES exception gave Sonnet license to reason about players outside SOURCE 1, and Sonnet extended this into transitive chains ("the player who beat Serena Williams").

### Fix

**Verifier fix:** Extended `verified_name_words` to include all players from ALL tournament days by loading ESPN cache files from `current["start"]` to `recap_date`. Shelton (R1 loser) is now verified across the full tournament.

**Prompt fix 1:** Replaced NOTABLE ABSENCES exception with NO CHAIN REASONING rule:
```
NO CHAIN REASONING: Do not write "A beat B who beat C" or "the player who beat X".
Write only about today's result and why it matters.
```

**Prompt fix 2:** Replaced generic PLAYER NAME RULE with an explicit complete list of today's players:
```
Players who played today (complete list): [list built from all_matches]
```

**Debug fix:** Added context-print in verifier so the sentence containing the suspicious name is shown when verification fails.

### Lessons Learned

1. Verified player pools must span the full tournament, not just today. A R1 loser is a legitimate reference by Day 4.
2. Chain/transitive reasoning ("A beat B who beat C") is a hallucination vector that prompts must explicitly prohibit. "Do not invent results" does not stop it.
3. When a prompt rule fails (PLAYER NAME RULE didn't stop Serena), add a debug print first — see the actual output before guessing the fix. The chain reasoning pattern was only visible once we printed the flagged context.

---

## Issue #XXX: [Short description]

**Date:** [Date]
**Project:** [match-analyst-bot / tennismind-web]
**Severity:** [Low / Medium / High / Critical]
**Reporter:** [How it was discovered — manual testing, user report, Claude Code]

### Symptoms

[What the user sees / what goes wrong]

### Investigation

[Steps taken to diagnose — numbered list]

### Root Cause

[Why it happened — the technical explanation]

### Fix

[What was changed to resolve it]

### Lessons Learned

[What to remember for next time — generalizable takeaways]
```

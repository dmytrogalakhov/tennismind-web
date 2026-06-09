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

Copy this template for each new issue:

```
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

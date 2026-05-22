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

## Issue #002: DALL-E generated wrong venue in feed card image

**Date:** May 10, 2026
**Project:** match-analyst-bot
**Severity:** Medium — wrong image published to Telegram and website
**Reporter:** Manual review

### Symptoms

The Italian Open feed card showed an image with the Eiffel Tower (Paris) instead of the Foro Italico (Rome). The card text was about Rome but the image depicted the wrong city.

### Investigation

1. Checked the DALL-E image prompt — it was generic ("tennis tournament stadium") with no location-specific details
2. The image prompt router classified the card correctly as "tournament/business" but the template only said "tennis stadium" without extracting venue or city from the card content
3. DALL-E defaulted to the most common tennis venue association (Roland Garros/Paris) since no specific location was provided

### Root Cause

The image generation pipeline had no location extraction step. The DALL-E prompt was built from the card type only, not from the card content. A card about Rome got the same generic "tennis stadium" prompt as a card about Paris or London.

### Fix

1. Immediate: manually regenerated the image with a Rome-specific prompt including "Foro Italico", "Colosseum", and "Mediterranean pine trees"
2. Permanent: added a Sonnet-powered extraction step before DALL-E prompt construction. It reads the card title and body, extracts specific_venue, city, country_landmarks, and court_surface as structured JSON, then injects these details into the DALL-E prompt so the image matches the actual location.

### Lessons Learned

1. AI image generation is only as good as the prompt. A generic prompt produces generic images — always inject content-specific details.
2. Image prompts need a middle layer between "card type" and "DALL-E call" — a visual brief that extracts scene-specific details from the content.
3. Always review generated images before publishing. The pipeline should ideally show the image during the --review step before approval.
4. Log all DALL-E prompts to ~/match-analyst-bot/logs/image-prompts.log for debugging bad outputs.

---

## Issue #003: Feed card translation generating new content instead of translating

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

## Issue #004: Insights feed images generic instead of story-specific

**Date:** May 11, 2026
**Project:** tennismind-web
**Severity:** Medium — feature works but visual quality undermines the product
**Reporter:** Manual testing

### Symptoms

DALLE-generated images for Insights cards were technically on-style (1950s-60s French Riviera travel poster aesthetic preserved) but failed to illustrate the specific story each card told. Example: a card about Sinner being one Masters 1000 title away from matching Djokovic's Career Golden Masters record was illustrated with a generic Foro Italico stadium scene. The image conveyed "tennis happens in Rome" but said nothing about the 9-trophy collection, the rivalry parallel, or the "one away" suspense.

Additional symptoms:
1. Hallucinated garbled text appeared on stadium banners and architectural surfaces despite "NO text, NO words" in the prompt
2. All cards had visually similar mood regardless of emotional register (triumph, retirement, near-miss all got the same warm sunset palette)
3. Over time, cards started feeling samey because every story type used the same hardcoded template

### Investigation

1. Reviewed `_build_image_prompt` — found hardcoded templates branched by `card_type` (stat, gear, history, upset, default)
2. Reviewed `_extract_location_context` — found it only extracted geography (venue, city, landmarks, surface), never the narrative content of the card
3. Traced prompt construction for the Sinner card: the prompt was ~70% architectural location detail and ~30% vague "achievement" motif, so DALLE prioritized the concrete location over the abstract achievement
4. Identified that "spectator atmosphere" and "architectural elements" in the prompts were actively pulling DALLE toward stadium signage, contributing to the hallucinated-text problem
5. Recognized the `history` card_type was too coarse — it covered anniversaries, head-to-head records, GOAT milestones, retirements, and near-misses with one identical template

### Root Cause

Three compounding bugs:

1. **Wrong abstraction level for branching.** Card type (stat/gear/history/upset) is not a useful axis for image design. The same card type covers wildly different narrative beats. Branching by type produced templates so generic they could only describe the backdrop, never the story.
2. **Extractor pulled the wrong information.** Geography is the *setting* of the story, not the *subject*. Sending Sonnet to extract only location data meant the narrative hook was never identified or used.
3. **Word-order weighting in prompts.** DALLE 3 weights early and concrete tokens heavily. Prompts that opened with architectural location and closed with abstract motif rendered the location and ignored the motif.

### Fix

1. Replaced `_extract_location_context` with `_art_direct_card` — a single Sonnet call that acts as an art director and returns a structured visual brief (`central_motif`, `composition`, `subject_treatment`, `setting`, `mood`, `palette_notes`, `avoid`).
2. Removed all `card_type` branching from `_build_image_prompt`. The function now assembles the DALLE prompt by concatenating the art director's brief with the fixed style suffix.
3. Preserved `_STYLE_SUFFIX` as inviolable — appended to every prompt including the fallback path, so the 1950s-60s French Riviera aesthetic can never be omitted.
4. Moved aspect-ratio control out of prompt prose and into the DALLE API `size` parameter (`1792x1024` for landscape). Added explicit landscape composition guidance to the art director prompt so it composes for a wide frame instead of fighting it.
5. Instructed the art director to construct a textless visual world by *not describing surfaces that carry text* (banners, scoreboards, jerseys with names), rather than relying on the unreliable "NO text" negative instruction alone.
6. Added mood-to-palette mapping within the fixed Riviera palette (triumph leans warm/golden, near-miss leans cooler/pensive, retirement leans muted/elegiac).

### Lessons Learned

1. **Branch on narrative, not metadata.** Card type, tags, and category fields are useful for UI badges but rarely a good axis for content generation. Let an LLM identify the narrative hook from the actual content instead.
2. **One LLM call to art-direct beats N hardcoded templates.** The cost is identical (we were already calling Sonnet for geography), and the output quality scales with the story instead of being capped by the template.
3. **DALLE 3 prompt prose cannot override API parameters.** "Square format" or "Landscape format" in prompt text is unreliable; the `size` parameter is the source of truth. Always pin dimensions via the API call.
4. **Avoid telling DALLE what NOT to render — instead, don't describe the things that would produce it.** "NO text" is famously unreliable. Removing words that suggest signage (banners, storefronts, scoreboards) is more effective than asking DALLE to suppress text.
5. **Fixed style elements must live outside the variable prompt path.** Hardcoding `_STYLE_SUFFIX` as a constant appended in every code path (including the fallback) prevents accidental drift when prompts get refactored.
6. **Real player likeness should never be requested.** DALLE produces generic European-looking figures with bad anatomy and won't render real players recognizably. Pre-empt this by asking for silhouettes, back views, or symbolic figures whenever a real player is named.

---

## Issue #005: DALLE renders wrong object counts and ignores subtle compositional states

**Date:** May 11, 2026
**Project:** tennismind-web
**Severity:** Low — image quality issue, not a functional bug
**Reporter:** Manual testing

### Symptoms

After the art director refactor (Issue #004), images were dramatically more story-specific but exhibited a new failure mode on closer inspection. For the Sinner Career Golden Masters card, the art director correctly designed a motif of "nine trophies arranged in a row, eight filled with gold, the ninth as an empty glowing outline waiting to be filled." DALLE rendered:

1. Thirteen trophies instead of nine
2. All trophies identical golden — no empty/outlined "ninth" to convey the "one to go" meaning
3. A decorative trophy frieze that read as wallpaper rather than narrative, especially at desktop width

The image was beautiful but had lost the specific story hook the art director had designed.

### Investigation

1. Compared the art director's JSON brief against the rendered image — confirmed the motif specification was correct and specific
2. Researched DALLE 3 behavior — confirmed it cannot reliably render exact counts (asking for 9 commonly yields 7-15) and tends to smooth away subtle conceptual states (empty outlines, half-filled objects, glowing absences) during its internal prompt rewriting
3. Observed that the failure mode was systematic, not random — DALLE consistently prefers concrete visual nouns over poetic compositional states
4. Noticed the issue was more visible on desktop than mobile — at larger sizes, repetitive arrays of identical objects read as decorative pattern rather than narrative content

### Root Cause

The art director was designing motifs that depended on capabilities DALLE doesn't reliably have:

1. **Exact counting.** "Nine trophies" is unrenderable as a precise count. DALLE counts approximately at best.
2. **Subtle state contrast.** "Eight filled, one outlined" requires DALLE to render two distinct object states in the same image. The prompt rewriter typically collapses these into one dominant state (here, all gold).
3. **Array-based meaning.** Compositions where meaning emerges from a *pattern across many identical objects* are fragile. If DALLE renders the wrong count or smooths out the variation, the meaning disappears entirely.

### Fix

Added two robustness rules to the art director's system prompt:

1. Explicit warning that DALLE cannot reliably render exact counts or subtle states, with instruction to design motifs that work through hierarchy and contrast instead — one hero object vs. many smaller ones, foreground vs. background, illuminated vs. silhouetted, single figure approaching a goal.
2. Bias toward 1-3 hero elements over arrays of identical objects. A row of 12 trophies reads as "trophies in general"; one luminous trophy with a silhouetted figure approaching it reads as "one more to go."

For the Sinner card specifically, the new guidance would produce motifs like: a single luminous trophy in the foreground with smaller silhouetted trophies receding behind it, or a trophy at the end of a path with a small figure approaching — both of which survive DALLE's prompt rewriting and render reliably.

### Lessons Learned

1. **LLM art direction must be calibrated to the renderer's actual capabilities, not its ideal capabilities.** A motif that reads beautifully as text ("nine trophies, eight filled, one empty") can be fundamentally unrenderable. The art director needs to know what the downstream model can and can't do.
2. **Hierarchy and contrast survive prompt rewriting; counts and subtle states do not.** Compositions built on foreground vs. background, big vs. small, or lit vs. silhouetted are robust. Compositions built on "exactly N items" or "one of them is different" are fragile.
3. **Image quality issues are more visible at desktop sizes.** A composition that reads fine on mobile (where the eye skims) may fail on desktop (where the eye scrutinizes). Always review generated images at the largest size they'll be displayed.
4. **Use `quality: "hd"` and `style: "vivid"` in the DALLE API call** — `hd` significantly improves linework crispness, which is essential for poster-style aesthetics that depend on clean bold outlines.
5. **When chaining LLMs (art director → DALLE), the upstream LLM needs explicit knowledge of the downstream LLM's limitations.** Otherwise the upstream model will design for an idealized renderer and the output will degrade silently.

---

## Issue #006: Feed card images rendering as square on mobile

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

## Issue #007: News card image path not saved to frontmatter or Telegram

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

## Template for New Issues

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
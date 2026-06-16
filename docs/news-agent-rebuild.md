# News Agent Rebuild: Date-Aware Discovery + Deterministic Significance

**Status:** All 4 stages complete (June 2026).
**Replaces:** five prior prompt-level patches (freshness rules, query pivots, significance filter, multi-candidate, dedup wiring)
**Related:** Issue #014, PDL-016

---

## Why the patches failed (the pattern)

Each previous fix addressed a visible symptom at the prompt layer. The structural cause — dateless discovery, no verification clock, vibes-based significance — remained intact. A correct diagnosis asks not "what did the output do wrong?" but "what was missing from the inputs that made a wrong output likely?" The issue tree below answers that question.

---

## The issue tree with plain-English translation

### Root question: why does the news agent produce stale, insignificant, or wrong cards?

---

**Branch 1 — Discovery: the agent finds the wrong raw material**

*Technical:* TavilySearchResults (deprecated wrapper) called without topic, days, time_range, or include_domains. Tavily's news-mode returns results by recency with published_date; general-mode returns by relevance/link-density. Older articles outrank fresher ones by mid-tournament. No domain steering; no round-aware query construction.

*Plain English:* We asked for "tennis articles" instead of "today's tennis articles from trusted sources." A first-round recap published 4 days ago has more links than today's quarterfinal story, so it comes back first. The search tool could have filtered by date the whole time — we just never turned that parameter on.

Sub-branch 1.1: No time axis on the search call.
Sub-branch 1.2: Queries don't know what round it is — "Queen's Club results" returns the full tournament's history, not today's.
Sub-branch 1.3: No trusted-domain list — official ATP/WTA sites and major sports outlets are mixed with SEO-farm content.

---

**Branch 2 — Verification: the agent can't confirm what it finds is still true**

*Technical:* No published_date extraction or hard code gate. No tournament-round computation from the calendar. Single-source claims, never cross-checked.

*Plain English:* We were reading newspaper clippings with the dates cut off, then asking the model to guess which ones were from today. Even if an article seems fresh, the model can't know that three more rounds have happened since it was written without being told what round it is now. And if one source says "Serena is playing doubles," nothing checks whether she's still in the draw.

Sub-branch 2.1: No published_date hard filter — stale articles pass through.
Sub-branch 2.2: No event-date grounding — the system doesn't know what day/round of the tournament it is.
Sub-branch 2.3: Single-source, never re-verified — a story that was once true can become false without the system noticing.

---

**Branch 3 — Judgment: the agent picks the wrong stories even from decent inputs**

*Technical:* Significance is evaluated by the LLM from prompt instructions without structured data. No ranking lookup; no fame model; "upset" pattern-matched from article phrasing rather than computed from ranking delta.

*Plain English:* The system is guessing what tennis fans care about without knowing who the fans' favourite players are or what the rankings say. It sees the word "upset" and assumes headline. A better system would score each story mathematically: how big is the ranking gap? Is this player famous? What round is it? Then only write cards for stories that score above a threshold — the same way a real editor has an implicit rulebook.

Sub-branch 3.1: Significance is vibes — prompt-instructed LLM judgment without data.
Sub-branch 3.2: No marquee model — the system doesn't know who the audience cares about most.

---

**The one-sentence diagnosis:**
The system is treating sports news like generic web content, when it should be treating it like a time-sensitive, stateful editorial workflow.

---

## The target architecture

The pipeline has three stages, each with a distinct owner:

**Stage 1 — Discovery (fully agentic):**
Tavily in news-mode (topic="news", days=2, trusted domains) + RSS feeds from ATP/WTA/BBC/ESPN, last 48h only. Output: a pool of dated, sourced candidate stories.

**Stage 2 — Deterministic gates (code, no LLM):**
Three hard filters run in sequence before Sonnet sees anything:
- published_date gate: drop anything older than 48h
- Round-aware staleness: drop anything about a round earlier than current − 1
- Significance score ≥ 5: drop anything that doesn't involve a ranked/marquee player in a meaningful context

Everything that fails a gate is logged with its reason. Nothing is silently dropped.

**Stage 3 — Generation (LLM writes, human approves):**
Only stories that cleared all three gates reach Sonnet. It writes the card in the TennisMind voice. The card then passes through the existing RAG dedup check before going to the founder's phone for approval.

**The division of labor in one line:**
Discovery is agentic. Freshness and significance are code. The LLM writes. The human keeps taste.

---

## Staged build plan

### Stage 1 — Date-aware search ✅ DONE (June 2026)
- Upgraded to TavilySearch (langchain_tavily) — clears deprecation warning
- Parameters: `topic="news"`, `days=2`, `include_domains=[atptour.com, wtatennis.com, espn.com, bbc.co.uk, tennis.com, tennis365.com, tennishead.net]`, `max_results=8`
- Hard 48h gate in code (not prompt) — every drop logged to `logs/news-discovery.log`
- Tennis relevance gate: domains like atptour/wtatennis pass unconditionally; ESPN/BBC require `/tennis/` in URL or "tennis" in title — prevents basketball, World Cup from slipping through
- Round-aware queries via `_get_tournament_round_label()`: QF/SF/R16 injected into each tournament query
- `--discover-news` mode: raw audit with pass/drop breakdown, no card generation

### Stage 2 — RSS channel ✅ DONE (June 2026)
- `feedparser` installed; `RSS_FEEDS` = BBC Sport Tennis + ESPN Tennis
  - ATP 403 (down), WTA 404 (down) — skipped with log entry
- `fetch_rss_news()`: parses feeds, applies 48h gate on pubDate, returns `(items, feed_stats)` per-feed health map
- **RSS is primary, Tavily is supplement** (re-architected after Day 1 data: 13/14 stories came from BBC RSS — Boulter/Rybakina, Evans retirement, Kyrgios comeback; Tavily added only 1 net-new)
- `collect_news_pool()`: RSS runs first → Tavily adds only net-new stories (dedup by URL + >70% title-word overlap, RSS version wins on conflict)
- Degraded mode: if ALL RSS feeds are down → log `⚠ All RSS feeds unavailable — running on Tavily only`
- Per-run breakdown log: `Discovery: X from RSS (rss:bbc: N, rss:espn: M), +Y net-new from Tavily, Z total after dedup`

### Stage 3 — Deterministic significance scoring ✅ DONE (June 2026)
- `fetch_rankings()`: fetches ATP + WTA top-100 from JeffSackmann/GitHub CSVs; cached to `data/rankings.json` for 7 days; falls back to cache on error
- `data/marquee-players.json`: founder-maintained list (22 names, "Serena" stored as "Serena Williams" so "Williams" in titles triggers the match)
- `score_story()` rubric (logged to `logs/significance.log`):
  - **Player detection is TITLE-ONLY** — prevents incidental body mentions (doubles asides, quotes, contextual references) from inflating significance scores
  - Top-10 player in title: +5
  - Top-11-to-20 player in title: +3 (mutually exclusive with top-10)
  - Marquee player in title: +4 (multi-word names match on any word >3 chars, e.g. "Williams" → "Serena Williams")
  - **Stage signal (title only):** Final: +4 | Semifinal: +2 (detects "final" excluding "quarter-final"/"semi-final"; "last four", "semis", "semi-final" for SF)
  - **Floor rule:** featured player (marquee/top-20) at SF or later → score = max(score, threshold) — unconditional pass
  - Upset vocabulary in title ("stuns", "shocks", etc.): +2
  - GS/1000 context (active tournament tier or keyword in title): +2
  - Injury/comeback/retirement (title + lead paragraph): +3
  - Threshold: ≥5 to pass to Sonnet
- Pre-scoring filters added to `fetch_rss_news()`:
  - Skip BBC video clips (`/videos/` in URL)
  - Skip broadcast guides (title starts with "how to follow/watch/listen")
- `--discover-news` shows ALL scored stories sorted by score (pass + fail) with "Event:" label for threshold calibration
- Day-1 results: 14 fresh stories → 9 after date/relevance/video → 7 pass significance (Boulter/Rybakina, Kyrgios comeback, Evans retirement, Mboko injury × 2, Raducanu QF)
- Post-fix (June 14): 8 stories in pool → 7 pass; Raducanu final [8] and Raducanu SF [6] both pass on stage signals; QF "Brits" article drops at 48h gate (correct); "Players: Wimbledon prize increase not enough" [2] correctly rejected
- Known open: threshold (5) is an estimate — calibrate after 2 weeks; ranking gap >50 approximated by upset vocabulary for now

### Stage 5 — Division-of-labor fix: scorer owns significance, Sonnet owns writing ✅ DONE (June 2026)
- Removed "TOURNAMENT SIGNIFICANCE — PRIORITIZE/DE-PRIORITIZE" block from `build_news_curation_prompt()` — Sonnet was independently re-applying significance logic (ATP 250 = skip) that the deterministic scorer had already decided
- Fixed already_covered instruction: "exact same EVENT, not same player" — prevents suppressing new events about players with prior coverage
- Pool formatted as numbered stories ("STORY N (score: N)", "POOL: N distinct event(s)") so Sonnet writes one card per story rather than selecting from an unstructured blob
- **Pre-filter in `collect_search_content_news()`**: drops already-covered event groups before Sonnet sees the pool using:
  - Semantic check: memory store similarity ≥0.78 (slightly below post-gen threshold of 0.82 to account for raw article vs. generated card embedding divergence)
  - Keyword fallback: 2+ significant words (>4 chars) shared with any already_covered prompt-list title
- Hard card cap raised from 3 to 6 in `generate_cards()` — dedup is the real cap, not an arbitrary number
- Curation prompt: Sonnet's role is now "write every distinct event in the pre-filtered pool, collapse same-event multi-source articles to 1 card"
- Verified: Stuttgart final (Shelton beats Fritz, [5]) generated correctly after fix; pre-filter silently dropped 4 covered stories before they could consume Sonnet's budget
- See Issue #016 and PDL-019

### Stage 4 — Event-date grounding ✅ DONE (June 2026)
- `event_date` frontmatter on every card:
  - News cards: set to the most recent `published_date` in the pool (cached in `_news_pool_event_date` after each `collect_news_pool()` run)
  - All other cards (insights, recap, prediction): fallback to today's date
  - Emitted in `_build_frontmatter()` between `date` and `status` fields
- Round-staleness gate (`_is_round_stale()`): after significance scoring, before returning pool
  - Only fires on articles containing round-specific vocabulary ("second round", "r16", "quarter-final", etc.)
  - Computes article's tournament day from `published_date` vs tournament `start`, maps to round
  - If article_round is ≥2 rounds behind current round for a named active tournament → dropped
  - Player-news articles (retirement, comeback without round mention) are exempt — gate only applies to match-result reports
  - Logged to `logs/significance.log` alongside Stage 3 decisions
- Day-1 results: no round-stale drops (correct — pool was player-news articles, not stale round reports)
- Gate will activate in later-round scenarios: e.g. SF day at Wimbledon with a 30h-old R32 article

### Stage 6 — ATP/WTA discovery gap + Flashscore gap-fill ✅ DONE (June 2026)

**ATP/WTA official feeds are dead:**
- ATP Tour RSS: HTTP 403 on all paths, including browser User-Agent — intentional CDN block
- WTA Tennis RSS: no RSS endpoint exists; site is a React SPA (PulseLive API, JS-gated)
- Result: zero official ATP/WTA content was entering the pipeline via RSS

**Fix A — Google News RSS as ATP/WTA discovery layer:**
- `fetch_google_news_atp_wta()`: parses `news.google.com/rss/search?q=tennis+results+2026`
- Filters by `_GNEWS_ACCEPTED_SOURCES` (ATP Tour, WTA Tennis, Tennis365, etc.) and 48h freshness gate
- Google News redirect URLs can't be followed (JS-gated), so each discovered title is re-searched via Tavily to retrieve actual article content
- Tavily's `include_domains` already includes `atptour.com` and `wtatennis.com` — the title-based search finds the article reliably
- Confirmed: `tennis+results+2026` query surfaces 3 fresh ATP/WTA items within 48h in June 2026 testing ("Vekic vs. Raducanu | Final", "Queen's Club draw", etc.)
- Integrated in `collect_news_pool()` after BBC/ESPN RSS, before Tavily supplement; deduplicates via URL + title overlap (same as Tavily dedup)
- `_GNEWS_ACCEPTED_SOURCES` should be maintained alongside `marquee-players.json` as a curated publisher trust list
- See Issue #018 and PDL-020

**Fix B — Flashscore structured gap-fill (feature-flagged off until June 29):**
- `collect_flashscore_gap_fill()`: pulls 48h of ATP/WTA SINGLES results from ALL tournaments via Apify Flashscore
- Scores each match with the existing significance scorer using synthetic titles built from structured facts ("Griekspoor beats Bublik in Final of Libema Open")
- Structured scoring eliminates a key scorer weakness: incidental body-text mentions of other players can't inflate scores when there is no article body
- Results above threshold not covered by any article → added to pool as `_source: "flashscore"` items with `_structured` dict attached
- Pool formatter: renders structured facts block ("winner (ranked N) beat loser (ranked M) 6-3 6-4 in Final of X") instead of article content
- Curation prompt: new FLASHSCORE ITEMS section instructs Sonnet to write from structural WHY only (ranking upset delta, stage, tier, surface); forbidden: tactical detail, quotes, "first title" claims without data
- Separate per-day cache (`flashscore-news-{date}.json`) to avoid bleeding into recap cache
- Enable with: `FLASHSCORE_NEWS_ENABLED=true python3 generate_feed.py --generate-news`
- Timed to Apify credit refresh on June 29 (Wimbledon day 1)
- See PDL-020

---

## What this does not change
- The LLM's writing role (unchanged)
- The RAG dedup layer (existing, already works)
- The approval flow (cards still go to phone)
- The recap pipeline (separate, already solid)
- The eval harness (still gates autonomy promotion)

---

## Open questions
- If Stage 1 Tavily-news doesn't resolve discovery (results still stale), evaluate: NewsAPI.org, GNews, or Exa as alternatives
- Rankings fetch: ATP/WTA publish rankings data on their sites; confirm the fetch is automatable or find a reliable API (Tennis Abstract, RapidAPI tennis endpoints)
- Significance threshold (5) is a starting estimate; calibrate against two weeks of scored-but-not-filtered results before enforcing the gate

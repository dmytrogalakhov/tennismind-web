# TennisMind — Product Backlog

**Last updated:** 2026-07-11  
Items are grouped by area. Each has a rough effort tag: `[S]` small (hours), `[M]` medium (days), `[L]` large (weeks).

---

## Strategy

**Revisit: what is "news" for TennisMind?** `[S]` *(decision due post-Wimbledon)*  
PDL-011 is an open strategic question deferred until after Wimbledon. The news agent produces the weakest content because it competes head-on with faster, broader free sources. Option 2 from the decision log — reframe as "news-as-insight" (fewer cards, each one explaining what a development *means*, not just that it happened) — is most aligned with the mission. Option 3 is cutting news entirely and redirecting effort to articles and insights. Now that Wimbledon is active, there's enough signal to decide.

---

## Data & Sources

**Apify re-enable for 250/500 tournaments** `[S]`  
ESPN coverage gets thin for sub-Masters events — draws populate late, linescores sometimes missing. Apify fallback code is still in place (`fetch_structured_results` reads from `logs/apify-cache-{date}.json`). To activate: re-enable Apify credit spend and set `recap_eligible: True` on the relevant calendar entries.  
_Relevant for: Indian Wells, Miami, Madrid, Halle, Queen's Club recaps next season._

---

## News Discovery

**Tavily stale articles despite `days=2` parameter** `[S]`
`--report stale` drill-down shows Tavily returning articles 70h–164h old despite the `days=2` search parameter. In the Wimbledon run: 15 of 33 Tavily results (45%) dropped by gate 2. The `days` parameter appears to be loosely enforced — Tavily ranks by relevance and surfaces older high-relevance articles. Investigation: check whether a hard `published_after` ISO timestamp gives stricter results; consider a pre-filter in `fetch_news_raw()` to reject Tavily items before they hit gate 2 so they don't pollute the stale count.
_Surfaced: 2026-07-13 via `--report stale`_

**Tavily relevance gate — 45% of results not tennis content** `[S]`
`--report relevance` shows all 15 relevance drops are Tavily items. Gate 1 drops anything where the URL and title don't signal tennis. Tavily's search queries are tennis-specific but the results include non-tennis content (football, celebrity, general sport). Options: tighten the queries with stricter site filters; add a `topic="sports"` constraint; or expand the tennis relevance check in `_is_tennis_relevant()` to accept more signal patterns (e.g. player names in the title even if the URL path is generic). Both Tavily issues are related — fixing staleness may also improve relevance if fresher results are more on-topic.
_Surfaced: 2026-07-13 via `--report relevance`_

---

## Pipeline

**Full card body visible in Telegram approval messages** `[S]`
Telegram truncates long captions, so the body of cards sent for review is often cut off on the phone. The approval message currently sends title + full body in a single caption, but Telegram photo captions are limited to 1024 chars. Fix: send the image in one message, then send the full body as a separate follow-up text message in the same chat — the same pattern already used for long recap cards. Apply consistently to all card types in `telegram_review.py → send_pending()`.

**Separate `take` from `interpretation` in match-analysis frontmatter** `[S]`
The `interpretation` field drives both the card's take line (2-line physical limit at 22px) and the Telegram/website "What the numbers say" text. Shortening one shortens the other. Add a `take` field to the match-analysis frontmatter schema — short text for the card image; `interpretation` stays as the full caption text. Wire `matchStatsCard.ts` to prefer `take` over `interpretation` when both are present. *(PDL-026)*

**Recap retry loop with degraded context** `[M]`  
Currently a recap that fails verification (e.g. Tavily enrichment introduces hallucinations) is dropped entirely. Phase 5 of the roadmap specifies a goal-based retry: Run 1 = full Tavily enrichment; Run 2 (if verification fails) = retry with no enrichment, removing the hallucination vector; Run 3 = log and exit. Increases recap success rate on days with noisy Tavily results without human intervention.  
_Spec in strategic-roadmap.md § Phase 5._

**Tournament Preview Agent** `[M]`  
Before a tournament starts, generate "5 matches to watch" preview cards: pull the draw, H2H records, surface form, and current rankings. Commissions automatically 1-2 days before `tournament.start`. Phase 3 item in the roadmap. Most of the data fetching infrastructure already exists — the main addition is a new cron trigger and prompt.

**Rankings Analysis Agent** `[M]`  
Weekly card (Monday, post-rankings update): who moved, who fell, and the specific tactical reason. "Zverev climbed to #2 because he won Hamburg without dropping a set, ending a clay-season run that stretched back to April." Not just numbers — the why behind the movement. Phase 3 item.

**Autonomous publish for predictions** `[M]`  
Predictions have a structured source (ESPN schedule), a fixed output template, and a clear accuracy signal (win/loss). Once prediction quality is consistently high (zero hallucination failures for 2+ consecutive weeks), remove the Telegram review step and publish directly. Recaps and news should stay human-reviewed longest. Phase 5 item — prerequisite is proving pipeline reliability first.

**Tiebreak scores in ESPN data** `[S]`  
`_parse_espn_results()` currently formats a tiebreak set as `7-6` with no bracket score. ESPN's `linescores` may carry the tiebreak score separately — worth checking and surfacing it as `7-6(5)` in recap output.

**Prediction accuracy dashboard** `[M]`  
The `outcome` frontmatter field (`correct | incorrect | void`) is already written on prediction cards. A simple script could aggregate accuracy by tournament, surface, and round and write a summary card. The solution design already exists at `docs/solution-design-prediction-accuracy.md`.

---

## Infrastructure

**Enable Vercel auto-deploy on git push** `[S]`  
Currently every deployment requires a manual trigger in the Vercel dashboard. Auto-deploy on push to `main` is a single toggle in Vercel project settings (Settings → Git → Auto-Deploy). Once enabled, every `git push` deploys automatically — no manual step needed. This also fixes the content visibility gap where approved cards sit untracked until someone remembers to push and redeploy.

**Faster publish via Vercel ISR** `[M]`  
Current: approval → live website = ~90 seconds (git push → full Vercel rebuild).  
Fix: call `revalidatePath('/en/feed')` (and relevant sub-routes) from `publish_card()` via a Vercel deploy hook or a lightweight Next.js API route. No database needed. Gets publish latency to ~5 seconds.  
_When it matters: flash alerts and time-sensitive cards feel slow to appear on the website._

**Decouple backend from Mac** `[L]`  
The Python orchestrator runs on macOS cron — if the laptop sleeps or is off, cron misses. Moving to a cloud host (small VPS or AWS Lambda + EventBridge) would make the system truly 24/7. Prerequisite: all secrets moved to a proper secret manager, image rendering (Node.js subprocess) tested in Linux environment.  
_Not urgent while Wimbledon is on; revisit before the US Open swing._

---

## Content

**Match stats card type** `[M]`  
A new card type showing per-match statistics: aces, double faults, first serve %, win % on first/second serve, break points saved. Researched July 2026.

**Data source findings:**
- ESPN API — `statistics: []` always empty, no per-match stats in the scoreboard endpoint
- Apify Flashscore actors — all six public actors checked explicitly exclude match statistics; the data lives on a separate Flashscore match-detail endpoint that no public actor scrapes
- Dedicated tennis APIs are the only viable path:
  - [RapidAPI Tennis API](https://rapidapi.com/jjrm365-kIFr3Nx_odV/api/tennis-api-atp-wta-itf) — ATP/WTA/ITF, has a free tier → **recommended first test**
  - [api-tennis.com](https://api-tennis.com) — ATP/WTA/ITF, pricing unclear
  - [tennis-api.com](https://tennis-api.com) — comprehensive live stats, $99+/month
  - [SportsDataIO](https://sportsdata.io/tennis-api) — free trial available
  - STATSCORE — enterprise, contact for pricing

**Next step if pursuing:** trial the RapidAPI free tier on one Grand Slam match to verify field coverage before committing. Only worth building if the news-as-insight pivot succeeds and there's appetite for deeper per-match content.

**Expand recap coverage to Masters 1000s** `[S]`  
`recap_eligible: False` on Indian Wells, Miami, Madrid, Monte Carlo, Italian Open. Flipping these to `True` requires verifying ESPN data quality for each tournament before the season starts. Suggested: test during Indian Wells 2027 in January.

**Video card pipeline** `[M]`  
Infrastructure already exists (`feed-candidates/video/`, `VIDEO_CANDIDATES_DIR`, `run_generate_video()`). Needs a reliable source of embeddable clips and a review flow. Paused — YouTube embed policies are inconsistent across tournament rights holders.

---

## Distribution & Growth

**Substack publishing adapter** `[M]`  
The roadmap's Phase 2 multi-platform vision included a Substack adapter: same card content reformatted as a newsletter post (Markdown, editorial intro, SEO title, subscriber CTA). The Python pipeline already generates content in a platform-agnostic format. Adding a Substack publisher would extend reach to English-speaking newsletter readers with zero extra AI cost per card.

**SEO-friendly match analysis URLs** `[S]`  
Currently analyses are not structured for search traffic. The roadmap specifies `/analysis/sinner-alcaraz-madrid-2026-qf` as the URL pattern, targeting search queries like "Sinner vs Alcaraz Madrid 2026 analysis." Each match analysis page indexed by Google compounds over time — 50+ pages after one Grand Slam. Requires changing how analyses are stored and routed in the Next.js app.

**Racket finder affiliate integration** `[M]`  
The racket database exists and the finder is live, but there are no affiliate links on recommendation pages. The roadmap identifies this as the primary monetisation path. Requires registering with tennis retail affiliate programmes (Tennis Warehouse, Tennis Express, Babolat direct) and adding tracked links to the racket result pages. Also consider making each racket+profile combination a crawlable URL for SEO.

**Email capture** `[S]`  
No email capture exists anywhere on the site. The roadmap proposes a lightweight CTA on the match analysis pages: "Subscribe for match predictions before every Grand Slam." Even a simple form connected to Mailchimp or Resend would start building an owned audience — the only distribution channel not dependent on a platform's algorithm.

# TennisMind — Product Backlog

**Last updated:** 2026-07-08  
Items are grouped by area. Each has a rough effort tag: `[S]` small (hours), `[M]` medium (days), `[L]` large (weeks).

---

## Data & Sources

**Apify re-enable for 250/500 tournaments** `[S]`  
ESPN coverage gets thin for sub-Masters events — draws populate late, linescores sometimes missing. Apify fallback code is still in place (`fetch_structured_results` reads from `logs/apify-cache-{date}.json`). To activate: re-enable Apify credit spend and set `recap_eligible: True` on the relevant calendar entries.  
_Relevant for: Indian Wells, Miami, Madrid, Halle, Queen's Club recaps next season._

---

## Pipeline

**Tiebreak scores in ESPN data** `[S]`  
`_parse_espn_results()` currently formats a tiebreak set as `7-6` with no bracket score. ESPN's `linescores` may carry the tiebreak score separately — worth checking and surfacing it as `7-6(5)` in recap output.

**Prediction accuracy dashboard** `[M]`  
The `outcome` frontmatter field (`correct | incorrect | void`) is already written on prediction cards. A simple script could aggregate accuracy by tournament, surface, and round and write a summary card. The solution design already exists at `docs/solution-design-prediction-accuracy.md`.

---

## Infrastructure

**Faster publish via Vercel ISR** `[M]`  
Current: approval → live website = ~90 seconds (git push → full Vercel rebuild).  
Fix: call `revalidatePath('/en/feed')` (and relevant sub-routes) from `publish_card()` via a Vercel deploy hook or a lightweight Next.js API route. No database needed. Gets publish latency to ~5 seconds.  
_When it matters: flash alerts and time-sensitive cards feel slow to appear on the website._

**Decouple backend from Mac** `[L]`  
The Python orchestrator runs on macOS cron — if the laptop sleeps or is off, cron misses. Moving to a cloud host (small VPS or AWS Lambda + EventBridge) would make the system truly 24/7. Prerequisite: all secrets moved to a proper secret manager, image rendering (Node.js subprocess) tested in Linux environment.  
_Not urgent while Wimbledon is on; revisit before the US Open swing._

---

## Content

**Expand recap coverage to Masters 1000s** `[S]`  
`recap_eligible: False` on Indian Wells, Miami, Madrid, Monte Carlo, Italian Open. Flipping these to `True` requires verifying ESPN data quality for each tournament before the season starts. Suggested: test during Indian Wells 2027 in January.

**Video card pipeline** `[M]`  
Infrastructure already exists (`feed-candidates/video/`, `VIDEO_CANDIDATES_DIR`, `run_generate_video()`). Needs a reliable source of embeddable clips and a review flow. Paused — YouTube embed policies are inconsistent across tournament rights holders.

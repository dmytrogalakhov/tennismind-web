# Prediction Confidence Scoring

**Author:** Dmytro Galakhov  
**Added:** June 2026  
**Location:** `generate_feed.py` — `compute_match_confidence()` and its four sub-functions

---

## Overview

Every prediction card shows a confidence percentage (e.g. "80% confident"). Until June 2026 this number was produced entirely by the LLM — it was asked to estimate confidence as part of its JSON output. That was a single, opaque number with no explainability and no consistency across similar matchups.

The new system replaces the LLM number with an **algorithmic four-factor model**. The LLM still writes the pick and the take; the confidence is now computed from structured signals.

The breakdown is printed to the console on every prediction run:

```
📊 Confidence: 80%  (base=60, seed=+20, h2h=+0, surface=+0, form=+0)
```

---

## The Formula

```
confidence = clamp(60 + seed_delta + h2h_delta + surface_delta + form_delta, 40, 92)
```

**Base:** 60 — a coin-flip starting point, slightly biased toward the favourite (since the LLM tends to pick the stronger player).

**Floor:** 40 — any pick we're willing to publish is at least 40% confident.

**Ceiling:** 92 — 100% confidence is never warranted in tennis.

---

## Factor 1 — Seed Differential `[-20, +20]`

**Function:** `_seed_confidence_delta(seed_pick, seed_other)`

Seeding is the clearest proxy for ranking gap in a draw. A [1] seed vs an unseeded player is the maximum case.

| Scenario | Delta |
|----------|-------|
| Pick seeded [1–4], opponent unseeded | +20 |
| Pick seeded [5–8], opponent unseeded | +16 |
| Pick seeded [9–16], opponent unseeded | +12 |
| Pick seeded [17+], opponent unseeded | +8 |
| Opponent seeded [1–4], pick unseeded | -20 |
| Opponent seeded [5–8], pick unseeded | -16 |
| Opponent seeded [9–16], pick unseeded | -12 |
| Opponent seeded [17+], pick unseeded | -8 |
| Both seeded | `(opponent_seed − pick_seed) × 2`, clamped to ±20 |
| Neither seeded | 0 |

**Example:** Sabalenka [1] vs Kostovic (unseeded) → seed_delta = +20.

---

## Factor 2 — Head-to-Head Record `[-15, +15]`

**Function:** `_h2h_confidence_delta(pick_surname, other_surname, search_content)`

Parses the H2H record from the search content returned by Tavily. The function looks for patterns like:

- `"Sinner 4-0 Kecmanovic"`
- `"Sabalenka leads the H2H 6-2"`
- `"never met"` / `"first career meeting"` → returns 0

Once wins/losses are extracted, they're passed to `_h2h_ratio_delta(pick_wins, other_wins)`:

```
ratio = pick_wins / total
delta = round((ratio − 0.5) × 30), clamped to [−15, +15]
```

| H2H ratio | Delta |
|-----------|-------|
| 5-0 (100%) | +15 |
| 3-1 (75%) | +7 |
| 2-2 (50%) | 0 |
| 1-3 (25%) | -7 |
| 0-4 (0%) | -15 |

**Limitation:** Requires the search results to contain a parseable record string. If Tavily returns match previews without explicit H2H stats, the delta is 0. This happens most often for lower-ranked players who haven't met before.

---

## Factor 3 — Surface Win Rate `[-10, +10]`

**Function:** `_surface_confidence_delta(pick_surname, other_surname, surface, tour)`

Uses **JeffSackmann's GitHub match CSV files** (`tennis_atp` / `tennis_wta` repositories) to compute surface-specific win rates for both players over the past 2–3 seasons (2024–2026 files).

**Data source:**
```
https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_matches_{year}.csv
```

**Process:**
1. Fetch CSVs for 2024, 2025, 2026 — one HTTP request each, 15s timeout
2. Filter rows by `surface` column (`Grass`, `Clay`, `Hard`)
3. Count wins and losses per player surname (last word of `winner_name` / `loser_name`)
4. Minimum threshold: **5 matches** on that surface — players below this are excluded
5. Win rate = `wins / (wins + losses)` per player
6. `delta = round((pick_rate − other_rate) × 50)`, clamped to [−10, +10]

**Caching:** Results are cached to `~/match-analyst-bot/logs/jeff-surface-{tour}-{surface}.json` with a **7-day TTL**. The cache key is `{tour.lower()}-{surface.lower()}` (e.g. `wta-grass`).

**Why it's often 0:** Lower-ranked players or qualifiers frequently have fewer than 5 matches on the specific surface in the dataset, so they don't meet the threshold. The delta is 0 rather than a noisy estimate from 2-3 data points.

---

## Factor 4 — Recent Form `[-10, +10]`

**Function:** `_form_confidence_delta(pick_surname, search_content)`

Scans a 950-character window of search content around the pick player's name for form signals:

| Signal pattern | Delta |
|----------------|-------|
| `"won his last N consecutive matches"` | `+min(N×2, 10)` |
| `"lost his last N consecutive matches"` | `-min(N×2, 10)` |
| `"defending champion"` / `"title holder"` / `"in great form"` | +5 |
| `"injur"` / `"withdrew"` / `"fitness concern"` / `"out of form"` | -5 |

Multiple signals can stack, but the total is clamped to [−10, +10].

**Limitation:** The regex approach is brittle — if Tavily returns snippets that don't mention streaks explicitly (e.g. "he's been playing well"), the form delta is 0. This is intentional: 0 is better than a noisy guess from vague language.

---

## Wiring

`run_predict(match_arg, tour="ATP")` calls `compute_match_confidence()` after the LLM returns its JSON. The LLM's `confidence` field is **discarded** — it's used only as a sanity check signal during prompt development. The `tour` parameter defaults to `"ATP"` and is passed in by `_commission_prediction()` in `orchestrator.py` via `match.get("tour", "ATP")`.

The algorithmic confidence is stored in `card["confidence"]` and written to the candidate's YAML frontmatter. The Wimbledon card renderer reads this value for the confidence display.

---

## Tuning

To adjust factor weights, change the clamp ranges in each sub-function:

| Factor | Current range | Cap in function |
|--------|--------------|-----------------|
| Seed | ±20 | `max(-20, min(20, ...))` in `_seed_confidence_delta` |
| H2H | ±15 | `max(-15, min(15, ...))` in `_h2h_ratio_delta` |
| Surface | ±10 | `max(-10, min(10, ...))` in `_surface_confidence_delta` |
| Form | ±10 | `max(-10, min(10, ...))` in `_form_confidence_delta` |
| Overall | [40, 92] | `max(40, min(92, ...))` in `compute_match_confidence` |

The base (60) and global clamp ([40, 92]) are in `compute_match_confidence()` directly.

# Solution Design: Prediction Accuracy Tracking

**Status:** Proposed
**Date:** July 2026
**Priority:** 1 of 5

---

## 1. Problem

TennisMind publishes match predictions daily but never closes the loop. We don't know if we were right, readers don't know if we can be trusted, and we have no data to improve confidence scoring. A product built on analysis should be accountable for its analysis.

---

## 2. Goal

- Record the outcome of every prediction we publish
- Expose a running accuracy record on the website
- Use outcome data to calibrate confidence scoring over time

---

## 3. Systems Involved

| System | Role |
|---|---|
| ESPN results API | Source of truth for match outcomes |
| Published feed cards (`content/feed/`) | Where prediction cards live after approval |
| New accuracy store (`data/prediction-outcomes.json`) | Maps prediction slug → outcome |
| Orchestrator (`--recap` run) | Natural trigger point — results already fetched here |
| Website (Next.js) | Displays accuracy record on predictions page |

---

## 4. Data Model

Each published prediction card already contains everything needed to match it to a result:

```yaml
# content/feed/novak-djokovic-vs-stefanos-tsitsipas-r2-prediction.md
type: "prediction"
title: "Novak Djokovic vs Stefanos Tsitsipas — R2 Prediction"
tags: ["Djokovic", "Tsitsipas", "Wimbledon"]
player1: "Novak Djokovic"
player2: "Stefanos Tsitsipas"
prediction_winner: "Novak Djokovic"   # ← who we picked
confidence: 76                         # ← our stated confidence (integer)
date: "2026-07-01"
```

The accuracy store appends one record per resolved prediction (keyed by slug):

```json
{
  "novak-djokovic-vs-stefanos-tsitsipas-r2-prediction": {
    "pick": "Novak Djokovic",
    "player1": "Novak Djokovic",
    "player2": "Stefanos Tsitsipas",
    "confidence": 76,
    "date": "2026-07-01",
    "resolved_date": "2026-07-01",
    "outcome": "correct",
    "actual_winner": "Novak Djokovic"
  }
}
```

`"void"` covers walkovers, retirements before completion, and matches we can't match to a result.

---

## 5. Matching Logic

The matching step runs at the end of `run_generate_recap()`, reusing the `all_matches` list already fetched from ESPN — no second API call needed. A new `resolve_predictions(all_matches)` function:

1. Scans `content/feed/` for `*-prediction.md` cards dated within the last 3 days
2. Skips cards already in `prediction-outcomes.json` or already stamped with an `outcome` field
3. For each unresolved card, reads `prediction_winner`, `player1`, `player2` from frontmatter
4. Cross-references against the ESPN results list by last-name comparison (unicode-normalised, strips seed tags like `[7]`)
5. If a match is found: stamps `outcome` + `actual_winner` into the card's frontmatter and appends to `prediction-outcomes.json`
6. If no match found after 3 days: leaves unresolved (manual void if needed)

Name matching strips seed numbers (`[7]`, `[1]`) before comparing last names.

---

## 6. Accuracy Display

### Backend

A new `lib/predictions.ts` function reads `prediction-outcomes.json` (committed to the repo alongside content) and computes:

- Overall accuracy (last 30 days)
- Accuracy by tournament
- Accuracy by confidence tier (60–69%, 70–79%, 80–89%, 90%+)
- Rolling 7-day accuracy

### Website

A summary banner on the `/predictions` page:

```
Our record at Wimbledon 2026:  14/19 correct  (74%)
Last 30 days:  38/52  (73%)
```

Each published prediction card gains a small outcome badge after resolution:
- ✅ Correct
- ❌ Incorrect
- — Void

---

## 7. Confidence Calibration

After each tournament, a calibration report compares stated confidence to actual win rate:

| Stated confidence | Picks | Correct | Actual rate |
|---|---|---|---|
| 60–69% | 12 | 7 | 58% ✓ |
| 70–79% | 8 | 7 | 88% — overcalibrated |
| 80–89% | 6 | 4 | 67% — undercalibrated |
| 90%+ | 3 | 3 | 100% |

This surfaces whether the H2H/seed/surface bonuses in `_build_confidence_score()` are accurate or systematically biased. Adjustments to the scoring deltas follow from this data, not from intuition.

---

## 8. Implementation Steps

1. Add `confidence` field to `_build_frontmatter()` in `generate_feed.py` — computed but not previously written to frontmatter
2. Write `resolve_predictions(espn_results)` in `generate_feed.py` — called at end of `run_generate_recap()`
3. Create `data/prediction-outcomes.json` (starts as `{}`)
4. Extend `FeedCard` type in `lib/feed.ts` to include `predictionWinner`, `confidence`, `outcome`, `actualWinner`, `player1`, `player2`
5. Add accuracy banner to `/[lang]/predictions/page.tsx` — computed from resolved cards in the feed
6. Add outcome badge per card on predictions page (correct/incorrect/void)

---

## 9. Open Questions

- **Accuracy banner data source**: outcomes are computed from published cards in `content/feed/` at page render time — no separate sync needed. The `outcome` field stamped into each card's frontmatter is the source of truth.
- **Confidence backfill**: cards published before `confidence` was added to `_build_frontmatter()` won't have the field. Track confidence-based calibration from the date of the fix forward; don't attempt to retroactively compute it.
- **Retirement/walkover handling**: a match where the loser retires after one set counts as a result (ESPN marks `retired=True` but the match is complete). A pre-match withdrawal means neither player appears in results — the card will simply remain unresolved and eventually age out of the 3-day window.

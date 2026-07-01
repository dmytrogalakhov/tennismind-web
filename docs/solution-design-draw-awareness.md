# Solution Design: Draw Awareness in Prompts

**Status:** Proposed
**Date:** July 2026
**Priority:** 2 of 5

---

## 1. Problem

Predictions and recaps are written without knowledge of where a match sits in the draw. This causes two classes of error:

1. **Prediction errors**: we predict an upset without knowing the winner plays Djokovic in the next round — relevant context for assessing real stakes and player motivation.
2. **Recap framing errors**: we describe a R3 win without mentioning it sets up a QF against the world #1 — the most newsworthy fact about the match.

The data already exists in the ESPN API response. We're not fetching it per match.

---

## 2. Goal

- For every match we generate content about, provide the LLM with: who the winner plays next, what half of the draw they're in, and who the potential SF opponent is.
- This context informs both the narrative framing and the confidence score.

---

## 3. Systems Involved

| System | Role |
|---|---|
| ESPN scoreboard API | Full bracket structure per tournament |
| `fetch_espn_events()` | Already fetches all 478 matches in the draw |
| `_parse_espn_fixtures()` | Filters to today — will be extended to index the full draw |
| `generate_card_prediction()` | Consumes per-match context dict |
| Recap writing prompt | Receives enriched match context |

---

## 4. Data Available in ESPN

The ESPN tournament scoreboard endpoint returns the full draw in one call. Each `comp` dict includes:

- `comp['competitors']` — both players, with seeds and rankings
- `comp['round']['displayName']` — which round this match is
- `comp['status']['completed']` — whether it has been played
- The sequential bracket position is implicit in the event ordering

From this, we can reconstruct:

- The winner's next match (the match in round N+1 that shares the same bracket segment)
- The likely SF opponent (the top seed in the opposite QF quadrant)
- The draw half (top/bottom)

---

## 5. Draw Index Structure

A new `_build_draw_index(comps)` function processes the full ESPN event list once per tournament day and returns:

```python
{
  "Djokovic": {
    "seed": 1,
    "draw_half": "top",
    "current_round": "R2",
    "next_match_opponent": "Tsitsipas",   # projected (based on completed R1)
    "projected_qf": "Medvedev",
    "projected_sf": "Alcaraz",
    "projected_final_half": "bottom"
  },
  "Alcaraz": { ... },
  ...
}
```

Building this index:
1. Separate all matches into rounds (R1, R2, R3, ... Final)
2. For each R1 match, the winner advances to the specific R2 match covering that bracket slot
3. For completed rounds, use the actual winner; for upcoming rounds, use the higher seed as projection
4. Group by draw quadrant (8 per quarter of a 128-draw GS)

The index is keyed by last name (normalised) so it can be looked up by player name from prediction/recap context.

---

## 6. Integration Points

### Predictions

In `generate_card_prediction()`, the per-match context dict gains a `draw_context` field:

```python
match_context = {
    "player1": "Djokovic",
    "player2": "Tsitsipas",
    "round": "R2",
    "surface": "clay",
    ...
    "draw_context": {
        "winner_plays_next": "Medvedev (projected)",
        "projected_sf": "Alcaraz",
        "stakes": "QF spot in Alcaraz's half"
    }
}
```

The prediction prompt gains a `DRAW CONTEXT` section:

```
DRAW CONTEXT
Winner plays next: Medvedev (projected R3, seeded 3)
Projected SF: Alcaraz (top seed, opposite quarter)
Stakes: A run here puts the winner on a collision course with Alcaraz by the semis.

Use this to inform the narrative — mention the path ahead if it's relevant to the pick.
```

### Recaps

The recap prompt gains a per-match draw context injection in the enriched match block:

```
[Djokovic def. Tsitsipas 6-3 7-5 6-4]
Draw: Djokovic now faces Medvedev in R3. Win there and he's in the SF against Alcaraz.
```

The LLM is instructed: "if the next-round matchup is marquee, mention it as the lead-out line."

---

## 7. Round Progression Logic

For Grand Slams (128-draw):
- R1 → R2: 64 matches → 32 winners paired by bracket position
- R2 → R3: 32 matches → 16
- R3 → R4: 16 matches → 8 (Last 16)
- R4 → QF: 8 → 4
- QF → SF: 4 → 2
- SF → Final: 2 → 1

For ATP 250/500 (48 or 32 draws), adjust bracket size. The index builder detects draw size from the number of R1 matches.

Bracket position is computed from the ESPN event ordering — ESPN consistently lists matches in bracket order within each round.

---

## 8. Implementation Steps

1. Write `_build_draw_index(comps)` in `generate_feed.py` — processes raw ESPN comps into the player index above
2. Call it once in `fetch_today_schedule()` and attach it to the tournament context object
3. Update `generate_card_prediction()` to accept and pass `draw_context` per match
4. Update prediction prompt template with `DRAW CONTEXT` section
5. Update recap enrichment step — pass draw index to `enrich_marquee_matches()`
6. Update recap writing prompt with per-match draw context injection
7. Test on a completed-round snapshot to verify bracket advancement logic

---

## 9. Open Questions

- **Projection accuracy for early rounds**: In R1, the R3 opponent is unknown — do we project (higher seed wins) or say "likely Medvedev"? Recommendation: project and label it "projected" to be honest.
- **Non-GS draws**: ATP 250/500 have byes and smaller fields. The bracket logic is the same but the draw size varies. May need a `draw_size` detection step.
- **When draw index is unavailable**: Some challengers and WTA events may not have ESPN draw data. Graceful fallback: omit `draw_context` rather than error.
- **Already-eliminated players**: The index should not project a player past a round they have already lost. Need to filter on `status.completed` + winner identity before projecting forward.

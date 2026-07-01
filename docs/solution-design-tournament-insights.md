# Solution Design: Tournament Insights

**Status:** Proposed
**Date:** July 2026
**Priority:** 4 of 5

---

## 1. Problem

The insights agent currently pauses during active Grand Slams (`GS-only mode`) to avoid producing generic evergreen content that competes with live tournament coverage. The pause is correct — an insights card about Djokovic's clay history is noise during Roland Garros. But the pause leaves the feed empty of evergreen content for two weeks at a time, the highest-traffic period of the year.

The fix is not to resume generic insights during a GS — it's to produce tournament-contextual insights that are only relevant *because* the tournament is happening.

---

## 2. Goal

- During active Grand Slams, the insights agent produces tournament-specific cards rather than pausing
- Cards are contextually relevant: draw analysis, historical patterns, surface data, player paths
- These cards have a short shelf life (tournament duration) and are marked as such

---

## 3. New Card Sub-Type: `tournament_insight`

A new card type that sits within the `insights` category but is scoped to a specific tournament:

```yaml
---
type: insight
subtype: tournament_insight
tournament: "Roland Garros 2026"
expires: "2026-06-09"   # end of tournament
title: "The Safest Path to a Final in 20 Years"
---
```

The website already filters by `type: insight` — the `subtype` field allows the frontend to optionally badge these as "Tournament Edition" without a schema change.

After the tournament ends, these cards can be archived (moved to a `/archive/` subfolder or filtered off the feed via the `expires` field).

---

## 4. Content Types for Tournament Insights

Five categories of tournament insight, ranked by production effort:

### 4.1 Draw analysis
"Alcaraz and Djokovic are in the same half. Here's what that means."

Data source: draw index (see solution-design-draw-awareness.md). No Tavily required — pure draw arithmetic.
- Who is in each quarter
- When the marquee match would occur (assuming no upsets)
- Historical odds of an upset in that bracket position

### 4.2 Surface-specific patterns
"Only two players in the field have a winning record on clay in slams — here's the data."

Data source: ATP/WTA stats API or pre-built static dataset. These numbers don't change during the tournament.
- Surface win % for seeded players
- First-serve % on clay vs. other surfaces for key players
- Bagel/breadstick rates by surface

### 4.3 Historical patterns at this tournament
"The #2 seed has won Roland Garros only once in the last 15 years."

Data source: static historical records (can be embedded in a prompt or fetched via Tavily with targeted queries).
- Seed outcomes by round over last 10 years
- Defending champion's performance the following year
- First-time finalist probability by ranking bracket

### 4.4 "Watch for" previews
"These five matches in R2 will decide which side of the draw is truly open."

Data source: draw index + rankings. Published before the round starts.
- Three matches to watch in the next round
- Why each matters (upset potential, H2H, form coming in)

### 4.5 Mid-tournament story threads
"The bottom quarter of the draw is now wide open. Here's who benefits."

Generated after a major upset using recap data.
- Published reactively after a top-10 loss
- Explains downstream implications for the bracket
- Uses real player names and actual round outcomes

---

## 5. Production Schedule

| Trigger | Card type | When |
|---|---|---|
| Tournament starts (Day 0) | Draw analysis | Day 0, 12:00 |
| Tournament starts | Surface pattern | Day 1, 10:00 |
| R1 complete | "Watch R2" preview | After R1 recap, same day |
| Top-10 upset in recap | Draw storyline | Same day, injected into insights queue |
| QF draw set | QF preview | Day before QF, 10:00 |

The orchestrator's `--insights` run already has access to `get_active_tournaments()`. Add a branch: if active GS, run `generate_tournament_insights()` instead of `generate_evergreen_insights()`.

---

## 6. Implementation

### New function: `generate_tournament_insights()`

```python
def generate_tournament_insights(tournament: dict, draw_index: dict,
                                 completed_rounds: list[str]) -> list[dict]:
    """
    Returns a list of tournament insight card dicts for the current
    tournament day. Selects card types based on what's been completed.
    """
    cards = []
    
    if not completed_rounds:
        # Pre-tournament: draw analysis only
        cards.append(_gen_draw_analysis(tournament, draw_index))
    
    if "R1" in completed_rounds and "R1_preview_sent" not in state:
        cards.append(_gen_round_preview(tournament, draw_index, next_round="R2"))
    
    # Check for recent top-10 upset (from recap agent state)
    recent_upsets = _get_recent_upsets(tournament)
    for upset in recent_upsets:
        if upset["slug"] not in state.get("upset_cards_sent", []):
            cards.append(_gen_upset_storyline(tournament, draw_index, upset))
    
    return cards
```

### State tracking

A lightweight state file `data/tournament-insights-state.json` tracks what has been sent for the current tournament to prevent duplicate tournament insight cards:

```json
{
  "Roland Garros 2026": {
    "draw_analysis_sent": true,
    "round_previews_sent": ["R2", "R3"],
    "upset_cards_sent": ["djokovic-r2-exit-2026-06-04"]
  }
}
```

### Orchestrator integration

In `orchestrator.py`, `run_insights_only()`:

```python
if primary and primary.get("is_grand_slam"):
    cards = gf.generate_tournament_insights(primary, draw_index, completed_rounds)
else:
    cards = gf.generate_evergreen_insights(...)
```

---

## 7. Expiry and Archiving

Tournament insight cards include an `expires` date equal to the tournament end date. The website's feed query can filter `expires > today` to hide stale cards automatically. No manual cleanup required.

---

## 8. Implementation Steps

1. Add `subtype` and `expires` fields to card frontmatter schema
2. Write `_gen_draw_analysis()` — requires draw index (dependency on solution-design-draw-awareness.md)
3. Write `_gen_round_preview()` — requires draw index + completed round data
4. Write `_gen_upset_storyline()` — triggered by recap state, requires draw index
5. Write `generate_tournament_insights()` orchestrator function
6. Create `data/tournament-insights-state.json` tracker
7. Update `run_insights_only()` in orchestrator to branch on active GS
8. Update website feed query to respect `expires` field

---

## 9. Open Questions

- **Dependency on draw awareness**: items 4.1, 4.4, 4.5 all require the draw index from the draw-awareness design. If that ships first, this feature is largely unblocked. If not, we can start with item 4.2 (surface stats — no draw index needed) and 4.3 (historical patterns — static data).
- **Content quality on surface stats**: the stats need to come from a reliable source. Do we fetch from ATP/WTA API (if available), embed static tables in prompts, or use Tavily for targeted lookups? Recommendation: start with Tavily targeted queries ("Djokovic clay slam win percentage") and validate manually before shipping.
- **Card volume**: we don't want to flood the feed. Recommend a maximum of 2 tournament insight cards per day, regardless of how many triggers fire.
- **WTA/ATP parity**: both tours run GS simultaneously. The insights agent should produce tournament cards for both draws, but prioritise the one with more active storylines rather than generating identical content for both.

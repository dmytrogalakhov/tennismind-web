# Solution Design: News Discovery Loop

**Status:** Idea — not yet built
**Date:** July 2026
**Author:** Dmytro Galakhov
**Related:** Strategic Roadmap Phase 5, `docs/orchestrator-solution-design.md`

---

## 1. Problem Statement

The current news pipeline is a single cron job running at 14:00 every day. It does discovery, curation, and card generation in one step. This means:

- A story breaking at 10:00 sits undetected until 14:00 — a 4-hour lag
- Every run re-evaluates URLs it has already seen, paying Tavily tokens for nothing new
- Sonnet is called even when the sources turn up nothing fresh
- There is no memory between runs — deduplication only works within a single run

The goal of the news discovery loop is to **separate the act of finding stories from the act of writing cards**, so that discovery can run frequently and cheaply while generation only fires when there is something genuinely worth writing about.

---

## 2. Current Architecture

```
14:00 cron (once daily)
    │
    ▼
collect_search_content_news()
    ├── Tavily searches (5-8 queries)
    ├── Flashscore gap-fill
    └── Google News RSS
    │
    ▼
build_news_curation_prompt()   ← Sonnet (expensive)
    │
    ▼
3-5 news card candidates
    │
    ▼
Telegram for review
```

**Problems with this flow:**
- Discovery and generation are coupled — one slow, expensive step
- No persistent memory of what has been seen before
- Running more frequently would multiply Sonnet costs even with no new stories

---

## 3. Proposed Architecture

Split the single cron into two separate loops with different cadences:

```
DISCOVERY LOOP (every 60 min, active hours only)
    │
    ├── Query: Tavily (3-4 focused searches)
    ├── Query: Google News RSS
    ├── Query: Flashscore (active tournament scores/news)
    │
    ├── For each result:
    │     ├── Already in queue? → skip (URL dedup)
    │     ├── Stale (> 48h)? → skip
    │     ├── Low trust source? → skip
    │     └── Score and append to discovery_queue.json (status: "pending")
    │
    └── Prune queue: mark items older than 48h as "rejected_stale"


GENERATION LOOP (2× per day: 10:00 + 17:00)
    │
    ├── Read discovery_queue.json — filter for "pending" items
    ├── Sort by score, take top N (e.g. N=8)
    │
    ├── Pass to Sonnet curation prompt (same as today)
    │     └── Sonnet selects 3-5, writes cards
    │
    ├── Save candidates to feed-candidates/news/
    ├── Mark queue items as "generated"
    └── Send to Telegram for review (same as today)
```

**Human experience is unchanged:** cards still appear in Telegram with approve/reject buttons. The difference is under the hood.

---

## 4. The Discovery Queue

A persistent JSON file at `data/discovery_queue.json`. Each entry represents one candidate story.

```json
{
  "a3f8bc12": {
    "id": "a3f8bc12",
    "url": "https://bbc.co.uk/sport/tennis/articles/...",
    "headline": "Sinner withdraws from Wimbledon with ankle injury",
    "source_domain": "bbc.co.uk",
    "source_trust": 0.9,
    "published_at": "2026-07-03T08:30:00Z",
    "discovered_at": "2026-07-03T09:00:00Z",
    "tournament": "Wimbledon",
    "score": 0.87,
    "status": "pending",
    "raw_snippet": "Jannik Sinner has withdrawn from Wimbledon..."
  }
}
```

**Status values:**

| Status | Meaning |
|---|---|
| `pending` | Discovered, not yet passed to generation |
| `generated` | Sonnet wrote a card from this story |
| `rejected_stale` | Item expired (> 48h) before being generated |
| `rejected_duplicate` | URL or headline matched an existing item |
| `rejected_low_score` | Score below threshold — not worth generating |

The queue is a **write-once, append-only store** for discovery. Once a URL is in the queue (in any status), it is never re-evaluated. This is the primary dedup mechanism.

---

## 5. Scoring Formula

Each discovered story gets a score between 0 and 1. Only items above the threshold (0.40) enter the queue.

```
score = (freshness × 0.5) + (source_trust × 0.3) + (relevance × 0.2)
```

**Freshness** (decays linearly over 48 hours):
```
freshness = max(0, 1 - hours_since_published / 48)
```
A story published 6 hours ago scores 0.875. A 24-hour-old story scores 0.50. At 48 hours it scores 0.

**Source trust** (manually tiered):

| Tier | Score | Examples |
|---|---|---|
| 1 — Official | 0.95 | atptour.com, wtatennis.com, wimbledon.com |
| 2 — Premium sports | 0.85 | bbc.co.uk/sport, skysports.com/tennis, espn.com/tennis |
| 3 — Tennis specialist | 0.75 | tennis.com, tennisworld.net, ubitennis.com |
| 4 — General sports | 0.60 | eurosport.com, sportingnews.com |
| 5 — Unknown | 0.40 | Any domain not in the above lists |
| Reject | 0.00 | Betting sites, gossip, content farms |

**Relevance** (keyword match):
```
relevance = 1.0  if active tournament name appears in headline or snippet
           0.7   if player name appears
           0.4   if general tennis keyword appears
           0.1   otherwise
```

**Scoring examples:**

| Story | Freshness | Trust | Relevance | Score |
|---|---|---|---|---|
| "Sinner withdraws from Wimbledon" — bbc.co.uk, 2h ago | 0.96 | 0.85 | 1.0 | 0.94 |
| "Djokovic reaches R3" — tennis.com, 12h ago | 0.75 | 0.75 | 1.0 | 0.80 |
| "Top 10 Wimbledon moments" — unknown, 36h ago | 0.25 | 0.40 | 1.0 | 0.33 → rejected |

---

## 6. Deduplication

Three layers, applied in order during discovery:

**Layer 1 — URL exact match**
Check `id = hash(url)` against existing queue keys. If found: skip, regardless of status. This is O(1).

**Layer 2 — Headline similarity**
If the URL is new but the headline is very similar to a recent pending item, skip it. Use the same semantic embedding approach already in the pipeline (the dedup logic in `generate_feed.py`). Threshold: cosine similarity > 0.85.

**Layer 3 — Generation-time dedup**
Before Sonnet runs, the curation prompt already includes a "do not duplicate these already-published cards" section (existing behaviour). This catches stories that got through layers 1 and 2.

---

## 7. Source Queries per Discovery Pass

Each hourly pass runs 3–4 targeted searches, not the current 5–8. Fewer but more precise queries, focused on recency.

During an active Grand Slam:
```
1. "{tournament} 2026 news today"          ← broad tournament sweep
2. "{tournament} results scores {date}"    ← result-specific
3. "tennis withdrawal injury {date}"       ← breaking news signal
4. "tennis upset shock {tournament}"       ← high-value editorial
```

During no tournament:
```
1. "tennis news today {date}"
2. "ATP WTA results {date}"
3. "tennis transfer signing announcement"
```

Searches are templated with today's date to maximise Tavily's recency filter effectiveness.

---

## 8. Generation Trigger Logic

The generation loop runs at fixed times (10:00 and 17:00), but it only calls Sonnet if there is something worth generating.

```python
pending = [item for item in queue if item.status == "pending"]
high_quality = [item for item in pending if item.score >= 0.60]

if len(high_quality) == 0:
    print("No qualifying stories — skipping generation.")
    return

# Otherwise: pass top N to Sonnet as today
```

This means on a quiet day with no fresh news, the 10:00 and 17:00 runs cost nothing beyond a queue file read.

---

## 9. Crontab Changes

**Current:**
```
0 14 * * *  orchestrator.py --news
```

**Proposed:**
```
# Discovery: 3× daily (sweeps only — cheap, no Sonnet)
0 7  * * *    orchestrator.py --discover   ← morning: overnight/early news
0 13 * * *    orchestrator.py --discover   ← midday: morning stories
0 19 * * *    orchestrator.py --discover   ← evening: afternoon results

# Generation: 2× daily (reads from queue, calls Sonnet)
0 14 * * *    orchestrator.py --news       ← afternoon: keeps existing slot
0 19 * * *    orchestrator.py --news       ← evening: after afternoon matches
```

**Slots that do NOT change:**
- `0 8 * * *` recap — must stay, covers yesterday's results
- `0 10 * * *` predictions — must arrive before matches start at 12:00
- `0 21 * * *` insights — unchanged

Note: the 19:00 discovery and 19:00 news run at the same hour. Discovery runs first (no queue lock needed — it's a read-modify-write in seconds) and news picks up what was just added.

The `--discover` flag runs only the discovery pass (cheap: Tavily + queue update).
The `--news` flag reads the queue and runs Sonnet if warranted.

---

## 10. Cost Analysis

**Current (1 run/day):**
- ~7 Tavily searches × $0.015 = $0.11/day
- 1 Sonnet call (~3k tokens in, ~800 out) ≈ $0.05/day
- **Total: ~$0.16/day**

**Proposed (3 discovery passes/day):**
- Discovery: 4 searches × 3 passes = 12 Tavily searches × $0.015 = $0.18/day
- Generation: 2 runs/day × 1 Sonnet call = ~$0.10/day (if stories found both times)
- **Total: ~$0.28/day during tournaments**

**Net increase: ~$0.12/day** during Grand Slams (~14 days) = **~$1.68 per tournament**.

Discovery cron schedule (3× daily):
```
0 7  * * *   discovery  ← catches overnight/early match news
0 13 * * *   discovery  ← catches morning stories before afternoon generation
0 19 * * *   discovery  ← catches afternoon/late results before evening generation
```

Generation runs only in the afternoon and evening — NOT at 08:00 (reserved for recap) or 10:00 (reserved for predictions, which must arrive before 12:00 match start).

**Cost control options if needed:**
- Reduce to 2 searches per discovery pass → ~$0.09/discovery/day total
- Drop to 2 passes/day → ~$0.14/day total

---

## 11. Implementation Plan

This is a **3-phase rollout**, each phase independently releasable.

### Phase 1 — Queue only, generation unchanged

Build the queue and discovery pass without changing how generation works.

- Create `data/discovery_queue.json`
- Add `run_discovery_only()` to `orchestrator.py`
- Add `--discover` CLI flag
- Wire the hourly cron
- Generation still runs from fresh Tavily (existing `--news` unchanged)

**Goal:** validate that the queue accumulates good stories and dedup works. Run for 1 week, inspect the queue manually.

### Phase 2 — Generation reads from queue

Switch `--news` to read top-N items from the queue instead of running its own Tavily searches.

- Modify `collect_search_content_news()` to accept a pre-fetched list of stories
- `--news` reads queue → filters pending → passes to Sonnet
- Sonnet prompt unchanged
- Queue items marked `generated` after cards are saved

**Goal:** validate that card quality is the same or better with queue-sourced stories.

### Phase 3 — Smart scheduling

Add active-hours filtering and cost controls.

- Skip discovery between 23:00 and 06:00
- Skip generation if no high-quality pending items (score < 0.60)
- Add queue health metrics to the morning Telegram plan message

---

## 12. What Stays the Same

These things do NOT change:

- Telegram review flow — still approve/reject each card
- Card format, frontmatter, image generation
- Sonnet curation prompt
- Semantic dedup in generation
- The `--news` CLI flag (redirects to queue-based generation in Phase 2)

---

## 13. Open Questions

**Q1: Is once-daily frequency actually insufficient?**
Before building, monitor the current pipeline for 2 weeks and track: are stories arriving in Telegram more than 6 hours after they broke? If yes, the loop is worth building. If no, hold.

**Q2: Should the queue be SQLite instead of JSON?**
JSON is simpler to debug and requires no dependencies. SQLite adds query capability (e.g. "all pending items from bbc.co.uk in the last 6 hours") but adds complexity. Recommendation: start with JSON. Migrate to SQLite if the queue grows beyond ~500 items or query needs emerge.

**Q3: What is the right score threshold for entering the queue?**
0.40 is a conservative estimate. Should be tuned after Phase 1 by inspecting which items enter the queue vs. which make it to generation. If too many low-quality items accumulate, raise the threshold.

**Q4: Should discovery run during non-tournament periods?**
Probably at reduced frequency (every 4h instead of 1h). The cost argument is weaker during quiet weeks, and there is less breaking news. This can be wired to the existing `get_current_tournament()` check.

---

## 14. Decision Criteria

Build this when **at least two** of the following are true:

1. A notable story broke and arrived in Telegram more than 4 hours after publication
2. The Telegram channel is losing engagement to faster news sources
3. Story volume during tournaments exceeds what once-daily generation can handle
4. The $14/tournament cost is clearly offset by engagement or audience growth

Do NOT build this just because it is architecturally cleaner. The current system works. Add complexity only when the pain is real.

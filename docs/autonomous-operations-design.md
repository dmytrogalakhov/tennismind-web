# Solution Design: Autonomous Content Operations (Orchestrator v2)

**Status:** Design — target state for automating insights, recaps, and news
**Date:** June 2026
**Related:** orchestrator-solution-design.md (v1), rag-memory-prd.md, PDL-011, evals harness

---

## 1. Goal & Business Rationale

**Goal:** the daily content feed (insights, recaps, news, predictions) runs with minimal human time, so the founder's capacity moves to what actually differentiates TennisMind — articles and new features.

**Business framing:** TennisMind's moat is curation + context in a human voice. The articles need the human. The feed does not — it needs the human's *judgment encoded as policy*, executed by agents. The orchestrator's job is to hold that policy and run the feed; the human's daily involvement collapses to tapping ✅ on a phone, and eventually to spot-checking.

**The division of labor (target state):**

| | Owner | Human time/day |
|---|---|---|
| Articles | Human (the product) | the main investment |
| Insights | Agents, full-auto | ~0 (spot checks) |
| Recaps | Agents + phone approval | ~2 min |
| News | Agents + phone approval | ~2 min |
| Predictions | Agents propose, human approves | ~3 min, only on big-match days |

---

## 2. The Autonomy Ladder (trust is earned per feature)

Autonomy is not granted globally — each feature climbs a ladder, and **the eval harness is the promotion gatekeeper.**

```
Level 0  TERMINAL APPROVAL      generate → review in terminal → publish   (where everything started)
Level 1  PHONE APPROVAL         generate → Telegram card with ✅/🗑 → publish on tap
Level 2  AUTO WITH QUALITY GATE generate → publish automatically IF deterministic checks
                                + eval score pass thresholds; route to phone if not
Level 3  FULL AUTO              generate → publish; human spot-checks the channel
```

**Promotion rule:** a feature moves up one level after N consecutive outputs (suggest N=15-20) where the human approved without edits AND eval scores stayed above threshold. A single hard failure (fabrication, factual error) demotes it one level. This makes autonomy measurable and reversible.

**Starting positions:**

| Feature | Start | Rationale |
|---|---|---|
| Insights | Level 2 → 3 | most stable; founder already trusts content + images |
| Recaps | Level 1 → 2 | structured data made them reliable; evals exist to gate them |
| News | Level 1 | freshness/significance filters are new; needs a track record |
| Predictions | Level 1 (capped) | opinions carry brand risk; stays human-approved indefinitely |

---

## 3. The World-Model (the context layer the orchestrator was missing)

Orchestrator v1's flaws all traced to thin context. v2 requires a real world-model — structured, refreshed, and honest about what it doesn't know.

| Knowledge | Source | Refresh |
|---|---|---|
| Full tournament calendar WITH tiers (GS/1000/500/250), dates, surface | maintained data file (data/tournament-calendar-2026.json) — seeded once for the season, includes ALL tour events, not just majors | manual per season; cheap |
| What's active today / coming next week | derived from the calendar + today's date | computed each run |
| Did matches happen yesterday + results | Apify structured fetch (existing) | daily during covered events |
| Player-world signals (injuries, withdrawals, rankings, coach changes) | Tavily targeted queries (the news agent's existing query set) | daily |
| What we've already published / rejected | RAG memory store (existing) | continuous |
| Sub-agent operating rules (insights evergreen-vs-tournament, news off-court-during-events) | encoded in the orchestrator prompt as explicit policy | static |

**The fix for v1's "right answer, wrong reason":** the calendar knows ALL tournaments and their tiers, so the orchestrator reasons "Stuttgart (250) is active; per policy we don't recap 250s" — not "no tournament exists." The world-model matches reality; the *policy* decides coverage.

---

## 4. The Editorial Policy Matrix (WHAT × WHEN, by tournament tier)

This is the founder's judgment, encoded once, executed daily.

| Context | Insights | Recaps | News | Predictions |
|---|---|---|---|---|
| **Grand Slam** | daily, tournament-flavored | daily, full (the RG format) | off-court only (injuries, withdrawals, drama) — recaps own results | QF onward, auto-proposed |
| **1000** | daily, tournament-flavored | daily, full | off-court only | QF onward, auto-proposed |
| **500** | tournament-flavored, fallback evergreen | daily, SHORT (4-6 sentences) | off-court only | final only |
| **250** | try tournament angle, fallback evergreen | **none, UNLESS strong field (see field-strength override) → daily short** | significance-filtered: marquee players, big upsets, comebacks only | only if a marquee matchup (orchestrator flags, human decides) |
| **No tournament** | evergreen | none | the MAIN feed: rankings, injuries, comebacks, previews of what's next | none |

**Field-strength override (amendment):** Tournament tier is a proxy for "are notable players playing" — and the proxy breaks during compressed surface windows. The grass season (~5 weeks between Roland Garros and Wimbledon) has so few events that top players enter 250s/500s for grass preparation — e.g. Stuttgart 2026 drew Fritz, Shelton, Tiafoe, Kyrgios, Bublik. Policy therefore keys on FIELD STRENGTH, not tier alone:

- During the grass swing (and the pre-Australian Open January swing): grass/AO-prep 250s and 500s are recap-worthy — daily short recaps.
- General rule (orchestrator v2): a tournament with 3+ top-20 players in the draw is recap-worthy regardless of tier. The orchestrator checks the entry list once at tournament start.
- A 250 with an ordinary field: no recaps; monitor for transcendent stories and route them to news.

**WHEN (the daily content clock, in the reader's day):**

| Time | What publishes | Why |
|---|---|---|
| 08:30 | Recap of yesterday (if due) | the "catch me up over coffee / commute" moment |
| 12:30 | News (if any passed significance) | lunch-break scroll |
| 20:30 | Insight | the evening wind-down read, as the founder identified |
| event-driven | Prediction (day before a qualifying match) | anticipation window |

**Key resolution of PDL-011:** news and recaps no longer overlap. Recaps = results + meaning, on covered tournaments. News = the player-narrative channel (everything that isn't a result) during events, and the primary feed between them. News finally has a distinct job.

---

## 5. The Approval Channel: Telegram Inline Buttons (the UX unlock)

The single change that removes the terminal from daily life.

**Flow:**
```
Agent generates card (+ image)
   → quality gate runs (deterministic checks; eval if configured)
   → PASS at Level 3: publish directly
   → PASS at Level 1-2: send to founder's private Telegram:
        [card image]
        [card text preview]
        [✅ Publish]  [🗑 Reject]   (optionally [✏️ Edit later])
   → founder taps ✅ → pipeline publishes: move .md to content/feed/,
       post to public channel, write to RAG memory as "published",
       trigger site rebuild
   → founder taps 🗑 → candidate deleted, written to memory as "rejected"
       (never regenerated — existing RAG behavior)
```

**Technical design:**
- Telegram Bot API `sendPhoto`/`sendMessage` with `InlineKeyboardMarkup` (the ✅/🗑 buttons).
- A **listener** receives the button taps (`callback_query`): a small long-polling loop (`getUpdates`) — no public webhook server needed.
- On callback: execute the existing publish/reject functions (they already exist in the review flow — this reuses them with a different trigger).
- Idempotency: each card gets a candidate-id in the callback payload; a tapped card is marked processed so double-taps can't double-publish.
- Edit flow (v2.1): "✏️" replies with the card text; founder sends back edited text as a message; pipeline updates the card and re-offers ✅.

**The honest dependency:** the listener must be RUNNING to hear the taps. On a sleeping laptop it isn't. See Section 7.

---

## 6. Quality Gates: Evals as the Autonomy Gatekeeper

Auto-publishing (Level 2-3) is only safe because the eval harness exists. The gate per card:

1. **Deterministic checks (hard gate):** structure present, length in range, no fabricated players (vs verified list where available), no seed numbers, no markdown artifacts. ANY failure → never auto-publish; route to phone with the failure noted.
2. **Eval score (soft gate, Level 2):** LLM-judge score ≥ threshold (e.g. overall ≥ 3.5) → auto-publish. Below → route to phone.
3. **Dedup gate (existing):** RAG memory similarity check — semantic duplicates blocked before any of this.

This converts the eval harness from a measurement tool into an **operational control system** — the same scores that diagnosed quality now decide, per card, whether a human needs to look. Every gated decision is logged (card, scores, gate outcome) so the autonomy ladder's promotion/demotion is data-driven.

---

## 7. Infrastructure Reality: the Always-On Problem

**"Fully automated" and "runs on a laptop that sleeps" are contradictory.** Cron on the Mac fires only when the lid is open. The 20:30 insight will not publish from a sleeping laptop, and the Telegram listener won't hear button taps.

**Phased approach:**

- **Phase A (now, free):** stay on the Mac. Schedule jobs at times the Mac is typically awake; run the Telegram listener during waking hours (launchd keep-alive). Accept gaps — a missed evening post is tolerable while the system earns trust. This phase is about validating the flows, not reliability.
- **Phase B (when committing to real autonomy, ~€4-5/month):** move the pipeline to an always-on host — a small VPS (e.g. Hetzner) running the cron schedule + the Telegram listener 24/7. The codebase barely changes (same Python, same .env); only the host does. Alternative: GitHub Actions scheduled workflows for generation (free) — but the interactive Telegram listener still needs a persistent process, which favors the VPS.

**Decision rule:** move to Phase B when ≥2 features reach Level 2 — that's the point where missed schedules start costing real value.

---

## 8. The Daily Rhythm (target state, founder's view)

```
07:00  Orchestrator (cloud) builds the day's plan from the world-model + policy matrix.
       Plan arrives on founder's Telegram. No approval needed — the policy IS the approval;
       the plan message is transparency, not a gate.
08:30  Recap (if due) — Level 2: auto-publishes if gates pass; else arrives with ✅/🗑.
12:30  News candidates — arrive with ✅/🗑 (Level 1). Founder taps from anywhere. 
20:30  Insight — Level 3: publishes itself. Founder sees it in the channel like any reader.
       
Founder's total feed time: ~5 minutes of phone taps.
Founder's real work hours: articles.
```

The orchestrator's role shifts from "propose a plan for approval" (v1) to "**execute the standing policy; escalate only exceptions**" — which is what delegation actually means.

---

## 9. Phased Rollout

| Phase | Scope | Exit criterion |
|---|---|---|
| **1. Telegram approval** | ✅ COMPLETE — inline ✅/📅/🗑 buttons; image at candidate creation; unified publish_card() function; auto-send after --generate-insights and --generate-news; --listen listener; --send-pending --include-saved for saved cards; terminal review remains as fallback | Founder runs a full week approving only by phone |
| **2. World-model + policy** | Full-season tournament calendar with tiers; encode the policy matrix into the orchestrator; orchestrator schedules per the content clock | Orchestrator's daily plans are correct for two consecutive weeks incl. a 250-week and a 500-week |
| **3. Quality-gated autonomy** | Wire eval gates; promote insights to Level 2→3, recaps to Level 2 per the ladder rules | Insights publish hands-off for 2 weeks without a quality incident |
| **4. Always-on host** | Move cron + listener to a VPS | Posts land on schedule regardless of the laptop |
| **5. (Stretch) Edit-via-Telegram** | Reply-to-edit flow | — |

Phase 1 is the highest-leverage single build: it changes the founder's daily experience immediately, independent of everything else.

---

## 10. What Deliberately Stays Human

- **Articles** — the product. Never automated; the voice is the moat.
- **Prediction approval** — opinions with brand risk; capped at Level 1 indefinitely.
- **Policy changes** — the matrix encodes founder judgment; agents execute it, never modify it.
- **The autonomy ladder itself** — promotions are reviewed by the founder, informed by eval data, never self-granted by the system.

The end state is not "no human." It is **"the human only where the human adds value"** — judgment encoded once as policy, execution delegated, exceptions escalated, and the founder's hours redirected to the work that actually differentiates.

# Solution Design: Orchestrator Agent

**Status:** v1 implemented (plan-approval mode), shelved as a portfolio artifact
**Date:** June 2026
**Related:** Tech Roadmap Tier 2.2

This document traces the end-to-end flow of the orchestrator agent — what it is, every system it touches, the data sent and retrieved at each step, the decision logic, and its known limitations. It is a technical reference for understanding (and explaining) how agent orchestration works in TennisMind.

---

## 1. What the Orchestrator Is

The orchestrator is a **top-level agent that decides what content to generate each day, then delegates to the existing specialized agents.** It sits one layer above the six content agents.

The key architectural idea: **the agents are not the system — the orchestrator is the decision-maker, the agents are the workers.** This is the "agent that delegates to other agents" pattern.

It runs in **plan-approval mode**: it proposes a plan, a human approves it, then it delegates. It does NOT act fully autonomously — a deliberate design choice to keep a human in the loop while the agent's judgment is still being validated.

---

## 2. Systems Involved

| System | Role | Location |
|---|---|---|
| Cron | Triggers the morning plan automatically | local (macOS crontab) |
| Orchestrator (orchestrator.py) | Gathers context, reasons, guards, delegates | local |
| Tournament calendar | Tells the orchestrator which tournament (if any) is active | local (hardcoded calendar in code) |
| Apify cache | Confirms whether matches happened yesterday | local (data/ cache file) |
| Content store | Tells the orchestrator what's already published / pending | local (content/feed/, content/feed-candidates/) |
| Anthropic (Sonnet) | The reasoning engine — proposes the plan | external API |
| Telegram | Delivers the morning plan to the human | external API |
| The six content agents | Do the actual generation when delegated to | local (generate_feed.py functions) |

---

## 3. The Three-Layer Architecture

```
┌─────────────────────────────────────────────┐
│           ORCHESTRATOR (the brain)           │
│  gather context → reason → guard → delegate  │
└───────────────────┬─────────────────────────┘
                    │ delegates to
        ┌───────────┼───────────┬───────────┐
        ▼           ▼           ▼           ▼
   ┌────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐
   │ recap  │ │  news   │ │ insight │ │prediction│   ← the workers
   │ agent  │ │  agent  │ │  agent  │ │  agent   │
   └────────┘ └─────────┘ └─────────┘ └──────────┘
        │           │           │           │
        └───────────┴─────┬─────┴───────────┘
                          ▼
                  ┌───────────────┐
                  │ Human review  │   ← still approves each card
                  │  + publish    │
                  └───────────────┘
```

Two human checkpoints: (1) approve the PLAN before generation, (2) approve each CARD before publishing. The orchestrator commissions; the human controls.

---

## 4. End-to-End Flow

```
┌──────────────┐  1. Cron fires at 7:00 AM (only if Mac is awake)
│    CRON      │     runs: orchestrator.py --plan-notify
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│  PART A — gather_context()  (deterministic)  │  2. Collect facts, no LLM
│                                              │
│  • tournament calendar → active tournament?  │  ── reads: hardcoded calendar
│  • Apify cache → matches yesterday?          │  ── reads: data/ cache
│      → confirmed / confirmed-none / UNCONFIRMED
│  • content store → what's published/pending? │  ── reads: content/feed*/
│  • today's date, day of week                 │
└──────────────────┬───────────────────────────┘
                   │ context dict
                   ▼
┌──────────────────────────────────────────────┐
│  PART B — propose_plan()  (Sonnet reasoning) │  3. Reason about the plan
│                                              │
│  ── sent to Sonnet: the context dict +       │
│     the orchestration prompt (rules about    │
│     what to generate when)                   │
│  ── returned: a JSON plan —                   │
│     { plan: [...], skipped: [...],           │
│       overall_reasoning: "..." }             │
└──────────────────┬───────────────────────────┘
                   │ raw plan
                   ▼
┌──────────────────────────────────────────────┐
│  PART D — apply_guardrails()  (deterministic)│  4. Override unsafe LLM calls
│                                              │
│  • remove recap if matches CONFIRMED zero    │
│  • (uncertain → surface, don't auto-kill)    │
│  • remove anything already published today   │
│  • cap plan at 3 items                       │
│  ── prints "⚠ Guardrail removed X" if fired  │
└──────────────────┬───────────────────────────┘
                   │ guarded plan
                   ▼
        ┌──────────┴───────────┐
        ▼                      ▼
┌──────────────┐      ┌──────────────────┐
│ --plan-notify│      │  (interactive)   │
│  TELEGRAM    │      │  PART E —        │  5a. notify: send plan to Telegram, STOP
│  send plan   │      │  approval prompt │  5b. interactive: ask y/edit/n
│  to human    │      │  y / edit / n    │
└──────────────┘      └────────┬─────────┘
                               │ (y)
                               ▼
┌──────────────────────────────────────────────┐
│  PART F — delegate()                         │  6. Run the approved agents
│  for each approved item, call the EXISTING   │
│  agent function (recap / news / insight /    │
│  prediction generation)                      │
└──────────────────┬───────────────────────────┘
                   ▼
            normal --review flow per card → publish
```

**Two entry modes:**
- `--plan-notify` (cron): context → reason → guard → **send to Telegram → stop.** No generation. The human reads it and decides whether to run the full flow.
- `python3 orchestrator.py` (interactive): context → reason → guard → **ask approval → delegate → generate.**

This split is what makes it plan-approval: the morning cron only *proposes*; generation requires a human-triggered run.

---

## 5. Data Detail Per Step

**Part A — gather_context (deterministic, no LLM, no cost)**
- Reads the tournament calendar (local) → is a tracked tournament active today?
- Reads the Apify cache (local) → did matches happen yesterday? Returns one of three states: confirmed (count > 0), confirmed-none (rest day), or UNCONFIRMED (no data to check). The three-state distinction is deliberate: "couldn't confirm" must not be silently treated as "zero."
- Reads content/feed/ and content/feed-candidates/ → what's already published or pending (so it doesn't commission duplicates).
- Output: a structured context dictionary.

**Part B — propose_plan (Sonnet, one reasoning call, small cost)**
- Sent: the context dict + the orchestration prompt (editorial rules — recap only if matches, news is continuous, favour tournament content during events, quality over quantity).
- Returned: JSON plan with `plan` (what to generate, each with a reason + priority), `skipped` (what's deliberately not done, with reasons), and `overall_reasoning`.

**Part D — apply_guardrails (deterministic)**
- Hard rules that OVERRIDE the LLM. The LLM proposes; the guardrails dispose. Removes a recap if matches are CONFIRMED zero (but not if merely unconfirmed — that's surfaced for the human). Removes already-published items. Caps at 3.
- This is the key safety pattern: the LLM has reasoning authority, but deterministic code has veto power over unsafe calls. An agent acting confidently on bad reasoning can't produce a broken artifact because the guardrail catches it.

**Part E — approval (human)**
- Interactive mode: y / edit (remove items) / n.
- Notify mode: the plan is sent to Telegram and the run stops; the human decides whether to trigger generation manually.

**Part F — delegate (calls existing agents)**
- For each approved item, calls the corresponding existing generation function. The orchestrator does not re-implement generation — it commissions the agents already built.
- Each generated card then goes through its normal per-card human review before publishing.

---

## 6. Where Each Concern Lives

| Concern | Owned by | Notes |
|---|---|---|
| Facts about today (tournament, matches, published) | gather_context (deterministic) | no LLM — facts must be facts |
| Editorial judgment (what's worth generating) | Sonnet | the reasoning layer |
| Safety (no recap without matches, no duplicates, caps) | guardrails (deterministic) | veto power over the LLM |
| Final approval of the plan | human | plan-approval checkpoint |
| Actual content generation | the six existing agents | orchestrator delegates, doesn't generate |
| Final approval of each card | human | per-card review checkpoint |

The design principle: **deterministic code owns facts and safety; the LLM owns judgment; the human owns approval.** The LLM is bounded on both sides — given verified facts, and checked by guardrails.

---

## 7. Known Limitations (important — these are the honest weaknesses)

These are real and were the reason the orchestrator was shelved rather than relied upon. They share one root cause: **the orchestrator's reasoning is only as good as the context it's given, and its context is currently thin/incomplete.**

1. **Incomplete tournament calendar.** The calendar only knows the major tournaments (500/1000/Slam). Small grass-season 250s (Stuttgart, 's-Hertogenbosch) are active but absent from its world-model, so it reasons "no active tournament" when small tournaments are in fact running. Right conclusion for TennisMind's coverage policy (we don't cover 250s), but reached by wrong reasoning ("none exist" vs. "we don't cover these").

2. **Unaware of the sub-agents' own rules.** The insight agent switches to evergreen content between tournaments — but the orchestrator doesn't know that rule, so it proposes "insights leveraging recent RG matches," contradicting the agent's actual behaviour. The orchestrator reasons about insights in a vacuum.

3. **Right answers for wrong reasons.** It correctly skipped recaps/predictions this week, but justified it with "no active tournament" rather than "we don't cover the active small tournaments." A correct output built on flawed reasoning is fragile — it will mislead when context shifts.

**The lesson (and the interview story):** agent reasoning quality is a *context-completeness* problem, not a prompt problem. To fix these, the orchestrator needs richer, accurate context — the full set of tournaments TennisMind actually covers, and the sub-agents' own operating rules — not better wording. An agent reasons well only over a world-model that matches reality.

---

## 8. Operational Note: Cron Reliability

The morning plan depends on a macOS cron job that only fires when the Mac is awake. If the laptop is asleep at 7:00 AM, the plan is not generated or sent. For genuinely reliable daily automation, an always-on host (cloud VM, scheduled CI job) would be required. Acceptable for a single-user project; noted as a real limitation of laptop-based cron.

---

## 9. Why It Was Shelved

For a single-person operation, the orchestrator's product value is low — the human can decide and run two commands faster than reading a generated plan. Its value is as a demonstrated *agent-orchestration pattern* (a portfolio/learning artifact), not as a daily tool. It is complete enough to demonstrate the pattern; further investment in making it a good daily editor would be polishing a lab feature rather than serving the product. Shelved in working state; the known limitations above are understood and documented rather than fixed.

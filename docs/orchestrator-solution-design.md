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

## 10. v2 Design — What the Course Taught Us to Fix

*Added August 2026. This section extends the v1 design with findings from course analysis (PrepGenAICerts: Coordinator-Subagent, Narrow Decomposition Risk, Subagent Invocation, AgentDefinition Config). Each addition maps directly to a v1 known limitation or a structural gap.*

---

### Fix 1: Agent Registry (AgentDefinition pattern → fixes Limitation #2)

V1 limitation: *"The orchestrator is unaware of sub-agents' own operating rules."*

The coordinator currently reasons about agents in a vacuum. The AgentDefinition pattern says every subagent should have a formal description that tells the coordinator *when to invoke it and what it does*. In TennisMind terms, this becomes an `AGENT_REGISTRY` passed into the coordinator's prompt:

```python
AGENT_REGISTRY = {
    "recap": {
        "description": "Generates a tournament day recap card from match results.",
        "invoke_when": "Matches were played today at a TennisMind-covered tournament.",
        "never_invoke_when": "Rest day, or tournament not in coverage list.",
        "tool_access": ["espn_api", "apify_cache", "tavily_enrichment"],
    },
    "predictions": {
        "description": "Generates prediction cards for tomorrow's scheduled matches.",
        "invoke_when": "Tomorrow's schedule is known and contains covered matches.",
        "never_invoke_when": "Final day (no tomorrow), or rest day.",
        "tool_access": ["espn_schedule", "elo_rankings"],
    },
    "news": {
        "description": "Researches pending queue items and generates news cards.",
        "invoke_when": "Discovery queue has pending items. Runs independently of match schedule.",
        "never_invoke_when": "Queue is empty.",
        "tool_access": ["tavily", "tennis_abstract", "memory"],
    },
    "insights": {
        "description": "Generates evergreen tennis insight cards (stats, history, gear).",
        "invoke_when": "Any day. Between tournaments, generates from evergreen topic pool. During tournaments, generates tournament-contextual insights.",
        "never_invoke_when": "Never fully skipped — always has content to generate.",
        "tool_access": ["tavily", "image_generation"],
    },
    "flash_alerts": {
        "description": "Sends immediate Telegram alerts for significant live results.",
        "invoke_when": "Major upset, final result, or milestone detected in today's results.",
        "never_invoke_when": "No matches, or no significant results.",
        "tool_access": ["espn_api", "telegram"],
    },
}
```

The coordinator receives this registry as part of its prompt. It reasons over `invoke_when` / `never_invoke_when` to decide the plan — not a hardcoded `if tournament_day: run_recap()` script. This directly fixes the "insights between tournaments" mistake: the registry says insights run every day with evergreen content; the coordinator can no longer propose "insights leveraging recent tournament matches" on a non-tournament day.

---

### Fix 2: Brief Per Agent in Plan Output (context isolation → fixes Limitation #3)

V1 limitation: *"Right answers for wrong reasons — fragile when context shifts."*

V1 plan output: `{"agent": "recap", "reason": "matches happened"}`. The reasoning lives in the plan but is discarded before the agent runs. The subagent invocation page is explicit: *subagents do not inherit coordinator context — everything must be explicitly passed.*

V2 plan output adds a `brief` field that is passed directly into the subagent's prompt:

```python
{
  "plan": [
    {
      "agent": "recap",
      "reason": "QF results, two compelling matches",
      "brief": "Lead with Alcaraz — came back from a set down to beat Zverev in the QF. Secondary story: Draper emotional return, broke down in tears during R1 loss to Atmane. Both angles are in the ESPN data."
    },
    {
      "agent": "predictions",
      "reason": "SF matchups now confirmed",
      "brief": "SF: Sinner vs Alcaraz. Focus on their H2H (Alcaraz leads 7-4), surface (both strong on hard), and fatigue — Alcaraz played three sets today."
    }
  ]
}
```

The recap agent receives its brief and uses it to frame its output — it knows before it starts what the coordinator identified as the lead story. The coordinator's reasoning is preserved through execution, not discarded at the delegation step.

---

### Fix 3: Richer Context (fixes Limitation #1)

V1 limitation: *"Incomplete tournament calendar — only major tournaments. Right answers via wrong reasoning."*

Two additions to `gather_context()`:

**Full coverage policy in prompt.** Rather than only passing which tournaments are active, pass TennisMind's coverage policy explicitly: *"TennisMind covers Grand Slams, Masters 1000s, and select 500s. 250-level tournaments are tracked in the calendar but excluded from recap/predictions coverage."* The coordinator reasons correctly ("we don't cover this") not wrongly ("no tournament exists").

**ESPN live data over calendar inference.** Pull today's confirmed match count directly from ESPN at context-gather time — not from the Apify cache (which may be stale). Three-state logic retained: confirmed (count > 0), confirmed-none (rest day), UNCONFIRMED (API unavailable).

---

### Fix 4: Parallel Execution Map

The subagent invocation page notes that multiple tool calls in one coordinator response enable parallel subagent spawning. In TennisMind, not all agents depend on each other:

| Agent pair | Can run in parallel? | Reason |
|---|---|---|
| recap + news | No | News checks memory to avoid duplicating recap angles. Recap runs first. |
| recap + flash_alerts | Yes | Flash alerts fire on the result, recap is a longer synthesis. |
| predictions + insights | Yes | No dependency between them. |
| news + insights | Yes | Separate content types, separate sources. |

V2 delegate() groups independent agents and runs them concurrently via `ThreadPoolExecutor`:

```python
# Sequential: recap must complete before news (memory check)
run_agent("recap", brief=plan["recap"]["brief"])

# Parallel: predictions and insights are independent
with ThreadPoolExecutor() as ex:
    ex.submit(run_agent, "predictions", plan["predictions"]["brief"])
    ex.submit(run_agent, "insights",    plan["insights"]["brief"])
```

---

### Fix 5: Decomposition Enumeration Guard (narrow decomposition risk)

The narrow decomposition risk page states: *require the coordinator to enumerate all relevant domains before creating tasks.* V2 adds an explicit enumeration step to the coordinator prompt:

```
Step 1 — Enumerate: list every content type that today's events could support.
         Consider each agent in AGENT_REGISTRY against today's context.
Step 2 — Decide: for each, yes or no with one-line reasoning.
Step 3 — Plan: ordered list of yes items, each with a brief for the agent.
Step 4 — Skip list: what you're not doing and why.
```

The coordinator cannot skip directly to a plan. It must enumerate first. This prevents the failure mode where the orchestrator decides "recap" and stops — without ever asking whether predictions, flash alerts, or insights are also warranted.

---

### v1 → v2 Summary

| Gap | Root cause | v2 fix |
|---|---|---|
| Unaware of sub-agent rules | No formal agent descriptions | AGENT_REGISTRY with invoke_when/never_invoke_when |
| Coordinator reasoning discarded | No context passing to subagents | brief field passed into each agent's prompt |
| Incomplete calendar reasoning | Thin context, 250s absent | Coverage policy in prompt + live ESPN at context-gather |
| Narrow decomposition | Coordinator jumps to plan | Enumeration step forced before planning |
| Sequential execution of independent agents | V1 runs all agents in sequence | ThreadPoolExecutor for independent agent pairs |

---

## 11. Why It Was Shelved

For a single-person operation, the orchestrator's product value is low — the human can decide and run two commands faster than reading a generated plan. Its value is as a demonstrated *agent-orchestration pattern* (a portfolio/learning artifact), not as a daily tool. It is complete enough to demonstrate the pattern; further investment in making it a good daily editor would be polishing a lab feature rather than serving the product. Shelved in working state; the known limitations above are understood and documented rather than fixed.

---

## 12. Gap Closure — v2.1 (August 2026)

Following the Section 10 gap audit, all 5 identified gaps were implemented:

| Gap | Fix | Files changed |
|---|---|---|
| 1. Redundant Apify fetch | `run_generate_recap()` accepts `context_bundle`; fast-fails before Apify if orchestrator confirms no matches | generate_feed.py |
| 2. Context sharing between agents | `run_generate_recap()` returns card title; `delegate()` sets `gf._ACTIVE_RECAP_TITLE`; news agent injects recap context into research prompt | generate_feed.py, orchestrator.py |
| 3. Few-shot for agentic news | Two concrete examples added to `_AGENTIC_NEWS_SYSTEM`: thin→tool-call→card and memory-check→skip | generate_feed.py |
| 4. Programmatic quality guards | `_validate_card_structure()` runs before LLM critique: body word count 50–120, at least one number required | generate_feed.py |
| 5. Human handoff provenance | `_format_message()` in telegram_review.py shows `why` field and `critique_status`; both persisted in frontmatter via `_build_frontmatter()` | generate_feed.py, telegram_review.py |

**Implementation note for Gap 1**: The early-fail only triggers on `confirmed_no_matches`. If the orchestrator's ESPN fetch was inconclusive (`unconfirmed`), the recap proceeds — erring on the side of running rather than silently skipping.

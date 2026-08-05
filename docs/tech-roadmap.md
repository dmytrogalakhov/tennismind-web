# TennisMind — Tech Roadmap

**Purpose:** engineering and AI-capability roadmap. Distinct from the strategic roadmap (product/features) and growth strategy (audience). This document tracks the technical disciplines and agentic patterns that move TennisMind from a working prototype to a production-grade AI system — and that build interview-ready skills.

**Last updated:** June 2026

---

## Guiding principle

The impressive part is already built: six agents, a structured-data pipeline, the recap rebuild. The highest-value work now is not *more features* — it's the engineering disciplines that separate a prototype from a production system. Those disciplines are exactly what senior AI PM / engineering interviews probe.

---

## Tier 1 — Production disciplines (highest priority)

These are the operational maturity gaps that interviews always probe. Build these first.

### 1.1 Evaluations (eval harness)
**The gap:** no systematic way to measure if AI outputs are good. Quality is judged by eye, card by card.

**What to build:** an automated eval harness that scores outputs against defined criteria. For recaps: did it include the top story? Any fabricated players? Right length? Did it lead with the most newsworthy result? Run the harness whenever a prompt changes.

**Why it matters:** "How do you know your AI is working?" is the most-asked question in AI interviews. This converts "it felt better" into "eval score went from 70% to 88%."

**Status:** Not started — TOP PRIORITY

### 1.2 Prediction accuracy tracking
**The gap:** predictions are published but outcomes are never recorded. No measure of how good they are.

**What to build:** finish the `--result` command. Record actual outcomes against predictions, compute accuracy over time. Publish "TennisMind predicted X% of matches correctly" as both a content card and an internal metric.

**Why it matters:** a concrete measurement discipline and a closing-the-loop story. Doubles as publishable content.

**Status:** Not started (command was scaffolded, never finished)

### 1.3 Cost observability
**The gap:** no visibility into per-feature AI cost. Credits were burned debugging before anyone noticed.

**What to build:** log every Sonnet / Haiku / Apify / Tavily call with token count and estimated cost. Aggregate per feature. Produce a "burn by feature" view.

**Why it matters:** operational maturity. Enables "the recap costs €0.04/run, insights €0.02, here's my monthly burn" — exactly the cost-control answer senior roles want.

**Status:** Not started

---

## Tier 2 — Agentic patterns (medium priority)

Patterns not yet touched. Each teaches a foundational modern-agent technique.

### 2.1 Retrieval / memory system (RAG)
**The gap:** agents have no long-term tournament memory. Each recap re-discovers everything.

**What to build:** a vector store of everything that's happened in a tournament (results, storylines, player arcs). Agents query it: "has this player been mentioned before? what's their narrative so far?"

**Why it matters:** hands-on RAG — embeddings, vector search, retrieval. The one major modern pattern not yet built. Recap deduplication is a natural use case.

**Status:** Not started

### 2.2 Orchestrator / router agent
**The gap:** the human decides which agent runs each day. `orchestrator.py` follows a hardcoded calendar script — it checks day type, not events. It cannot reason: "big upset → generate a prediction for the next round." The hub-and-spoke topology is already there; what's missing is an LLM at the hub.

**What to build:** a top-level LLM coordinator that receives today's results and tournament context, then decides what to generate and in what order. Three behaviours the Python orchestrator cannot do:

1. **Dynamic routing by events** — not just "is there a match today?" but "what do today's results warrant?" Big upset → recap + prediction + flash alert. Rest day with rankings update → insights only. Final day → recap leads, news suppressed.
2. **Decomposition enumeration** — before creating tasks, the coordinator lists all candidate content types for the day, then decides which to run. Prevents narrow decomposition: subagents all succeed but output still has gaps because the coordinator never asked about whole categories.
3. **Lightweight post-agent check** — after each agent completes, coordinator evaluates: did it produce output? If news produced nothing, try an alternate candidate set. One re-delegation pass, not an infinite loop.

**Why it matters:** this is the coordinator-subagent pattern from the course — an LLM that reasons about task decomposition and routing, not a Python script that checks conditions. It's the capstone that unifies all six agents under one decision-making brain and closes the gap between "I built agents" and "I built a system that decides for itself what to do."

**Prerequisites:** evals (1.1) — the quality gate that tells the coordinator whether an agent's output is worth keeping before moving on.

**Status:** Not started — PRIORITY (third of the three committed builds)

### 2.3 Proper tool-use / function-calling
**The gap:** agents use search in a hardcoded, scripted sequence.

**What to build:** rebuild one agent using proper tool-calling — the LLM decides which tool to call (search, fetch results, look up a player) rather than the human scripting the order.

**Why it matters:** function-calling is foundational to modern agents. Teaches the pattern directly.

**Status:** ✅ Done 2026-08-05 — 5 tools (search_news, get_tournament_history, get_surface_form, get_h2h, check_memory), TennisAbstract scrapers, LangChain tool binding, agentic loop with up to 6 iterations. Commits 3d0e031, 9d62c93.

### 2.4 Agentic news research loop
**The gap:** the news agent processes articles in isolation — one article in, one scored candidate out. It evaluates what it finds but never asks what those findings suggest. It cannot follow a thread, connect two articles into a richer angle, or do the second and third search that turns a summary into a story. The current design produces competent wire copy. It cannot produce original angles.

**What to build:** replace the one-shot LLM evaluation step with an agentic research loop. After the deterministic gates (relevance, staleness, dedup, significance scoring — these stay as pipeline), the agent takes surviving candidates and decides: is this worth digging deeper? What context is missing? Are there related stories that together form a stronger angle? The agent searches, cross-references, and synthesises until it has enough to write — or decides the story isn't there and drops it. The rest of the pipeline (generation, Telegram queue, human review) is unchanged.

**Why it matters:** this is the difference between news processing and news journalism. A pipeline handles what exists. An agent follows what the evidence suggests. The architecture question is not pipeline vs agent — it is where in the pipeline to introduce agentic behaviour. The deterministic gates protect the agent from noise; the agent does the journalism the pipeline cannot.

**Example of the gap:** the Tommy Paul marriage story scored 0 and was dropped. An agentic loop might have noticed he is seeded at Cincinnati the following week, searched for his recent form, found a 6-match win streak, and surfaced the angle: "Paul enters Cincinnati on the best run of his career — and just got married." That angle requires a second and third search. The current design never makes them.

**Prerequisites:** 2.3 (proper tool-use) — the agentic loop is built on function-calling.

**Status:** ✅ Done 2026-08-05 — `_agentic_research()` loop replaces one-shot generation for news candidates. Deterministic gates unchanged. Each surviving candidate goes through up to 6 tool-call iterations before writing the card. Body length fix applied (3-4 sentences). Commit 1963612.

### 2.5 MCP tool server — shared tool catalog across agents

**The gap:** the 6 agentic research tools (`fetch_url`, `search_news`, `get_h2h`, `get_surface_form`, `get_tournament_history`, `check_memory`) are hardcoded in `generate_feed.py`. Adding a tool means editing the pipeline file. Multiple agents that could benefit from the same tools (news, insights, recap) each need their own copy. Tools are inaccessible outside the pipeline.

**What to build:** extract the tool implementations into a standalone MCP server process. Agents connect at runtime, ask what tools are available, and receive schemas dynamically. The pipeline no longer owns the tool catalog — it consumes it.

```
tennismind-tools-server/    ← new: separate process, JSON-RPC
  └── fetch_url
  └── search_news
  └── get_h2h
  └── get_surface_form
  └── get_tournament_history
  └── check_memory

generate_feed.py            ← connects to server, discovers tools at runtime
orchestrator.py             ← same connection, same tools
claude code session         ← same server usable from CLI directly
```

**Why it matters:** MCP is Anthropic's standard protocol for tool servers. It's how production agentic systems share capabilities across agents and surfaces. Building it teaches: JSON-RPC server design, tool discovery at runtime, subprocess lifecycle, and the separation between "what tools exist" and "which agent uses them."

**The concrete payoff:** adding a new tool (e.g. `get_player_ranking`, `get_draw_position`) becomes a single server-side change, instantly available to all agents. And the same tools work from a Claude Code session directly — no pipeline run needed to ask "what's Draper's H2H against Atmane?"

**Prerequisites:** 2.3 and 2.4 — MCP earns its cost when multiple agents share tools. Worth building once the tool catalog has proven its value over several weeks of news generation.

**Status:** Not started — Phase 3 item. Build after the tool catalog stabilises.

---

## Tier 3 — Product/quality improvements with learning value

### 3.1 A/B testing prompts
**What to build:** generate two versions of a card with two different prompts, compare. Combined with evals, teaches experimentation discipline.

**Status:** Not started (depends on 1.1 evals)

### 3.2 Structured player/tournament database
**The gap:** agents repeatedly lack context about players (ranking, age, retirement status, style).

**What to build:** a small structured database of players that agents query. Solves the recurring "agent doesn't know X" problem and deepens the "LLM for reasoning, database for facts" pattern.

**Status:** Not started

---

## Committed build order

The three builds chosen to do now, in sequence:

1. **Evals (1.1)** — biggest skill gap, most-asked interview topic, makes every future change measurable
2. **Prediction accuracy tracking (1.2)** — small, finishable, concrete metric + publishable story
3. **Orchestrator agent (2.2)** — capstone that unifies the six agents under one decision-making brain

Outcome after these three: from "I built a multi-agent system" to "I built a multi-agent system, I can measure its quality, I track its accuracy, and it self-orchestrates."

---

## The interview gaps these close

| Interview question | Closed by |
|---|---|
| "How do you measure AI quality?" | Evals (1.1) |
| "How do you know your predictions are any good?" | Accuracy tracking (1.2) |
| "How do you control AI cost?" | Cost observability (1.3) |
| "How do you design complex agent systems?" | Orchestrator (2.2) |
| "Have you worked with RAG / retrieval?" | Memory system (2.1) |
| "How do you handle tool use / function calling?" | Tool-use rebuild (2.3) |
| "Have you worked with MCP / tool servers?" | MCP tool server (2.5) |
| "How do you run experiments on AI?" | A/B testing (3.1) |

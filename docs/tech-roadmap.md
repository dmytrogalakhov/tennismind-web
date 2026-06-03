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
**The gap:** the human decides which agent runs each day.

**What to build:** a top-level agent that reads the day's context and decides what to generate. "Rest day, no matches → skip recap, generate two insights." "Huge upset → generate a prediction for the next round." An agent that delegates to other agents.

**Why it matters:** agentic orchestration — the layered-architecture pattern. Ties the six agents together under one brain. Satisfying capstone.

**Status:** Not started — PRIORITY (third of the three committed builds)

### 2.3 Proper tool-use / function-calling
**The gap:** agents use search in a hardcoded, scripted sequence.

**What to build:** rebuild one agent using proper tool-calling — the LLM decides which tool to call (search, fetch results, look up a player) rather than the human scripting the order.

**Why it matters:** function-calling is foundational to modern agents. Teaches the pattern directly.

**Status:** Not started

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
| "How do you run experiments on AI?" | A/B testing (3.1) |

# PRD: Content Memory System (RAG) for TennisMind

**Status:** Draft — design phase
**Author:** Dmytro Galakhov
**Date:** June 2026
**Related:** Issue #009 (recap hallucination), Issue #011 (news dedup), PDL-010 (structured-data rebuild), Tech Roadmap Tier 2.1

---

## 1. Problem Statement

TennisMind runs six content agents that generate cards daily. Each agent generates in isolation, with no durable memory of what the system has already produced or what has already happened in a tournament. This causes three recurring, documented failures:

1. **Regeneration of already-covered or deleted content** (Issue #011): the news agent reproduced a Zverev card the user had manually deleted, because it had no memory of its own output.
2. **Loss of tournament narrative continuity**: across Roland Garros, agents repeatedly lacked context about ongoing storylines (a player's run, a lucky-loser arc, a farewell campaign), patched with brittle hardcoded lists and one-off queries.
3. **Risk of insight repetition over time**: evergreen insights could repeat across weeks/months with no check against what was already published.

The current mitigations are hand-rolled: exact-string scans of the content folder, hardcoded player lists, and dedicated per-entity queries. These are brittle (they catch only exact matches, not semantically equivalent ones) and do not scale across a growing content archive.

**This feature introduces a retrieval-augmented memory layer** so agents can ask, before generating: *"Have we covered this already? What's the relevant history?"* — and receive semantically relevant answers, not just exact-string matches.

---

## 2. Scope: What RAG Solves Here — and What It Does Not

A deliberate scoping decision, because misapplying RAG would repeat a mistake the project already learned to avoid.

### In scope (genuine retrieval problems)

| Use case | Documented origin | Why RAG fits |
|---|---|---|
| Content de-duplication (semantic) | Issue #011 — regenerated deleted Zverev card | Catches "Zverev wins first Slam" ≈ "Zverev breaks through in Paris" — semantic matches exact-string scanning misses |
| Tournament narrative continuity | RG: Cirstea farewell, De Jong lucky-loser arcs patched by hardcoded lists | A queryable store of tournament events replaces hardcoded lists; agents retrieve a player's arc on demand |
| Insight repetition prevention | Risk in evergreen insights over months | Semantic search over published insights before generating |

### Explicitly OUT of scope (NOT retrieval problems)

| Problem | Why RAG is the WRONG tool | What actually solved it |
|---|---|---|
| Recap hallucinating eliminated/withdrawn players (Issue #009) | RAG retrieves relevant *text*; it cannot manufacture *structured, date-bounded facts*. Retrieving the same messy articles more efficiently would still hallucinate. | Structured data source (Apify) — PDL-010, already shipped |
| Wrong seed numbers / invented rounds | A model inventing a fact is a constraint problem, not a retrieval problem | Verified-facts-only prompt rule — already shipped |

**Design principle (carried from PDL-010):** match the tool to the problem. RAG is for "what do we already know / have we said this," not for "what are the authoritative facts of yesterday's matches." Those facts come from structured data. This boundary is the core scoping decision of this PRD.

---

## 3. Key Actors

| Actor | Goal | Current frustration | Design implication |
|---|---|---|---|
| Content agents (recap, news, insights, predictions) | Generate fresh, non-duplicative, context-aware content | No memory; regenerate covered stories; lack narrative context | Provide a `check_memory()` retrieval call agents invoke before generating |
| Orchestrator agent | Decide what to generate, avoid commissioning duplicate work | Sees candidate backlog but can't semantically assess "already covered" | Orchestrator queries memory to inform the plan |
| Human editor (Dmytro) | Stop re-reviewing/deleting repeat content; trust continuity | Manually deletes duplicates; hardcodes context lists | Fewer duplicates surface in review; hardcoded lists retired |

---

## 4. Core Lifecycle (Happy Path)

```
Agent is asked to generate content
   → embed the candidate topic / context
   → retrieve top-K semantically similar items from the memory store
   → pass retrieved items to the generation prompt as
        (a) "already covered — do not duplicate" list
        (b) "relevant history — use for continuity" context
   → agent generates, grounded and de-duplicated
   → on publish, the new card is embedded and written back to the store
   → on user deletion, the rejected item is embedded and flagged "rejected"
```

The store grows with every published card and every rejection, so memory compounds over time.

---

## 5. Data Model

### Entity: MemoryItem

**Identity:** an immutable record of a single piece of content the system has produced or rejected, stored with its vector embedding for semantic retrieval. Design pattern: immutable event log + vector index.

**Attribute breakdown:**

| Field | Stores | Why needed | Example | Constraints |
|---|---|---|---|---|
| id | unique identifier | retrieval, dedup | `mem_2026_06_07_zverev` | PK, unique |
| content_type | recap / news / insight / prediction / event | filter retrieval by type | `news` | not null |
| subject | core subject (players + event) | human-readable match key | `Zverev wins Roland Garros` | not null |
| text | the content used for embedding | the semantic payload | card body or event summary | not null |
| embedding | vector representation of `text` | semantic search | `[0.013, -0.224, ...]` | not null, dim = model-specific |
| status | published / rejected | dedup + respect user deletions | `rejected` | not null |
| tournament | associated tournament, if any | scope retrieval to current event | `Roland Garros 2026` | nullable |
| created_at | timestamp | recency weighting, audit | `2026-06-07T20:30:00` | not null |

**The pattern:** first three = identity; `text` + `embedding` = the retrieval payload; `status` + `tournament` + `created_at` = retrieval filters.

### Alternative considered: store only exact subject strings (no embeddings)

This is the *current* approach — string-match the content folder.

- **Problem 1 — misses paraphrases.** "Zverev wins his first Slam" and "Zverev breaks through in Paris" are the same story; exact matching treats them as different and regenerates the duplicate. This is precisely the Issue #011 failure.
- **Problem 2 — no continuity retrieval.** Exact strings can answer "did we publish this exact card," but cannot answer "what's the narrative around this player," which needs semantic similarity across many items.
- **Problem 3 — doesn't scale.** As the archive grows to hundreds of cards, scanning and string-matching all of them per generation becomes slow and ever more brittle.

**The rule:** when "have we said something *like* this" matters (not just "exactly this"), you need semantic representation, not string equality.

### Alternative considered: a hosted vector database (Pinecone/Weaviate)

- **Problem 1 — cost and ops overhead** for a one-person project with a few hundred items. A managed vector DB is built for millions of vectors.
- **Problem 2 — another external dependency** to maintain, authenticate, and pay for — against the project's demonstrated preference (PDL-010) for removing complexity.
- **Problem 3 — overkill at this scale.** A local store (e.g., Chroma, or pgvector if a Postgres already exists, or even a flat file of embeddings with in-memory cosine similarity) handles hundreds-to-thousands of items trivially.

**The rule:** size the infrastructure to the data. Hundreds of vectors do not justify a distributed vector database. Start local; migrate only if volume demands it.

---

## 6. Technical Walkthrough

### Write path (on publish)
1. Card approved and published to `content/feed/`.
2. Compute embedding of the card's `subject + text`.
3. INSERT MemoryItem (status = published).

### Write path (on rejection)
1. User deletes a candidate during review.
2. Compute embedding; INSERT MemoryItem (status = rejected).
3. Rejected items are retrieved in dedup checks so the agent does not regenerate something the user explicitly removed (the Issue #011 fix, generalized).

### Read path (before generation — the core RAG step)
1. Agent forms the candidate topic/context.
2. Embed the topic.
3. Retrieve top-K most similar MemoryItems (optionally filtered by content_type and current tournament).
4. Split results into:
   - **published/rejected matches above a similarity threshold** → "already covered or rejected — do NOT duplicate"
   - **related-but-distinct items** → "relevant history — use for continuity"
5. Inject both into the generation prompt.
6. Generate.

### Concurrency
Single-user, sequential generation — no real contention. Last-write-wins is acceptable. (Noted explicitly so the absence of locking is a decision, not an oversight.)

---

## 7. Success Criteria

**Product KPIs**
- Duplicate/near-duplicate cards surfaced in review drops to near zero (baseline: the Issue #011 regeneration).
- Hardcoded context lists (e.g., retiring-players) retired in favour of retrieved continuity.
- Recaps/news reference ongoing storylines without manual query engineering.

**Technical KPIs**
- `check_memory()` retrieval returns in well under a second at expected archive size.
- Embedding + write-back adds negligible latency to publish.
- Cost per generation increase is marginal (one embedding call per generation + per publish).

---

## 8. Phased Delivery

**v1 (MVP — De-duplication):**
- MemoryItem store (local), embedding on publish and rejection, `check_memory()` retrieval, wired into the **news agent** first (highest-pain, per Issue #011).
- Goal: stop regenerating covered/deleted news. Proves the retrieval loop end-to-end on the worst offender.
- Deferred: continuity, other agents — because dedup alone validates the core mechanism cheaply.

**v1.5 (Continuity):**
- Add tournament-event ingestion (results, storylines) to the store. Recap and insights agents query for narrative continuity. Retire the hardcoded retiring-players list.
- Goal: agents retrieve player arcs and storylines on demand.

**v2 (System-wide):**
- All generative agents call `check_memory()`. Orchestrator queries memory to inform its daily plan (avoid commissioning duplicate work).
- Goal: memory is a shared service across the platform.

**v3 (Refinement):**
- Recency weighting, similarity-threshold tuning, optional migration to pgvector/Chroma if volume grows. Evaluate retrieval quality with the existing eval harness.

---

## 9. Open Questions & Assumptions

- **Embedding model choice:** which embedding model (OpenAI text-embedding-3-small vs. a local model)? Trade-off: cost/quality vs. no-external-dependency. To decide in design.
- **Similarity threshold:** what cosine score counts as "already covered"? Needs empirical tuning against real cards — a natural use of the eval harness.
- **Store technology:** flat-file + in-memory cosine (simplest) vs. Chroma vs. pgvector. Default to simplest that meets v1; revisit at v3.
- **Retention:** does memory ever expire? Assumption: published content is permanent memory; rejected items persist at least for the duration of the relevant tournament.
- **Cross-tournament continuity:** should narrative memory span tournaments (a player's season arc) or reset each event? Assume tournament-scoped for v1.5, season-scoped as a v3 consideration.

Open questions are intentional — they mark what to resolve in design and what to escalate, not gaps in thinking.

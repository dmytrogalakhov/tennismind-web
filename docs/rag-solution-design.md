# Solution Design: News Generation with Semantic Memory (RAG)

**Companion to:** rag-memory-prd.md
**Status:** v1 implemented (news-agent de-duplication)
**Date:** June 2026

This document traces the end-to-end flow — business and technical — from the moment `--generate-news` is invoked to the moment a card is published. It names every system, the data sent to and retrieved from each, and the decision points.

---

## 1. Systems Involved

| System | Role | Location |
|---|---|---|
| Orchestrator / CLI | Entry point; triggers the news flow | local (generate_feed.py / orchestrator.py) |
| Tavily | Web search — retrieves candidate news from the internet | external API |
| OpenAI (embeddings) | Converts text to embedding vectors | external API (text-embedding-3-small) |
| Anthropic (Sonnet) | Writes the news card from search results | external API |
| Memory store | Holds embeddings of published/rejected cards; enables dedup | local flat file (data/memory.json) |
| Content store | Holds published cards the website reads | local (content/feed/) + candidates (content/feed-candidates/news/) |
| Telegram | Publishes the approved card to the channel | external API |
| Website (Vercel) | Renders published cards | external (reads content/feed/) |

---

## 2. End-to-End Flow (Happy Path)

```
┌──────────────┐
│ --generate-  │  1. User (or cron) triggers news generation
│   news       │
└──────┬───────┘
       │
       ▼
┌──────────────┐  2. RETRIEVE candidates from the web
│   TAVILY     │  ── sent: search queries (grass-season, rankings, injuries…)
│  (web search)│  ── returned: article snippets + URLs
└──────┬───────┘
       │
       ▼
┌──────────────┐  3. WRITE a candidate card
│  ANTHROPIC   │  ── sent: Tavily results + curation prompt + "already covered" list*
│  (Sonnet)    │  ── returned: a news card (title, body, tags) as JSON
└──────┬───────┘
       │
       ▼
┌──────────────┐  4. CHECK for semantic duplication  ◄── the RAG step
│   MEMORY     │     a. embed the candidate (title+body) via OpenAI
│   (dedup)    │        ── sent to OpenAI: candidate text
│              │        ── returned: 1536-dim embedding vector
│              │     b. cosine-similarity vs every stored embedding (local NumPy)
│              │     c. closest match ≥ 0.82?  → DUPLICATE → drop, log 🧠
│              │                         < 0.82?  → NEW → keep
└──────┬───────┘
       │ (kept)
       ▼
┌──────────────┐  5. SAVE as pending candidate
│ feed-        │  ── written: card .md with status "pending"
│ candidates/  │
└──────┬───────┘
       │
       ▼
┌──────────────┐  6. HUMAN REVIEW (--review-news)
│   Editor     │     y → approve   n → reject   t → save for later
│   (you)      │
└──────┬───────┘
       │
   ┌───┴────────────────────────┐
   ▼ (approve y)                ▼ (reject n)
┌──────────────┐         ┌──────────────┐
│ ADD to       │         │ ADD to       │  7b. embed + store as "rejected"
│ MEMORY as    │         │ MEMORY as    │      so it's never regenerated
│ "published"  │         │ "rejected"   │
└──────┬───────┘         └──────────────┘
       │
       ▼
┌──────────────┐  8. PUBLISH
│ content/feed/│  ── card .md moved here (website reads it)
│ + TELEGRAM   │  ── posted to Telegram channel (parse_mode=HTML)
│ + VERCEL     │  ── live on website after deploy
└──────────────┘
```

\* The "already covered" list (step 3) is an optional enhancement: memory can also be queried *before* writing, to tell Sonnet what not to write about. v1 enforces dedup *after* writing (step 4); feeding the list pre-write is a v1.5 refinement.

---

## 3. Data Detail Per Step

**Step 2 — Tavily (web search)**
- Sent: a set of news queries (e.g. `"tennis ranking movement rising players 2026"`).
- Returned: for each result, a snippet of article text + source URL.
- Purpose: bring current external material the model can write from. (Facts come from here; the model should not invent.)

**Step 3 — Sonnet (writing)**
- Sent: the Tavily snippets + the news curation prompt (quality rules, "answer why this matters today", avoid stale recaps).
- Returned: one candidate card — `{title, body, tags}` — as JSON.
- Purpose: turn raw search material into a written, on-voice card.

**Step 4 — Memory / OpenAI embeddings (the RAG dedup step)**
- Sent to OpenAI: the candidate's `title + body` text.
- Returned from OpenAI: a 1536-dimension embedding vector (the candidate's "meaning coordinates").
- Done locally (no API): cosine similarity between the candidate vector and every stored vector in data/memory.json. The highest score is the closest existing item.
- Decision: score ≥ 0.82 → semantic duplicate → drop the candidate, log to memory-dedup.log. Score < 0.82 → genuinely new → proceed.
- Why local: comparing a few hundred vectors is instant in NumPy; no vector DB needed.

**Step 5 — Save candidate**
- Written: a markdown file in content/feed-candidates/news/ with status "pending". Not yet visible on the website.

**Step 6 — Human review**
- You see the card and choose: approve / reject / save-for-later.

**Step 7 — Memory write-back (the loop that makes it learn)**
- On approve: embed the card, append to memory.json with status "published". → never regenerated.
- On reject: embed the card, append with status "rejected". → never regenerated (the Issue #011 fix).
- This write-back is what gives the system durable memory: every decision teaches it.

**Step 8 — Publish**
- The card .md moves to content/feed/ (website source of truth).
- Posted to Telegram (HTML formatting).
- Live on the website after the next Vercel deploy.

---

## 4. Where Each Concern Lives (separation of responsibilities)

| Concern | Owned by | Not owned by |
|---|---|---|
| What's currently happening (facts) | Tavily (search) | the LLM (must not invent) |
| Turning facts into prose | Sonnet | — |
| "Have we said this before?" | Memory (embeddings + cosine) | string matching (replaced) |
| "Is this worth publishing?" | Human review | the agent |
| Durable record of decisions | Memory write-back | — |

The key design line: **facts come from search, meaning-comparison comes from embeddings, judgment comes from the human.** Each concern has exactly one owner.

---

## 5. Failure / Edge Cases

- **Embedding API fails:** dedup can't run. Fallback: proceed without dedup (fail open) but log a warning — better to risk a duplicate than block all generation. (To confirm in implementation.)
- **Empty memory store:** first run, nothing to compare against — everything passes as "new". Expected; the store fills as content publishes.
- **Threshold too aggressive:** a genuinely new story scoring just over 0.82 gets wrongly blocked. Mitigation: log every block with its score so false positives are visible and the threshold can be tuned.
- **Same story, legitimately updated:** e.g. an injury that develops. Currently treated as a duplicate. v1 limitation; a "this is an update, not a duplicate" override is a future consideration.

---

## 6. v1 Boundary (what this design does and does not cover)

**Covers (v1):** news-agent de-duplication — block regeneration of published/rejected stories by meaning.

**Does not cover yet:**
- Continuity retrieval (using memory to inform narrative, e.g. player arcs) — v1.5
- Other agents (insights, recaps) calling memory — v2
- Orchestrator querying memory to plan — v2
- Pre-write "don't write about these" injection to Sonnet — v1.5 refinement

These are deferred deliberately; v1 proves the retrieval loop end-to-end on the highest-pain case before expanding.

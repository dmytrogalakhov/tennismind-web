# News Agent Rebuild: Date-Aware Discovery + Deterministic Significance

**Status:** Design — implementation staged for pre-Wimbledon window (June 2026)
**Replaces:** five prior prompt-level patches (freshness rules, query pivots, significance filter, multi-candidate, dedup wiring)
**Related:** Issue #014, PDL-016

---

## Why the patches failed (the pattern)

Each previous fix addressed a visible symptom at the prompt layer. The structural cause — dateless discovery, no verification clock, vibes-based significance — remained intact. A correct diagnosis asks not "what did the output do wrong?" but "what was missing from the inputs that made a wrong output likely?" The issue tree below answers that question.

---

## The issue tree with plain-English translation

### Root question: why does the news agent produce stale, insignificant, or wrong cards?

---

**Branch 1 — Discovery: the agent finds the wrong raw material**

*Technical:* TavilySearchResults (deprecated wrapper) called without topic, days, time_range, or include_domains. Tavily's news-mode returns results by recency with published_date; general-mode returns by relevance/link-density. Older articles outrank fresher ones by mid-tournament. No domain steering; no round-aware query construction.

*Plain English:* We asked for "tennis articles" instead of "today's tennis articles from trusted sources." A first-round recap published 4 days ago has more links than today's quarterfinal story, so it comes back first. The search tool could have filtered by date the whole time — we just never turned that parameter on.

Sub-branch 1.1: No time axis on the search call.
Sub-branch 1.2: Queries don't know what round it is — "Queen's Club results" returns the full tournament's history, not today's.
Sub-branch 1.3: No trusted-domain list — official ATP/WTA sites and major sports outlets are mixed with SEO-farm content.

---

**Branch 2 — Verification: the agent can't confirm what it finds is still true**

*Technical:* No published_date extraction or hard code gate. No tournament-round computation from the calendar. Single-source claims, never cross-checked.

*Plain English:* We were reading newspaper clippings with the dates cut off, then asking the model to guess which ones were from today. Even if an article seems fresh, the model can't know that three more rounds have happened since it was written without being told what round it is now. And if one source says "Serena is playing doubles," nothing checks whether she's still in the draw.

Sub-branch 2.1: No published_date hard filter — stale articles pass through.
Sub-branch 2.2: No event-date grounding — the system doesn't know what day/round of the tournament it is.
Sub-branch 2.3: Single-source, never re-verified — a story that was once true can become false without the system noticing.

---

**Branch 3 — Judgment: the agent picks the wrong stories even from decent inputs**

*Technical:* Significance is evaluated by the LLM from prompt instructions without structured data. No ranking lookup; no fame model; "upset" pattern-matched from article phrasing rather than computed from ranking delta.

*Plain English:* The system is guessing what tennis fans care about without knowing who the fans' favourite players are or what the rankings say. It sees the word "upset" and assumes headline. A better system would score each story mathematically: how big is the ranking gap? Is this player famous? What round is it? Then only write cards for stories that score above a threshold — the same way a real editor has an implicit rulebook.

Sub-branch 3.1: Significance is vibes — prompt-instructed LLM judgment without data.
Sub-branch 3.2: No marquee model — the system doesn't know who the audience cares about most.

---

**The one-sentence diagnosis:**
The system is treating sports news like generic web content, when it should be treating it like a time-sensitive, stateful editorial workflow.

---

## The target architecture

The pipeline has three stages, each with a distinct owner:

**Stage 1 — Discovery (fully agentic):**
Tavily in news-mode (topic="news", days=2, trusted domains) + RSS feeds from ATP/WTA/BBC/ESPN, last 48h only. Output: a pool of dated, sourced candidate stories.

**Stage 2 — Deterministic gates (code, no LLM):**
Three hard filters run in sequence before Sonnet sees anything:
- published_date gate: drop anything older than 48h
- Round-aware staleness: drop anything about a round earlier than current − 1
- Significance score ≥ 5: drop anything that doesn't involve a ranked/marquee player in a meaningful context

Everything that fails a gate is logged with its reason. Nothing is silently dropped.

**Stage 3 — Generation (LLM writes, human approves):**
Only stories that cleared all three gates reach Sonnet. It writes the card in the TennisMind voice. The card then passes through the existing RAG dedup check before going to the founder's phone for approval.

**The division of labor in one line:**
Discovery is agentic. Freshness and significance are code. The LLM writes. The human keeps taste.

---

## Staged build plan

### Stage 1 — Date-aware search (highest impact, do first)
- Upgrade: `pip install -U langchain-tavily`; replace TavilySearchResults with TavilySearch (also clears the long-standing deprecation warning)
- Parameters: `topic="news"`, `days=2`, `include_domains=[atptour.com, wtatennis.com, espn.com, bbc.com, tennis.com, tennis365.com]`, `max_results=8`
- Hard gate in code: drop any result with published_date older than 48h (or missing) before Sonnet sees it. Log every drop with its date.
- Round-aware queries: compute current round from tournament calendar; inject into queries ("Queen's Club R16")
- Test: run raw discovery for today, show surviving results with published_dates

### Stage 2 — RSS channel
- `pip install feedparser`
- Feeds: ATP official, WTA official, BBC Sport Tennis, ESPN Tennis
- Take items from last 48h only (pubDate filter)
- Merge with Tavily results, dedup by URL/title
- Test: show merged, dated candidate pool

### Stage 3 — Deterministic significance scoring
- Weekly-cached `data/rankings.json` (ATP + WTA top-100)
- `data/marquee-players.json` (founder-maintained, start with: Kyrgios, Serena Williams, Osaka, Raducanu, Nadal, Djokovic, Murray, Alcaraz, Zverev, Sinner, Sabalenka, Swiatek)
- Scoring in code:
  - Top-10 player involved: +5
  - Top-20 player involved: +3
  - Marquee player involved: +4
  - Upset with ranking gap >50: +2
  - GS/1000 context: +2
  - Injury/comeback/retirement of ranked player: +3
  - Threshold to pass: ≥5
- Every candidate logged with its score and pass/drop decision
- Test: show today's scored list with pass/drop

### Stage 4 — Event-date grounding
- event_date frontmatter on every card (computed from source published_date)
- Computed staleness check against current tournament round
- Blocks cards about events older than (current round − 1)
- Applies to insights too (same class of problem)

---

## What this does not change
- The LLM's writing role (unchanged)
- The RAG dedup layer (existing, already works)
- The approval flow (cards still go to phone)
- The recap pipeline (separate, already solid)
- The eval harness (still gates autonomy promotion)

---

## Open questions
- If Stage 1 Tavily-news doesn't resolve discovery (results still stale), evaluate: NewsAPI.org, GNews, or Exa as alternatives
- Rankings fetch: ATP/WTA publish rankings data on their sites; confirm the fetch is automatable or find a reliable API (Tennis Abstract, RapidAPI tennis endpoints)
- Significance threshold (5) is a starting estimate; calibrate against two weeks of scored-but-not-filtered results before enforcing the gate

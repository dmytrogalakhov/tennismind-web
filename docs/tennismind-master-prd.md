# TennisMind — Master Product & Solution Design Document

**Version:** 1.0 | **Date:** June 2026 | **Owner:** Dmytro Galakhov
**Purpose:** the single holistic description of TennisMind — what it is as a business, how it works as a product, how it operates as a process, and how it is built as a system. Structured in descending layers (inspired by the 4+1 view model): each section goes one level deeper than the last. Read top-to-bottom for the full picture, or jump to the layer you need.

---

# LAYER 0 — Executive Summary

TennisMind is an **AI-powered tennis publication run by one person.** It produces daily tennis content (insights, news, recaps, predictions) through a system of six specialized AI agents coordinated by an orchestrator agent, with the human founder approving content from a phone and writing the long-form articles that are the product's actual differentiator.

It is simultaneously two things, deliberately:

1. **A publication** — articles in a distinctive editorial voice are the product with real market signal; the daily AI-generated feed is top-of-funnel.
2. **An AI laboratory** — the agent system is the founder's hands-on AI product-management learning vehicle and portfolio (evals, RAG, orchestration, human-in-the-loop design).

These two identities share one codebase but have different success metrics: the publication is measured by audience and writing quality; the lab is measured by the AI competencies it demonstrably builds.

**Live surfaces:** website (tennis-mind-six.vercel.app) · Telegram channel (@tennismind) · Substack (tmtennismind.substack.com)

---

# LAYER 1 — Business View

## 1.1 Mission

> **Help tennis fans understand more about the sport they love — in the time they actually have.**

The editorial test applied to every piece of content: does it explain **WHY**, not just WHAT? A score is a commodity; the reason behind the score is the product.

## 1.2 Target audience

The "tennis-as-golf" reader: mature, engaged, time-poor fans who love the sport, can't follow everything, and want depth over noise. People who read The Athletic, subscribe to newsletters, and would pay for a voice they trust. **Not** the X hot-take crowd. This audience definition drove the 2026 rebrand (see 1.5).

## 1.3 Competitive positioning

| Competitor | What they own | TennisMind's answer |
|---|---|---|
| X / Reddit | speed, volume, breaking results | curation — the few things worth knowing, with context |
| ATP/WTA sites | official data, schedules | the WHY layer on top of the WHAT |
| The Athletic / tennis media | professional journalism at scale | a singular voice + solo-economics (near-zero cost base) |
| ChatGPT / general AI | answers on demand | editorial judgment, taste, and a publication you don't have to prompt |

The moat is **not** the AI system (replicable) — it is the **editorial voice and judgment** encoded in the articles and in the curation policy the agents execute.

## 1.4 Business model (sequenced, audience-first)

1. **Now:** grow audience; everything free. Bottleneck is audience, not features or monetization.
2. **Next:** affiliate links on gear tools (passive, no paywall).
3. **Later (audience-justified):** paid subscription on Substack — free tier (feed, some articles) → paid tier (all articles, archive). Proven model (solo sports Substacks, The Athletic).
4. **Cost base:** ~$0.10–0.30/day in API costs, free-tier hosting. Near-zero marginal cost — what makes a solo publication viable.

## 1.5 Strategic decisions in force (from the Product Decision Log)

- **Articles are the product; the feed is the funnel; the agents are the leverage** (the "two TennisMinds" reframe).
- **Tools paused** (Racket Finder, String Finder, Customization Wizard, stringing marketplace): left working, no further investment. They compete with free general AI and the marketplace has disintermediation risk.
- **Feed features held to a "lab" quality bar:** good enough to demonstrate the AI technique and serve the funnel, not polished as standalone products.
- **News repositioned** as the player-narrative channel (injuries, rankings, coach changes, off-court) during tournaments — recaps own results — and the main feed between tournaments (resolves the news/recap overlap, PDL-011).
- **Rebrand (June 2026):** synthwave → Roland Garros editorial (warm sand/ink base, clay + deep green accents, Newsreader serif + Inter). Design treated as a filter that tells the target reader "this is for you" before they read a word. Implemented as a token-based design system (docs/design-system.md).

---

# LAYER 2 — Product View (what exists, for whom, when)

## 2.1 The content products

| Product | What it is | Cadence | Why a reader cares |
|---|---|---|---|
| **Articles** (the core) | Long-form match essays in the TennisMind voice — one moment, one thesis | ~weekly, human-written | the differentiated "understand the sport" experience |
| **Insights** | One surprising fact (history, stats, gear) with context | daily, evening | a 30-second "huh, I didn't know that" |
| **Recaps** | What happened yesterday at covered tournaments + why it matters (draw implications, milestones) | daily during covered events, morning | catch up over coffee without scrolling X |
| **News** | Player-narrative stories: injuries, rankings, comebacks, coach splits | as warranted, midday | the few off-court stories worth knowing |
| **Predictions** | Pre-match editorial preview of marquee matches | big matches only | anticipation with a point of view |
| **Match Analysis** (origin feature) | On-demand tactical breakdown of any match | user-triggered | the original "explain WHY" experience |

## 2.2 The editorial policy matrix (the founder's judgment, encoded)

What gets covered is a **policy**, not a per-day decision. Tier is the default key; **field strength overrides tier** (the grass-season correction: 250s drawing top-20 players are recap-worthy — compressed surface windows break the tier proxy).

| Context | Insights | Recaps | News | Predictions |
|---|---|---|---|---|
| Grand Slam / 1000 | daily, tournament-flavored | daily, full | off-court only | QF onward |
| 500 | tournament-flavored, evergreen fallback | daily, short | off-court only | final only |
| 250, strong field (e.g. grass swing) | tournament angle | daily, short | significance-filtered | marquee matchups only |
| 250, ordinary field | evergreen fallback | none — transcendent stories route to news | significance-filtered | none |
| No tournament | evergreen | none | the main feed | none |

**The content clock** (reader's day): recap 08:30 · news 12:30 · insight 20:30.

## 2.3 Channels

- **Website** — the branded archive (static Next.js on Vercel; updates on deploy).
- **Telegram channel** — the daily push surface; every published card posts here.
- **Substack** — long-form home and future payment rail; articles cross-posted.
- **LinkedIn** — build-in-public channel (serves the founder's AI-PM positioning).

---

# LAYER 3 — Process View (how it operates day to day)

## 3.1 The operating principle

> **Judgment is encoded once as policy; execution is delegated to agents; the human approves by exception, from a phone.** Founder hours go to articles — the work only a human can do.

## 3.2 The daily workflow (current live state)

```
[Mac wakes / lid opens — listener resumes]

07:00  ORCHESTRATOR (cron): gathers context → reasons → applies guardrails
       → plan arrives on founder's PRIVATE Telegram with buttons:
         "Today: insights (grass angle) + news. Skipping recap (no Apify),
          prediction (no marquee match)."        [✅ Run Plan] [❌ Skip]

       Founder taps ✅
       → listener triggers generation in background (non-blocking)
       → progress messages: "⚙️ Generating insights…" → "✅ Done — 5 cards sent"

       CARDS arrive on private Telegram, each with image + full text:
                                    [✅ Publish] [📅 Later] [🗑 Reject]

       ✅ → publish_card(): file → content/feed/, post → public channel,
            written to RAG memory as "published"
       📅 → stays pending; resurfaced on demand (--send-pending --include-saved)
       🗑 → deleted; written to RAG memory as "rejected" → never regenerated

       Website shows new cards after the next Vercel deploy (git push).

09:00 / 19:00  Backup cron generation runs (same auto-send-to-phone flow).
```

Founder's feed time: ~5 minutes of phone taps. Terminal touched once (starting the listener) or not at all if it survived the night.

## 3.3 The two human checkpoints (deliberate)

1. **Plan approval** — the orchestrator proposes; the human authorizes the day's commissioning.
2. **Card approval** — every card is human-approved before reaching the public channel.

## 3.4 The autonomy ladder (how automation is earned, not granted)

| Level | Meaning | Promotion rule |
|---|---|---|
| L0 | terminal approval | — |
| L1 | phone approval (current state for all features) | — |
| L2 | auto-publish if deterministic checks + eval score pass; route to phone otherwise | ~15–20 consecutive unedited approvals + eval thresholds |
| L3 | full auto; human spot-checks the channel | sustained L2 record |

A single hard failure (fabrication, factual error) demotes one level. **The eval harness is the gatekeeper** — the same scores that diagnose quality decide, per card, whether a human must look. Predictions are capped at L1 indefinitely (opinions carry brand risk). Insights are first in line for L2→L3.

## 3.5 What deliberately stays human

Articles (the moat) · prediction approval · the policy matrix itself · autonomy promotions.

---

# LAYER 4 — System View (logical architecture)

## 4.1 The three-layer agent architecture

```
                    ┌─────────────────────────────────┐
                    │   ORCHESTRATOR (decision layer)  │
                    │  world-model → reason → guard    │
                    └──────────────┬──────────────────┘
                                   │ commissions
      ┌──────────┬──────────┬──────┴────┬───────────┬─────────────┐
      ▼          ▼          ▼           ▼           ▼             ▼
 ┌─────────┐┌─────────┐┌─────────┐┌──────────┐┌────────────┐┌──────────┐
 │ Insights││  News   ││  Recap  ││Prediction││Match       ││ Racket   │
 │  agent  ││  agent  ││  agent  ││  agent   ││Analysis    ││ Advisor  │
 └────┬────┘└────┬────┘└────┬────┘└────┬─────┘│(on-demand) ││ (paused) │
      │          │          │          │      └────────────┘└──────────┘
      └──────────┴────┬─────┴──────────┘
                      ▼
        ┌───────────────────────────────┐     shared services:
        │  SHARED PUBLISH PIPELINE       │   • RAG memory (dedup)
        │  image → candidate → Telegram  │   • eval harness (quality)
        │  approval → publish_card()     │   • image generation
        └───────────────────────────────┘   • tournament calendar
```

## 4.2 The governing design principle (applied everywhere)

> **Deterministic code owns facts and safety. The LLM owns judgment and prose. The human owns approval.**

The LLM is bounded on both sides: fed verified inputs, checked by guardrails. Instances of the pattern:

| Concern | Deterministic | LLM | Human |
|---|---|---|---|
| Match results (recaps) | Apify structured data | writes the WHY from given facts | approves card |
| Daily plan | context gathering + guardrails (no recap on confirmed-zero matches, cap 3) | proposes the editorial plan | taps ✅/❌ |
| Duplication | cosine-similarity threshold (0.82) | — | — |
| Card quality | format/length/no-fabrication checks | LLM-as-judge eval scores | final approval |

## 4.3 Per-agent pipelines (logical flow)

**Recap** (the flagship rebuild — PDL-010):
```
Apify (structured results, date-bounded) → filter ATP/WTA singles
→ Tavily enrichment on top ~4 marquee matches (tactical color)
→ Sonnet writes: TYPE-1 structural WHY always (draw implications, milestones);
  TYPE-2 tactical WHY ONLY where enrichment provides evidence — never fabricated;
  seeds/rounds omitted (verified-facts-only rule)
→ programmatic image (Pillow tile) → candidate → approval → publish
```
*Architecture lesson encoded: facts from structured data, never extracted by an LLM from undated articles. The previous search-extraction design hallucinated eliminated players through six patches before the rebuild deleted more code than it added.*

**News:**
```
Tavily (freshness-aware queries: active-tournament results need only;
significance filter: GS/1000/500 + tier-independent major-player stories)
→ Sonnet curation (date-anchored: reject stale/preview-of-started/ended-tournament)
→ RAG dedup gate (semantic, 0.82) → news tile image → candidate → approval
```

**Insights:**
```
active tournaments from calendar (concurrent-aware) → tournament-specific queries
(both tours), evergreen fallback ("strong evergreen beats weak tournament angle")
→ Sonnet → RAG dedup → gpt-image-1 image at candidate creation → approval
```

**Predictions** (manual trigger):
```
--predict "P1 vs P2 Tournament Round" → search form/context → Sonnet V3 prompt
(4-sentence narrative editorial; banned generic openers and betting language;
max 1 stat) → versus duotone collage from photos/ (gpt-image-1 fallback) → approval
```

**Match Analysis** (the origin feature, on-demand): validate input → parse to structured query → agent searches → tactical breakdown (story / decisive factor / numbers that matter / verdict).

## 4.4 The shared services

**RAG semantic memory** (PDL-012) — gives agents recall of their own output.
- Every published/rejected card → embedded (OpenAI text-embedding-3-small, 1536-dim) → appended to a flat-file store.
- Before saving a new candidate: embed it, hand-written NumPy cosine similarity against the store; ≥0.82 → blocked as semantic duplicate (catches paraphrases string-matching missed — the Issue #011 fix).
- Rejection memory: a card the founder deleted is never regenerated.
- **Scope boundary (deliberate):** RAG answers "have we said something like this" (retrieval); it does NOT answer "what happened yesterday" (that's structured data). Knowing where not to apply the technique is part of the design.

**Eval harness** — quality measurement and (future) autonomy gatekeeper.
- Layer 1: deterministic checks (free) — length bounds, required sections, no fabricated players vs. verified list, no seed numbers, no markdown artifacts.
- Layer 2: LLM-as-judge — Sonnet framed as a harsh external editor ("you did NOT write this"), scoring explains_why / writing_quality / story_selection 1–5 + hard-fail flag. Never lets a model grade its own work uncritically.
- Track record: diagnosed explains_why at 2.9 (the platform's core promise, its weakest score); the structured-data + enrichment pipeline lifted new-pipeline recaps to 4.0. Key lesson: segment metrics by pipeline version — blended averages masked the improvement.
- Planned: dedup retrieval eval (precision/recall + threshold sweep) before RAG v1.5.

**Image generation** — at candidate creation (so the approval message shows the real image; no spinner on tap): gpt-image-1 (insights), programmatic Pillow tiles (recaps, news fallback), photo collages (predictions). All exception paths log full tracebacks to image-generation.log — silent failures are banned (Issue #012).

**World-model** — tournament calendar with tiers and tours (being completed for the full 2026 grass season), Apify cache with three-state match status (confirmed / confirmed-none / **unconfirmed** — never silently treated as zero), published-content scan, RAG memory.

---

# LAYER 5 — Implementation View (physical: repos, tech, data)

## 5.1 Repositories

| | `~/match-analyst-bot` | `~/tennismind-web` |
|---|---|---|
| Role | AI backend: agents, orchestrator, memory, Telegram | Next.js website + content + docs |
| Stack | Python 3 (venv — `source venv/bin/activate` every session), LangChain, Anthropic SDK, OpenAI SDK, Pillow, NumPy | Next.js (App Router), Tailwind v4 tokens, Newsreader + Inter via next/font |
| Deploy | runs locally (cron + listener on the Mac) | Vercel (static generation; deploy on push) |

## 5.2 External services

| Service | Used for | Cost reality |
|---|---|---|
| Anthropic (Sonnet) | generation, orchestrator reasoning, LLM-as-judge | ~$0.05–0.10/day |
| OpenAI | embeddings (RAG), gpt-image-1 (insight images) | embeddings negligible; images $0.02–0.04 each |
| Tavily | web search (news, enrichment, insights) | free tier |
| Apify (flashscore-scraper-live) | structured match results for recaps | $5 free credit/month; ~$0.02/run filtered |
| Telegram Bot API | channel publishing + private approval flow (free) | free |
| Vercel | website hosting + builds | free tier |

## 5.3 Key files

```
match-analyst-bot/
├── generate_feed.py        all content agents + publish_card() (single shared
│                           publish path: image → save → delete candidate →
│                           channel post → memory write-back)
├── orchestrator.py         context → Sonnet plan → guardrails → --plan-notify
├── telegram_review.py      --send-pending / --listen (long-poll getUpdates;
│                           handles pub/later/rej + plan_approve callbacks;
│                           idempotent via queue file)
├── memory.py               embed / add_memory / cosine_similarity (by hand) /
│                           search_memory / is_semantic_duplicate
├── evals/                  run_evals.py, eval_recap.py, test cases, eval_log.jsonl
├── data/                   memory.json · tg-review-queue.json · tg-plan-queue.json
│                           · apify-cache-{date}.json · tournament calendar
└── logs/                   orchestrator(.cron) · memory-dedup · tg-review ·
                            image-generation (full tracebacks)

tennismind-web/
├── content/feed/            PUBLISHED cards (the flat-file CMS — the folder IS
│                            the database; site builds pages from these .md files)
├── content/feed-candidates/ pending candidates (not on the site)
├── content/articles/        long-form articles (+ substack_url frontmatter)
├── public/feed/             card images
├── app/globals.css          design tokens (@theme): sand/ink/clay/green/line,
│                            Newsreader/Inter aliases, type scale 18/1.6 + 19/1.7
└── docs/                    the documentation set (see Layer 7)
```

## 5.4 The publish mechanics (three different technologies in one step)

1. **Filesystem** — candidate .md moves to `content/feed/` (flat-file CMS; version-controlled content).
2. **REST API** — POST to Telegram `sendMessage`/`sendPhoto` with `parse_mode=HTML` (markdown `**` is stripped at save; headers become `<b>`).
3. **Build + CDN** — Vercel build re-runs static generation over the content folder; pages go live on the CDN. *Build-time vs run-time:* a new card needs a deploy; one card's malformed frontmatter fails the whole build (YAML tags must be two-space-indented list items).

## 5.5 Infrastructure constraints (honest)

- **Everything schedules off a laptop.** Cron fires only when the Mac is awake; the listener resumes on lid-open (sleep) but dies on shutdown. A missed 07:00 plan arrives whenever the lid opens. Acceptable now; a ~€4–5/mo always-on VPS (Phase 4) is the fix once ≥2 features reach autonomy L2.
- **Apify budget:** monthly $5 credit; blocked until June 29 → no recaps until Wimbledon. A loud-fail guard (Telegram alert on billing errors) is planned so the pipeline never fails silently again.

---

# LAYER 6 — Scenarios (the views in motion)

## Scenario A — A Tuesday during Wimbledon (full system engaged)

07:00 the orchestrator's world-model shows: Wimbledon active (GS tier), Apify cache confirms 32 matches yesterday, nothing published today. Policy matrix → full daily recap + off-court news + tournament insight; a QF-day prediction is proposed. Plan lands on the founder's phone; ✅ tapped over coffee. Apify returns structured results; the recap agent writes the WHY from confirmed facts with Tavily color on the marquee matches; the news agent runs freshness + significance filters and RAG dedup; cards (with images) arrive on the phone. Founder publishes the recap at 08:30, saves one news card for later, rejects a weak insight (which RAG now remembers forever). Public channel updates instantly; the site after the morning push. Founder spends the afternoon on an article about yesterday's five-setter.

## Scenario B — A quiet week between tournaments (graceful degradation)

The world-model finds no covered tournament; Apify confirms nothing to recap. The orchestrator's plan: news as the main feed (rankings, injuries, comebacks — "between tournaments is when news matters most") + evergreen insights; recap and prediction skipped *with stated reasons*. Guardrails would veto any recap regardless, since matches are confirmed-zero. The feed stays alive on ~$0.10 of API spend and four phone taps.

## Scenario C — The system protects itself (failure modes by design)

A transient image-API error → full traceback to image-generation.log + visible ⚠; the imageless card is not sent (Issue #012 fix). The news agent drafts a story semantically identical to a rejected card → blocked at 0.86 similarity with a 🧠 log line. The Apify cache is missing → match status is **UNCONFIRMED**, surfaced to the human rather than silently treated as "no matches." A button is double-tapped → the queue file's idempotency check answers "already handled."

---

# LAYER 7 — Quality, Known Limitations, and the Documentation Map

## 7.1 Engineering lessons institutionalized (from the issue/decision logs)

1. **LLM for reasoning, structured data for facts.** Never extract authoritative facts from undated text when a structured source exists.
2. **Guardrail-on-guardrail = wrong foundation.** Re-architect; the right architecture deletes code.
3. **Every generative agent needs memory of its own output** — and a fix learned on one agent must be audited across all.
4. **Silent exception handlers are banned.** Every failure logs a traceback and prints a warning.
5. **Never let a model grade its own work** — judge with hostile framing; segment metrics by pipeline version.
6. **Agent reasoning quality = context completeness,** not prompt cleverness (the orchestrator's wrong-tournament reasoning traced to an incomplete calendar, not a bad prompt).
7. **One code path per concern** — terminal and Telegram approval both call the same `publish_card()`; divergent paths drift (the imageless-Halle bug).
8. **For time-sensitive factual content, a structured or direct source beats a search index — every time.** Search indexes are for discovery ("find me things about X"); structured feeds are for current truth ("what just happened, from the source"). Proven twice: recaps (web search → Apify structured data, PDL-010), news (search index → RSS publisher feeds, PDL-017). When content must be both current and true, reach for the publisher's direct feed or a structured data source before a search index. Use the search index only for the long-tail breadth a curated feed list can't cover.

## 7.2 Known limitations (open, acknowledged)

- Tournament calendar incomplete → orchestrator can mis-identify active events (date-filter fix in progress; full 2026 calendar pending).
- Orchestrator unaware of sub-agents' internal rules (insights' evergreen switch) → occasionally contradicts them.
- Laptop-bound scheduling (see 5.5). Website requires a manual deploy after publishing.
- News quality remains the hardest problem (freshness + significance are mitigations, not solutions); PDL-011 (curated digest vs. wire) deferred past Wimbledon.
- Prediction accuracy not yet tracked (Build 2, planned).

## 7.3 Documentation map (where the deeper detail lives — all in tennismind-web/docs/)

| Document | Layer it deepens |
|---|---|
| strategic-roadmap.md / growth-strategy.md | Business (L1) |
| product-decision-log.md (PDL-001…012) / issue-log.md (#001…012) | decisions & failures, all layers |
| current-operations-flow.md | Process (L3) — daily ground truth |
| autonomous-operations-design.md | Process (L3) — target state, autonomy ladder, policy matrix |
| orchestrator-solution-design.md | System (L4) — orchestrator internals |
| rag-memory-prd.md + rag-solution-design.md | System (L4) — memory internals |
| tech-roadmap.md | Implementation (L5) — build sequence |
| design-system.md | Implementation (L5) — visual tokens |
| commands.md | Implementation (L5) — operational cheat sheet |

## 7.4 Status & near-term roadmap (June 2026)

**Live:** all six agents · orchestrator with phone plan-approval · Telegram card approval (✅/📅/🗑, unified publish path, images at candidate creation) · RAG dedup v1 · eval harness Build 1 · Roland Garros design system · five published articles.

**Next:** full 2026 tournament calendar → RAG dedup eval (precision/recall, threshold sweep) → Wimbledon recap resumption (June 29, with Apify loud-fail guard) → Build 2 prediction accuracy → autonomy L2 for insights → VPS.

---

*This document is the map. The territory changes weekly — update Layer 7.4 on every significant ship, and the deeper layers when architecture or policy actually changes.*

# Tennis Platform — Strategic Product Roadmap

**Author:** Dmytro Galakhov  
**Date:** April 2026  
**Status:** Active  
**Last Updated:** May 24, 2026

---

## 1. Vision

Build a platform for everything tennis — where players and fans can consume match analytics, read tactical articles, get racket and string consultations, and access personalised training plans.

The platform starts as a multi-channel content product distributed across Telegram and a Next.js website, and evolves into a full web platform as audience and content patterns are validated.

## 2. Current State

We have a working TennisMind product with multiple capabilities:

**Telegram Bot** (`@tennis_analyst_rafik_bot`):
- Analyse any ATP/WTA match on demand (match analysis agent)
- Compare two players across surfaces (comparison agent)
- Predict upcoming match outcomes (prediction agent)
- Racket recommendation wizard (7-question guided flow)
- Respond in the user's language (Ukrainian, Russian, English, etc.)
- Detect ambiguous queries and ask clarifying questions with tappable buttons
- Fail honestly when data is unavailable

**Telegram Channel** (`@tennismind`):
- Publishing match analyses and predictions via `publish_now.py` and `predict_now.py`
- Full tournament draw predictions via `predict_draw.py`
- Bilingual content (Ukrainian + English)
- Bot button on every post linking to the interactive bot

**Content Pipeline:**
- Scheduler discovers active tournaments and finds completed matches
- Editor formats content for Telegram (HTML) and website (Markdown)
- Manual publishing with human review (automated pipeline designed but deferred)

The product is **both pull and push** — the bot handles on-demand queries while the channel pushes content to subscribers. The website captures Google traffic and houses the interactive tools.

**Feed/Insights System:**
- Three separate agents: **Recap** (daily tournament summary), **News** (time-sensitive tour events), **Insights** (evergreen facts, research, gear)
- Tournament calendar hardcoded in `generate_feed.py`; agents auto-detect active tournament and rewrite queries + curation prompts accordingly
- Review flow: `y`=publish, `n`=delete file permanently, `t`=keep as pending (reappears next review)
- Candidates stored in `feed-candidates/recap/`, `feed-candidates/news/`, `feed-candidates/insights/`; approved cards go to `feed/`
- Recap: daily tournament summary with MEN'S DRAW / WOMEN'S DRAW / STAT OF THE DAY; broadcast-style image (clay court texture, ESPN/Eurosport aesthetic); only runs during active tournament
- Insights: two-step approval (card text → AI image via gpt-image-1 at 1536×1024); retro French Riviera poster style
- News: one-step approval (card text → optional manual photo); tournament-only focus during active Slam
- Image prompts logged to `~/match-analyst-bot/logs/image-prompts.log`
- Approved cards auto-publish to website AND Telegram channel
- Card types: recap / news / stat, gear, form, history (insights)
- `--generate` runs all three in order: recap → news → insights; `--review` shows all pending in same order
- Commands: `--generate-recap`, `--generate-insights`, `--generate-news`, `--generate` (all); `--review-recap`, `--review-insights`, `--review-news`, `--review` (all)
- Designed as the "discover without asking" layer — content users browse, not query

**Website** (deployed on Vercel):
- Live at tennis-mind-six.vercel.app
- Racket Finder: 7-question wizard with AI recommendations, racket images, expandable specs
- String Finder: placeholder with full question flow
- Customization Wizard: placeholder
- Match Analysis archive: markdown-based, auto-rendered
- Feed page: daily insights from the autonomous agent
- Synthwave design theme (purple #BF5AF2, cyan #00E5FF, dark background)
- i18n support (English, German, Ukrainian)
- Vercel Analytics enabled

## 3. Strategic Insight

### From pull to push

The single most important shift is from **pull to push**: instead of waiting for users to ask for analysis, we deliver it to them automatically. This transforms the product from a tool (used occasionally) into a media product (consumed habitually).

### Multi-platform from day one

Different tennis audiences live on different platforms:

| Platform | Audience | Strength |
|----------|----------|----------|
| **Telegram** | Russian/Ukrainian-speaking tennis fans | Large existing tennis communities, bot-native, rich formatting |
| **Substack** | English-speaking tennis enthusiasts, newsletter readers | Captures emails (owned audience), SEO-discoverable, long-form friendly |
| **WhatsApp Channels** | Global audience, especially Europe and South America | Massive reach, mobile-first, growing fast |

Rather than picking one platform and hoping, we build a **platform-agnostic content pipeline** where the same analysis is formatted and distributed to all three. The content generation (the expensive part) happens once. Publishing (the cheap part) happens three times.

This also enables multilingual distribution: Telegram in Russian/Ukrainian, Substack and WhatsApp in English. The agent already handles language switching — we just configure which language each platform gets.

## 4. Target Audience

**Primary — Russian and Ukrainian-speaking tennis community (Telegram):** Recreational players and tour followers. Underserved by existing tennis media, which is almost entirely English. This is the fastest audience to build because Telegram tennis communities already exist and can be cross-promoted.

**Secondary — English-speaking tactical tennis fans (Substack + WhatsApp):** People who want more than scores and highlights. They watch matches, have opinions, but don't have time to compile stats and tactical analysis themselves. Substack captures their emails (owned audience); WhatsApp reaches them on mobile.

**Future — Club players seeking improvement (Phase 4+):** The eventual premium audience. They'll pay for personalised training plans, equipment consultation, and deep tactical content. The free content channels build trust and awareness before this tier launches.

## 5. Phasing

### Phase 1 — Tennis Analyst Bot (COMPLETED)

Built and deployed. The interactive Telegram bot serves as the foundation for all future development. Detailed technical documentation available in the Phase 1 Technical Documentation.

Key capabilities delivered:
- Tool-using agent with autonomous web search (ReAct pattern)
- Input validation and structured parsing with date awareness
- Two specialised agents (match analysis + player comparison)
- Multilingual support (Ukrainian, Russian, English, Spanish, French, German)
- Interactive clarification with inline keyboards
- Honest failure when data is unavailable
- Telegram bot deployment

### Phase 2 — Automated Multi-Channel Content with Human Approval (NEXT)

**Objective:** Build a semi-automated pipeline that produces daily tennis analysis content and publishes it to three platforms (Telegram channel, Substack newsletter, WhatsApp channel) after human review.

**Why skip the manual phase:** The primary learning objective is multi-agent AI architecture. Building the automated pipeline (scheduler → analyst → editor → reviewer → publisher) is itself the educational goal. However, we retain human approval to catch errors and build editorial quality.

#### 2.1 Pipeline Architecture

```
┌──────────────────────────────────────────────────────┐
│              Tournament Calendar / API                │
│   (ATP/WTA schedule — which matches were played)     │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│                   scheduler.py                       │
│                                                      │
│  Jobs:                                               │
│  • Check which matches completed today               │
│  • Apply priority rules (which matches are worth     │
│    publishing — not every R1 match deserves a post)  │
│  • Queue selected matches for analysis               │
│                                                      │
│  Priority rules:                                     │
│  • All Grand Slam matches from R16 onwards           │
│  • All Masters 1000 semifinals and finals            │
│  • Any match where a top-20 player loses (upsets)    │
│  • Any match lasting 4+ hours or deciding-set TB     │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│                   analyst.py (existing)               │
│                                                      │
│  Jobs:                                               │
│  • Generate match analysis (already built)           │
│  • Generate in multiple languages per platform:      │
│    - Russian/Ukrainian for Telegram                  │
│    - English for Substack and WhatsApp               │
│                                                      │
│  New function needed:                                │
│  • batch_analyse(matches, language) — takes a list   │
│    of matches, produces analyses, respects rate      │
│    limits and budget caps                            │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│                    editor.py (new)                    │
│                                                      │
│  Jobs:                                               │
│  • Take raw analysis and adapt for each platform:    │
│                                                      │
│  Telegram format:                                    │
│  • HTML formatting (bold labels, clean structure)    │
│  • Add hashtags (#Tennis #RolandGarros #ATP)         │
│  • Add channel branding footer                       │
│  • Keep under 4096 chars or split                    │
│                                                      │
│  Substack format:                                    │
│  • Full Markdown with headers, images                │
│  • Add editorial intro paragraph                     │
│  • Add "subscribe for more" CTA                      │
│  • SEO-friendly title and subtitle                   │
│                                                      │
│  WhatsApp format:                                    │
│  • Plain text with emoji section markers             │
│  • Shorter and punchier (WhatsApp = mobile reading)  │
│  • No markdown (WhatsApp strips most formatting)     │
│  • Key stats as standalone lines for readability     │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│                   reviewer.py (new)                   │
│                                                      │
│  Jobs:                                               │
│  • Send draft to admin's private Telegram chat       │
│  • Show all three platform versions for review       │
│  • Provide three buttons per draft:                  │
│    ✅ Approve — publish to all platforms              │
│    ✏️ Edit — admin modifies text, then approves       │
│    ❌ Reject — discard with reason logged             │
│  • Track approval rate as a quality metric           │
│  • Log rejected drafts with reasons for prompt       │
│    improvement                                       │
└──────────────────────┬───────────────────────────────┘
                       │ (only after admin approval)
                       ▼
┌──────────────────────────────────────────────────────┐
│                   publisher.py (new)                  │
│                                                      │
│  Jobs:                                               │
│  • Platform-agnostic publisher with adapters         │
│  • Each adapter handles one platform's API:          │
│                                                      │
│  ┌────────────────────────────────────────┐          │
│  │  TelegramAdapter                       │          │
│  │  • Post to public Telegram channel     │          │
│  │  • Uses Bot API (bot must be admin)    │          │
│  │  • HTML parse mode                     │          │
│  │  • Handles message splitting           │          │
│  │  • Free, no API limits for channels    │          │
│  └────────────────────────────────────────┘          │
│                                                      │
│  ┌────────────────────────────────────────┐          │
│  │  SubstackAdapter                       │          │
│  │  • Publish newsletter post             │          │
│  │  • Uses Substack API or email-to-post  │          │
│  │  • Markdown formatting                 │          │
│  │  • Schedule for optimal send time      │          │
│  │  • Free tier: unlimited subscribers    │          │
│  └────────────────────────────────────────┘          │
│                                                      │
│  Future adapters (Phase 3+):                         │
│  • XTwitterAdapter (when API cost justified)         │
│  • DiscordAdapter (if community forms)               │
│  • WhatsAppAdapter (if audience demands it)          │
└──────────────────────────────────────────────────────┘
```

#### 2.2 Content Strategy per Platform

| Aspect | Telegram | Substack | WhatsApp |
|--------|----------|----------|----------|
| **Language** | Russian / Ukrainian | English | English |
| **Tone** | Punchy, direct, emoji-friendly | Editorial, analytical, longer-form | Short, mobile-friendly, scannable |
| **Frequency** | Daily during tournaments, 2-3x/week off-season | 2-3x/week (digest style) | Daily during tournaments |
| **Content length** | 300-500 words per post | 500-1000 words per issue | 200-300 words per update |
| **Unique content** | Real-time post-match reactions | Weekly roundups, deep dives, previews | Quick-hit results + one key insight |
| **Growth tactic** | Cross-post in Russian/Ukrainian tennis groups | SEO + social sharing + Reddit | Share link in tennis WhatsApp groups |

#### 2.3 Content Types (all platforms)

**Daily (during tournaments):**
- Post-match tactical analyses (core product)
- Upset alerts with quick tactical explanation

**2-3x per week:**
- Pre-tournament previews (key matches to watch, surface form)
- Head-to-head breakdowns before marquee matchups

**Weekly:**
- Rankings analysis (who's rising, who's falling, and why)
- "Best match of the week" deep dive

#### 2.4 Human Approval Workflow

Each platform version is approved independently — a Telegram post might be great while the WhatsApp version needs editing.

```
Scheduler triggers analyst for 3 matches
    ↓
Analyst produces 3 analyses (RU + EN for each = 6 texts)
    ↓
Editor formats for 3 platforms (Telegram/RU, Substack/EN, WhatsApp/EN)
    ↓
Reviewer sends drafts to admin's private Telegram,
ONE message per platform per match:

┌─────────────────────────────────────────┐
│ 📝 Sinner vs Alcaraz RG 2025           │
│ 📱 Platform: Telegram 🇺🇦               │
│                                         │
│ [full preview of the Telegram version]  │
│                                         │
│ [✅ Approve] [✏️ Edit] [❌ Reject]       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📝 Sinner vs Alcaraz RG 2025           │
│ 📰 Platform: Substack 🇬🇧               │
│                                         │
│ [full preview of the Substack version]  │
│                                         │
│ [✅ Approve] [✏️ Edit] [❌ Reject]       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📝 Sinner vs Alcaraz RG 2025           │
│ 💬 Platform: WhatsApp 🇬🇧               │
│                                         │
│ [full preview of the WhatsApp version]  │
│                                         │
│ [✅ Approve] [✏️ Edit] [❌ Reject]       │
└─────────────────────────────────────────┘

Each platform is approved independently:
• ✅ Approve → publishes to THAT platform only
• ✏️ Edit → admin modifies text → approves → publishes
• ❌ Reject → logged with reason, not published

For 3 matches × 3 platforms = 9 review messages.
To keep this manageable:
• Messages are grouped by match (all 3 platforms for Match 1,
  then all 3 for Match 2, etc.)
• An "✅ Approve All" shortcut button appears at the end of
  each match group for days when quality is consistently good
• Rejected drafts and their reasons are logged for prompt
  improvement
```

#### 2.5 Budget and Cost Management

| Cost item | Per-query cost | Daily estimate | Monthly estimate |
|-----------|---------------|---------------------------|-----------------|
| Anthropic Sonnet (analysis, predictions, racket finder, feed curation) | $0.05-0.15 | $0.50-1.50 | $15-45 |
| Anthropic Haiku (validation + parsing) | $0.0005 | $0.005 | $0.15 |
| OpenAI DALL-E 3 (feed card images) | $0.04 | $0.04-0.12 | $1-3.60 |
| Tavily (web search) | Free tier (1000/month) | 10-15 searches | 300-450 searches |
| Telegram Bot API | Free | Free | Free |
| Vercel hosting | Free tier | Free | Free |
| **Total** | | | **$16-50/month** |

Note: Haiku is used for validation/parsing (cost optimization). Sonnet handles analysis, predictions, racket recommendations, and feed curation where reasoning quality matters.

#### 2.6 Success Criteria

| Metric | Target (first 3 months) |
|--------|------------------------|
| Telegram channel subscribers | 300+ |
| Website monthly visitors | 1,000+ |
| Racket Finder completions | 100+ per month |
| Feed insights published | 60+ (2-3 per day) |
| Admin approval rate | > 85% |
| Factual errors per 50 posts | < 2 |
| Content published per tournament week | 15-20 posts |

### Phase 3 — Content Expansion and Selective Automation

**Timing:** After Phase 2 has run through at least 2 major tournaments.

**Additions:**
- Auto-publish for routine matches (early rounds) — skip human review
- Draft-for-review only for high-profile matches (finals, semis, upsets)
- New content agents:
  - **Tournament Preview Agent** — pulls draw data, H2H records, surface form, produces "5 matches to watch" previews
  - **Rankings Analysis Agent** — weekly rankings movements with tactical context ("Zverev climbed to #2 because...")
  - **Equipment/Stringing Agent** — the Stringing Advisor from the original project list, deployed as a content series
- Content performance tracking (which posts get forwarded/shared most)
- A/B testing content formats (short vs long, stats-heavy vs narrative)

**Success criteria:**
- Combined 2,000+ subscribers across all platforms
- 30%+ average view rate on Telegram
- 40%+ Substack open rate
- Cost per post < $0.30
- < 1 factual error per 50 posts

### Phase 4 — Web Application (START NOW, parallel to Telegram)

**Timing:** Start immediately with a minimal site. Expand after Roland Garros.

**Why now, not later:** Every day without a website is lost SEO traffic. Someone Googling "Sinner vs Alcaraz Madrid 2026 analysis" right now can't find your content. The match analyses you're already producing for Telegram become web pages with zero extra AI cost — you just need a website to put them on.

**The website is NOT a replacement for Telegram.** It's a second distribution channel that captures a completely different audience (English-speaking, Google-searching, racket-shopping). The same AI pipeline feeds both.

#### 4.1 Minimal Website (build first)

Two pages that deliver immediate value:

**Page 1: Racket Recommendation Tool**
- Interactive wizard (same 7 questions as the Telegram bot)
- Results page with recommendations, specs, and affiliate links
- SEO target: "best tennis racket for [level] [style]" — hundreds of searches/month
- This is the monetisation page (affiliate revenue from day one)

**Page 2: Match Analysis Feed**
- Blog-style feed of match analyses (same content as Telegram channel)
- Each analysis is its own page with an SEO-friendly URL
  (e.g. tennismind.com/analysis/sinner-alcaraz-madrid-2026)
- SEO target: "[Player] vs [Player] [Tournament] analysis"
- Email capture: "Subscribe for match predictions before every Grand Slam"

**What's NOT in the minimal site:**
- No user accounts
- No personalised feeds
- No payment system
- No community features

#### 4.2 Architecture

```
┌──────────────────────────────────────────────────────┐
│           AI Pipeline (Python backend)                │
│                                                       │
│  analyst.py → match analyses (Anthropic Sonnet)       │
│  predictor.py → match predictions (Anthropic Sonnet)  │
│  racket_advisor.py → racket recs (Anthropic Sonnet)   │
│  generate_feed.py → daily insights (Anthropic Sonnet) │
│  validator.py / parser.py → input handling (Haiku)    │
│  editor.py → format for Telegram                      │
│                                                       │
│  External APIs:                                       │
│  • Anthropic Claude API → reasoning, analysis, curation│
│  • Tavily API → web search for match data & news      │
│  • OpenAI DALL-E 3 API → image generation for feeds   │
│  • Telegram Bot API → channel publishing & bot        │
└────────┬──────────────────────────────┬──────────────┘
         │                              │
         ▼                              ▼
   ┌──────────┐               ┌──────────────┐
   │ Telegram │               │   Website    │
   │ Channel  │               │  (Next.js)   │
   │ + Bot    │               │              │
   │          │               │ • Racket     │
   │ Content: │               │   Finder     │
   │ • Analyses│              │ • String     │
   │ • Predictions│           │   Finder     │
   │ • Feed cards │           │ • Customize  │
   │   with images│           │ • Analysis   │
   │          │               │   archive    │
   │ RU/UA/EN │               │ • Feed page  │
   │ audience │               │ • Predictions│
   │          │               │              │
   │          │               │ EN/DE/UA     │
   │          │               │ Vercel hosted│
   └──────────┘               └──────────────┘
```

#### 4.2.1 Agent Architecture & System Layers

TennisMind's AI system is organized in five layers, each serving a distinct purpose:

**LAYER 1: MEMORY (CLAUDE.md)**
Purpose: persistent instructions that survive across Claude Code sessions.
Implementation:
  - Architecture rules (LLM for reasoning, database for facts)
  - Naming conventions (file slugs, folder structure)
  - Documentation rules (auto-update roadmap, commands, issue log on changes)
  - Quality rules (no stats without numbers, no vague analysis, accuracy over completeness)
Location: CLAUDE.md in both repos (match-analyst-bot + tennismind-web)

**LAYER 2: SKILLS (Prompt Templates & Style Configs)**
Purpose: specialized expertise loaded per content type, not stuffed into one mega-prompt.
Implementation:
  - STYLE_TEMPLATES dict — different visual prompts per card type (editorial, product, player, commemorative, action)
  - IMAGE_ROUTING config — rules for which card type gets AI images vs manual photos
  - Curation prompts — separate editorial voice for news vs insights vs recaps
  - Art director prompt — Sonnet-powered visual brief generation
  - Tournament calendar — automatic context injection based on active tournament
Location: generate_feed.py (prompt templates, routing config, calendar)

**LAYER 3: SUBAGENTS**
Purpose: specialized agents for distinct content needs, each with its own search strategy, curation logic, and output format.

  **Agent 1: Insights Agent**
    Job: find evergreen, surprising tennis content
    Searches: research queries without dates (demographics, equipment science, industry data, funny stories)
    Output: 1-3 editorial insight cards with AI-generated illustrations
    Schedule: daily at 9 AM via cron
    Commands: --generate-insights / --review-insights

  **Agent 2: News Agent**
    Job: find current tennis news worth knowing
    Searches: time-sensitive queries with today's date, tournament-aware during Grand Slams
    Output: 1-3 news cards with manually-provided real photos
    Schedule: daily at 9 AM + 7 PM during tournaments
    Commands: --generate-news / --review-news

  **Agent 3: Recap Agent**
    Job: summarize yesterday's tournament action
    Searches: editorial recap articles (not score pages), dedicated farewell player queries
    Output: 1 structured recap card (men's draw + women's draw) with broadcast-style graphic
    Schedule: daily at 9 AM during active tournaments only
    Commands: --generate-recap / --review-recap
    Special rules: deduplication against previous recaps, date verification, mandatory top-5 seed coverage

  **Agent 4: Match Analysis Agent (analyst.py)**
    Job: produce tactical breakdown of a specific match
    Searches: match recap articles, statistics
    Output: structured analysis (headline, why he won, key stats, insight)
    Schedule: on-demand via publish_now.py
    Special rules: no vague language, specific numbers required, honest failure when data unavailable

  **Agent 5: Prediction Agent (predictor.py)**
    Job: predict match outcomes or full tournament draws
    Searches: H2H records, form data, surface stats
    Output: prediction with confidence rating
    Schedule: on-demand via predict_draw.py

  **Agent 6: Racket Advisor (racket_advisor.py)**
    Job: recommend a racket based on player profile
    Searches: none — reasons over curated database
    Output: personalized recommendation with explanation
    Special rules: LLM for reasoning only, database for all specs/prices/strings

**LAYER 4: PLUGINS (External API Connections)**
Purpose: connect agents to external services for search, reasoning, image generation, and publishing.
Implementation:
  - Tavily API — web search (used by insights, news, recap, analysis, prediction agents)
  - Anthropic Claude API — reasoning engine
    - Sonnet: analysis, predictions, curation, art direction, racket recommendations
    - Haiku: validation, parsing, verification checks
  - OpenAI gpt-image-1 — image generation for insight cards and recap graphics
  - Telegram Bot API — publishing to channel and bot interactions
  - Vercel — website hosting and deployment
  - File system — markdown content management, image storage

**LAYER 5: GUARDRAILS (Quality Controls)**
Purpose: prevent errors before they reach users.
Currently implemented:
  - Human-in-the-loop review: every card requires manual approval (y/n/t) before publishing
  - Two-step image approval: approve text separately from image, with regeneration option
  - Date verification: Haiku cross-checks recap results against previous recaps
  - Deduplication: new recaps checked against published recaps to prevent repeating old results
  - Content quality filter: search results with garbled HTML or under 100 chars are stripped before reaching Sonnet
  - Telegram fallback: if photo upload fails, card still publishes to website (no full pipeline crash)
  - Friendly error messages: API failures show user-friendly text, not raw errors
Future (not yet implemented):
  - Automated fact-checking hook (verify player names against known database)
  - Auto-reject cards over word limit
  - Image dimension verification before saving
  - Fully autonomous publishing without human review (requires all hooks above)

---

#### 4.3 Content Publishing Flow (updated)
```
MATCH ANALYSIS:
    Admin runs publish_now.py
        → Analysis generated by Sonnet agent
        → Saved as .md to ~/tennismind-web/content/analyses/
        → Published to Telegram channel
        → Website auto-renders on /analysis page

DAILY NEWS:
    Cron runs generate_feed.py --generate-news at 9 AM
        → Tavily searches for current tennis news (tournament-aware queries)
        → Sonnet curates 1-3 news candidates
        → Saved to ~/tennismind-web/content/feed-candidates/news/
    Admin runs generate_feed.py --review-news
        → y = approve, n = delete, t = save for later
        → Approved: admin provides real photo path
        → Card moved to ~/tennismind-web/content/feed/
        → Auto-published to Telegram (📰 format)
        → Website renders on /news page

DAILY INSIGHTS:
    Cron runs generate_feed.py --generate-insights at 9 AM
        → Tavily searches for evergreen tennis content (research queries, no dates)
        → Sonnet curates 1-3 insight candidates
        → Saved to ~/tennismind-web/content/feed-candidates/insights/
    Admin runs generate_feed.py --review-insights
        → y = approve card text
        → gpt-image-1 generates illustration (retro French poster, 1536x1024)
        → Admin approves image (y/regen/skip)
        → Card moved to ~/tennismind-web/content/feed/
        → Auto-published to Telegram with image
        → Website renders on /feed page
```
#### 4.3.1 Card Lifecycle State Machine
```
The feed system uses three card statuses:

PENDING → Card created by agent, waiting for human review
  │
  ├── y (approve) → IMAGE GENERATION (insights only, gpt-image-1)
  │                    │
  │                    └── → PUBLISHED
  │                           • Card moved to content/feed/
  │                           • Image saved to public/feed/
  │                           • Posted to Telegram
  │                           • Live on website (/news or /feed)
  │
  ├── t (save for later) → PENDING (unchanged)
  │                          Card stays in candidates folder
  │                          Shows again in next --review run
  │
  └── n (reject) → DELETED
                     File permanently removed from candidates

Review command options: y=publish, n=delete, t=save for later, edit=modify card

News cards skip the image generation step — admin provides a real photo path after approving the text.
```
#### 4.4 Technology Options

| Option | Effort | Hosting | Best for |
|--------|--------|---------|----------|
| **Next.js** | Medium (need to learn React) | Vercel (free tier) | Full control, best SEO, scales well |
| **Astro** | Low-Medium | Netlify/Vercel (free) | Content-heavy sites, great SEO, simpler than Next.js |
| **Hugo / 11ty** | Low | Netlify/GitHub Pages (free) | Pure blog/content sites, fastest, minimal JS |
| **Webflow / Framer** | Lowest (no-code) | Built-in ($15-30/mo) | Beautiful design fast, limited interactivity |

For the racket tool + blog content + SEO, **Astro or Next.js** are the strongest choices.

#### 4.5 SEO Strategy

**Match analyses (long-tail traffic):**
- URL: `/analysis/sinner-alcaraz-madrid-2026-qf`
- Title: "Sinner vs Alcaraz Madrid 2026 QF: Tactical Analysis"
- Each match page targets a specific search query
- 50+ pages after one Grand Slam = compounding traffic

**Racket tool (commercial traffic):**
- URL: `/racket-finder`
- Title: "Find Your Perfect Tennis Racket — Free AI Recommendation"
- Results page: `/racket-finder/results?level=intermediate&style=aggressive&brand=babolat`
- Each result combination is a crawlable page
- Affiliate links on every recommendation

**Predictions (time-sensitive traffic):**
- URL: `/predictions/madrid-2026`
- Title: "Madrid Open 2026 Predictions — Full Draw Analysis"
- Published before the tournament, captures pre-tournament search traffic
- Links to analysis pages once matches are played (internal linking)

#### 4.6 Feed / Insights System

The strategic pivot from "ask and answer" to "discover without asking." Users 
don't open TennisMind to ask a question — they open it to browse interesting 
tennis content over morning coffee.

**Architecture:**
```
Daily cron (6 AM)
    → generate_feed.py --generate
    → Tavily searches for interesting tennis news/stats/history
    → Sonnet curates 1-3 candidates (editorial prompt encodes taste)
    → Saved to /content/feed-candidates/ as markdown files
    
Admin reviews (whenever)
    → generate_feed.py --review
    → Approve/reject each candidate
    → Approved → auto-publishes to website + Telegram
    → Rejected → deleted
```

**Card types:**
- stat — surprising numbers, streaks, records
- gear — equipment changes, industry insights
- form — player trends, surface-specific performance
- history — "on this day" parallels, historical context
- upset — unexpected results with analysis

**Editorial voice (the moat):**
The curation prompt defines what TennisMind considers "interesting" — not generic 
news, but surprising connections, hidden patterns, industry insider knowledge, 
and financial/business angles. This editorial judgment is what separates the 
feed from generic AI-generated tennis content.

**Content sources:**
- Time-sensitive: daily agent discovers streaks, upsets, milestones
- Evergreen: admin manually adds deep domain insights (equipment science, 
  industry practices, business data) — these are the highest-value cards

**Future evolution (Phase 5):**
- Structured database behind insights (Postgres)
- Entity linking (player → racket → tournament)
- User personalization (show more of what interests each user)
- Insight reuse across player pages, racket pages, and notifications

#### 4.7 Success Criteria (updated)

| Metric | Target (first 3 months) |
|--------|------------------------|
| Monthly Google traffic | 1,000+ visitors |
| Racket tool completions | 100+ per month |
| Affiliate clicks | 50+ per month |
| Email signups | 200+ |
| Pages indexed by Google | 50+ |
| Average time on racket tool | > 2 minutes |

### Phase 5 — Full Platform

**Timing:** 6-12 months from now, only after the website proves traffic and engagement.

**Phase 5 is the original "everything tennis" vision.** It adds:

**User accounts and personalisation:**
- Follow specific players (get notified when new analysis/prediction is published)
- Save favourite racket recommendations
- Personal "tennis profile" (level, playing style, racket, goals)

**Premium tier ($5-15/month):**
- AI Hitting Partner Planner — multi-agent system that assesses your level, researches drills, and builds a weekly periodised training block
- Equipment deep-dives — string recommendations, tension advice for different conditions, custom racket comparison reports
- Ad-free experience + early access to predictions

**Community features:**
- Comments on analyses (debate predictions, share perspectives)
- "Rate this prediction" — crowd feedback on prediction quality
- User-submitted match requests ("analyse my club match video")

**Advanced AI features:**
- Match video analysis (upload a clip, get tactical feedback)
- Personalised training plans based on self-reported weaknesses
- Tournament simulation ("if Sinner beats Rublev, he faces... probability tree")

**Technology additions:**
- User authentication (Auth0 or Clerk)
- Database (PostgreSQL for user data, content metadata)
- Payment processing (Stripe)
- Content management system for editorial content
- Analytics dashboard (PostHog or Mixpanel)

## 6. Platform Growth Strategy

### Telegram (Russian/Ukrainian)
- Cross-post in existing Russian/Ukrainian tennis groups and chats
- Partner with popular Russian-language tennis bloggers
- Post during/immediately after matches when discussion is hot
- Use Telegram's native sharing mechanics (forwarding)

### Substack (English)
- SEO: every post is indexed — use strong titles like "Why Alcaraz Beat Sinner at Roland Garros 2025: A Tactical Breakdown"
- Share each post on Reddit (/r/tennis is 1.5M+ members)
- Share on Tennis Twitter with a key insight as the hook
- Cross-promote from WhatsApp ("Read the full analysis on Substack")

### WhatsApp (English, global)
- Share channel link in tennis WhatsApp groups
- Keep content short and shareable — optimise for screenshots
- Post immediately after matches (fastest platform for mobile push notifications)
- Use WhatsApp Status feature for visibility

### Cross-platform flywheel
```
WhatsApp (quick hit, mobile) 
    → "Full analysis on Substack" link
        → Substack (deep read, email capture)
            → "Join our Telegram for real-time analysis" 
                → Telegram (community, interaction)
```

Each platform feeds into the others. WhatsApp captures casual fans. Substack converts them into subscribers. Telegram builds the community.

## 7. Learning Objectives by Phase

| Phase | AI/Engineering Skills Learned |
|-------|-------------------------------|
| Phase 1 (done) | Tool-using agents, ReAct pattern, prompt engineering, input parsing/validation, Telegram bot development |
| Phase 2 (done) | Multi-agent pipelines, scheduled automation, human-in-the-loop workflows, multi-platform publishing, content generation at scale, cost management |
| Phase 3 | Multi-agent orchestration, automated quality control, content diversification, A/B testing, cross-platform analytics |
| Phase 4 (in progress) | Web development (Next.js), SEO, API design, affiliate integration, autonomous content agents, cron-based automation, editorial AI curation, i18n |
| Phase 5 | User authentication, database design (Postgres), payment integration, recommendation systems, personalisation, knowledge graphs, community features |

## 8. Key Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Content quality (factual errors, hallucinations) | High | Human review loop in Phase 2; eval harness; track error rate per 50 posts |
| Audience growth is slow | Medium | Three platforms reduce single-platform risk; active cross-posting to Reddit, Twitter, tennis forums |
| Scope creep | High | Strict phasing; don't start Phase 4 until channels prove demand with 2,000+ combined subscribers |
| API costs at scale | Medium | Track cost per post; batch during off-peak; cache common queries; budget cap in scheduler |
| WhatsApp API access/cost | Medium | Start with manual posting if Business API is too expensive; evaluate cost after Telegram and Substack are running |
| Platform dependency | Low | Multi-platform from day one reduces risk; Substack email list is owned (portable) |
| Multilingual content quality | Medium | Separate review per language; native speaker review for RU/UA content |

## 9. Key Metrics

**North star metric:** Combined subscriber growth rate across all platforms (week-over-week).

**Platform-specific metrics:**

| Metric | Telegram | Substack | WhatsApp |
|--------|----------|----------|----------|
| Subscribers/followers | Target: 300 in 2mo | Target: 200 in 2mo | Target: 200 in 2mo |
| Engagement | View rate > 30% | Open rate > 40% | View rate > 25% |
| Growth signal | Forwards per post | Social shares per post | Channel shares |
| Quality | Admin approval rate > 85% | Same | Same |

**Operational metrics:**
- Cost per post (target: < $0.30)
- Time from match completion to published analysis (target: < 2 hours)
- Factual accuracy (target: < 2 errors per 50 posts)
- Pipeline uptime during tournaments (target: 100%)

## 10. Immediate Next Steps

1. **Deploy feed generator agent** — test --generate and --review modes, set up cron
2. **Publish manually during Roland Garros** (starts May 25) — first full Grand Slam
3. **Run feed agent daily** — validate that curated insights get engagement
4. **Collect user feedback** on feed vs. racket finder vs. analyses — which gets traction?
5. **Request API tier upgrade** — hit the monthly limit twice, need higher ceiling
6. **Add racket images** for remaining Head/Wilson models
7. **Evaluate feed engagement after 2 weeks** — decide on database investment
8. **Register affiliate accounts** with tennis retailers for racket finder monetization

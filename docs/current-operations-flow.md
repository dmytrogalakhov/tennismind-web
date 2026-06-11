# TennisMind — Current Operations Flow
**As of:** June 2026
**Status:** Live — Phase 1 (Telegram card approval) complete; Phase 1.5 (plan approval via Telegram) in progress

This document describes how the platform actually operates today — the daily rhythm, every command, every system involved, and what is and isn't automated. It is the "ground truth" complement to autonomous-operations-design.md (which describes the target state).

---

## The Two Repos

| Repo | What lives here | When you work here |
|---|---|---|
| `~/match-analyst-bot` | All AI agents, generation, orchestrator, RAG memory, Telegram review | content generation, review, publishing |
| `~/tennismind-web` | Next.js website, published content (.md files), design system, docs | after publishing (git push → Vercel deploy) |

**Every terminal session in match-analyst-bot:**
```bash
cd ~/match-analyst-bot && source venv/bin/activate
```
The `(venv)` prefix on your prompt confirms you're in the right environment.

---

## The Daily Rhythm (current state)

### What runs automatically (cron, Mac must be awake)

| Time | Command | What it does |
|---|---|---|
| 07:00 | `orchestrator.py --plan-notify` | Gathers context, reasons about today's content, sends the plan as a TEXT message to your private Telegram. No buttons yet (Phase 1.5 will add them). |
| 09:00 | `generate_feed.py --generate` | Runs all agents (insights + news). Sends candidates to your private Telegram with ✅/📅/🗑 buttons automatically. |
| 19:00 | `generate_feed.py --generate-news` | Evening news generation run. Same — auto-sends to Telegram. |

**Critical dependency:** cron only fires when the Mac is awake. If the lid is closed at 07:00, the plan sends when you open it. Close enough for a one-person operation.

### What you do manually

**Start the listener once per working session** (leave running):
```bash
python3 telegram_review.py --listen
```
This is the process that receives your Telegram button taps and executes publish/reject. It must be running for buttons to work. If you leave it running and close the lid (sleep, not shutdown), it resumes when you open the Mac.

**If you want to generate outside the cron schedule:**
```bash
python3 generate_feed.py --generate-insights   # insights only
python3 generate_feed.py --generate-news       # news only
python3 generate_feed.py --generate            # all agents
```
After each, candidates auto-send to your Telegram.

---

## The Orchestrator: What It Does Today

The orchestrator gathers context and proposes a content plan. It does NOT yet trigger generation automatically (that's Phase 1.5).

### What it knows (the world-model)
- **Tournament calendar:** which tournaments are active today (from a hardcoded calendar in the code — currently incomplete; missing some grass-season events, see known limitations)
- **Match data:** did matches happen yesterday? Checks the Apify cache. Returns one of three states: confirmed (matches happened), confirmed-none (rest day), UNCONFIRMED (no data)
- **Published content:** what's already in content/feed/ and content/feed-candidates/ so it doesn't commission duplicates
- **Today's date and day of week**

### What it proposes
A plan with: what to generate (insights/news/recap/prediction), why, and what to skip. Each item has a one-line justification.

### The guardrails (deterministic — override the LLM)
- Never proposes a recap if matches are CONFIRMED zero
- Never proposes a prediction without a named match
- Caps the plan at 3 items
- Removes anything already published today

### Commands
```bash
python3 orchestrator.py --plan          # see the plan in terminal (free, no generation)
python3 orchestrator.py --plan-notify   # send plan to private Telegram (what cron runs)
python3 orchestrator.py                 # full interactive flow: plan → approve → generate
```

### Known limitations (current state)
1. **Incomplete tournament calendar:** the hardcoded calendar misses some grass-season events; it may not know Stuttgart/s-Hertogenbosch are active. Working on a full 2026 calendar.
2. **Unaware of sub-agent rules:** the orchestrator doesn't know insights switches to evergreen between tournaments, so it sometimes contradicts the agent's own logic.
3. **Plan has no Telegram buttons yet:** the 07:00 plan message is read-only text. You can't tap to approve it — generation is still triggered manually or by the 09:00 cron. Phase 1.5 will add ✅/❌ buttons to the plan message and trigger generation on tap.

---

## The Telegram Approval Flow (Phase 1 — complete)

### How candidates reach your phone
After any generation command completes, candidates are automatically sent to your **private** Telegram chat (MY_TELEGRAM_CHAT_ID) with three buttons:

```
[card image]
[card title + full body text]
[✅ Publish]  [📅 Later]  [🗑 Reject]
```

Cards with images use sendPhoto + a second message for the full body (Telegram photo captions are limited to 1024 chars). Text-only cards use a single sendMessage.

### What each button does

| Button | Immediate action | File system | RAG memory | Public channel |
|---|---|---|---|---|
| ✅ Publish | "✅ Published" replaces buttons | .md moves to content/feed/ | written as "published" | card posted |
| 📅 Later | "📅 Saved for later" replaces buttons | candidate stays in feed-candidates/ | nothing | nothing |
| 🗑 Reject | "🗑 Rejected" replaces buttons | candidate deleted | written as "rejected" | nothing |

### To resurface saved-for-later cards
```bash
python3 telegram_review.py --send-pending --include-saved
```
They reappear on your phone with buttons.

### The listener
```bash
python3 telegram_review.py --listen    # start
# Ctrl-C to stop
```
Must be running to process button taps. Uses Telegram's long-polling getUpdates — completely free. Leave it running all day; it uses negligible CPU.

### If you prefer the terminal
The terminal review flow still works exactly as before:
```bash
python3 generate_feed.py --review-insights
python3 generate_feed.py --review-news
```
If a card is approved via Telegram, it won't appear in terminal review (already published). If approved via terminal, the Telegram buttons become stale. Both paths call the same `publish_card()` function — output is identical.

---

## The Generation Agents (what each produces)

| Agent | Command | Output | Image | Auto-sends to Telegram |
|---|---|---|---|---|
| Insights | `--generate-insights` | 1-3 insight cards | gpt-image-1 generated at candidate creation | ✅ yes |
| News | `--generate-news` | 1-4 news cards | programmatic news tile generated at candidate creation | ✅ yes |
| Recap | `--generate-recap` | 1 recap card | programmatic clay/grass image | ✅ yes (when built) |
| Predictions | `--predict "P1 vs P2 Tournament Round"` | 1 prediction card | versus collage (photos) or gpt-image-1 | not yet |
| All agents | `--generate` | runs insights + news (+ recap if Apify available) | per above | ✅ yes |

**Recap note:** Apify (structured match data source) is blocked until June 29 (monthly credit reset). No recaps until Wimbledon starts.

---

## The RAG Memory System

Every published or rejected card is embedded (OpenAI text-embedding-3-small) and stored in `data/memory.json`. Before generating a new card, the agent checks semantic similarity against memory — cards above 0.82 cosine similarity are blocked as duplicates.

```bash
# inspect the store
python3 -c "
import json; d=json.load(open('data/memory.json'))
print(len(d), 'items')
for i in d: print(i['status'],'|',i['content_type'],'|',i['subject'])
"

# test semantic search
python3 memory.py --search "Zverev wins Roland Garros"

# backfill from existing published content
python3 memory.py
```

Dedup decisions logged to `logs/memory-dedup.log`.

---

## Publishing to the Website

Approving a card (via Telegram or terminal) moves the .md file to `~/tennismind-web/content/feed/`. The website is **static** — it only shows new cards after a Vercel deploy.

```bash
cd ~/tennismind-web
git add content/
git commit -m "Publish: [card title]"
git push        # triggers Vercel auto-deploy if configured
# OR
npx vercel --prod   # manual deploy
```

If Vercel auto-deploy is configured on git push, the site updates within ~1 minute of the push. If not, run `npx vercel --prod` manually.

---

## Image Generation

Images are generated at **candidate creation time** (not at review time), so the image exists before you approve it — you see the actual image on your phone before tapping ✅.

| Card type | Image strategy | Cost |
|---|---|---|
| Insights (history/stat/form) | gpt-image-1 via OpenAI | ~$0.02-0.04 per card |
| News | programmatic tile (Pillow) | free |
| Recap | programmatic clay/grass tile (Pillow) | free |
| Prediction | versus collage from photos/ folder, or gpt-image-1 | free / ~$0.04 |

If image generation fails, it logs the full traceback to `logs/image-generation.log` and prints a visible ⚠ warning. Cards with failed images are not sent to Telegram until the image is fixed.

To retrofit an image onto an already-published card:
```bash
python3 telegram_review.py --generate-image-for <slug>
```

---

## Key Files and Folders

```
match-analyst-bot/
├── generate_feed.py          the main agent file (all six agents)
├── orchestrator.py           the orchestrator (plan + delegate)
├── telegram_review.py        Telegram send + listener + publish_card()
├── memory.py                 RAG semantic memory (embeddings + search)
├── data/
│   ├── memory.json           the RAG vector store (flat file)
│   ├── tg-review-queue.json  tracks which candidates are sent/approved/rejected
│   ├── tg-plan-queue.json    tracks orchestrator plan status
│   └── apify-cache-{date}.json  daily Apify results cache
├── logs/
│   ├── orchestrator.log      orchestrator reasoning + plans
│   ├── orchestrator-cron.log cron job stdout (debug morning failures here)
│   ├── memory-dedup.log      every dedup decision (subject, score, kept/blocked)
│   ├── tg-review.log         every Telegram publish/reject action
│   └── image-generation.log  image errors with full tracebacks
└── evals/                    eval harness (recap quality + dedup precision/recall)

tennismind-web/
├── content/feed/             PUBLISHED cards (website reads these)
├── content/feed-candidates/  PENDING candidates (not yet on website)
├── public/feed/              card images (served by website)
└── docs/                     all strategy + solution design docs
```

---

## What's Coming Next (Phase 1.5)

The one remaining gap: the 07:00 plan message has no buttons. Generation is still triggered by cron or manually.

**Phase 1.5 will add:**
- ✅ Run Plan / ❌ Skip Today buttons on the plan message
- Tapping ✅ triggers generation automatically (listener runs it in background)
- Progress messages arrive on your phone: "⚙️ Generating insights... ⚙️ Generating news... ✅ Done — 5 cards sent"
- Cards arrive on phone 2-3 minutes after tapping ✅
- Terminal never opened

After Phase 1.5, the full daily flow is:
1. Open laptop lid (listener resumes)
2. See 07:00 plan on phone, tap ✅
3. Cards arrive, tap to publish
4. Done — terminal never touched

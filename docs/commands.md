# TennisMind — Command Cheat Sheet

Quick reference for daily operations. Keep this file at `~/tennismind-web/docs/commands.md`.

---

## 🚀 Daily Operations

### Remove a card
rm ~/tennismind-web/content/feed-candidates/recap/roland-garros-day-5-men-women.md

### Make a post manually
```bash
mv ~/tennismind-web/content/feed-candidates/news/players-stage-modified-media-boycott-at-roland-garros-over-prize-money.md ~/tennismind-web/content/feed/
```

### Publish a match analysis
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 publish_now.py "Sinner vs Zverev Madrid Open 2026 final clay"
```

### Create your own insight card
Tell Claude Code:
```
Create a feed card at ~/tennismind-web/content/feed-candidates/your-slug-here.md with:

---
type: "stat"
title: "Your title here"
date: "2026-05-13"
keyNumber: "the big number"
tags:
  - "Tag1"
  - "Tag2"
source: "Where you found it"
---

Your body text here. 2-3 sentences with context.
```

Then approve in terminal:
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 generate_feed.py --review
```

## 📰 News Agent

### Inspect the discovery queue
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 -c "
import json, orchestrator
q = orchestrator._load_queue()
pending = sorted([v for v in q.values() if v.get('status')=='pending'], key=lambda x: -x.get('score',0))
print(f'{len(pending)} pending / {len(q)} total')
for item in pending[:10]:
    print(f'  [{item[\"score\"]}] {item[\"headline\"][:70]}')
"
```
Queue file: `data/discovery_queue.json`

### Trigger a manual discovery sweep
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 orchestrator.py --discover
```
Runs RSS + Google News + Tavily, scores each story, and appends new items to `data/discovery_queue.json`. No Sonnet called. Safe to run at any time.

### Audit the discovery pool (no card generation)
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 generate_feed.py --discover-news
```
Shows every fresh story scored for significance — title, source (tavily / rss:bbc / rss:espn), score, pass/fail verdict, and scoring reasons. Also shows all date/relevance drops. Use to diagnose why a story is missing or to calibrate the significance threshold.
Logs: `logs/news-discovery.log` (raw discovery) and `logs/significance.log` (scores).

### News pipeline funnel report
```bash
python3 orchestrator.py --report
```
Prints a compact funnel for the last 48h: how many stories were discovered, how many dropped at each gate, how many entered the queue, and generation/review outcomes. Backed by `data/events.jsonl`.

Drill into any drop reason to see the actual items:
```bash
python3 orchestrator.py --report stale          # stories dropped by Gate 2: older than 48h
python3 orchestrator.py --report relevance      # stories dropped by Gate 1: not tennis content
python3 orchestrator.py --report significance   # stories dropped by Gate 3: significance score < 5
python3 orchestrator.py --report round-stale    # stories dropped by Gate 4: about a finished round
```

### Let the agent find news (manual run)
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 orchestrator.py --news
```
Reads pending items from the discovery queue and generates cards. Falls back to fresh discovery if queue is empty.
Review options: `y`=publish, `n`=delete permanently, `t`=save for later, `edit`=edit card.
Cards saved with `t` will appear again in the next `--review-news` run.

### Force a specific story through (editorial override)
```bash
python3 generate_feed.py --generate-news --force "Sabalenka"
python3 generate_feed.py --generate-news --force "Bellucci"
```
Matches any story in today's discovery pool whose title contains the substring (case-insensitive). The matched story is promoted past the significance gate AND the semantic pre-filter — it goes straight to Sonnet alongside whatever else passed normally. Use when the scorer underrated a story you want to publish.

What `--force` skips: significance threshold, semantic pre-filter (memory dedup).
What `--force` does NOT skip: 48h freshness gate, round-staleness gate. If the story isn't in today's pool, it won't be found — use `--discover-news` first to confirm it's there.

If the substring matches nothing: `⚠ --force 'Sabalenka' matched no below-threshold stories in today's pool.`

### Check news candidates
```bash
ls ~/tennismind-web/content/feed-candidates/news/
```

---

## 📊 Insights Agent

### Let the agent find insights
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 generate_feed.py --generate-insights
python3 generate_feed.py --review-insights
```
Review options: `y`=publish, `n`=delete permanently, `t`=save for later, `edit`=edit card.
Cards saved with `t` will appear again in the next `--review-insights` run.

### Check insight candidates
```bash
ls ~/tennismind-web/content/feed-candidates/insights/
```

---

## 📋 Recap Agent (during tournaments only)

### Generate daily tournament recap
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 generate_feed.py --generate-recap
python3 generate_feed.py --review-recap
```

### Check recap candidates
```bash
ls ~/tennismind-web/content/feed-candidates/recap/
```

### Publish a specific recap from backlog
```bash
python3 generate_feed.py --publish recap/rg-2026-day-3-recap.md
```

### Regenerate a recap image manually
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 -c "
from generate_feed import generate_recap_image
import os
path = os.path.expanduser('~/tennismind-web/public/feed/roland-garros-day-14-women-final.png')
generate_recap_image('14', 'Roland Garros', path)
print('Saved:', path)
"
```
Change the day number, tournament name, and output filename to match the card.

Only works during active tournaments. Produces one recap card per day covering men's and women's draws.
Runs automatically as part of the morning cron (--generate).

---

## 📱 Telegram Approval Flow

### Send pending candidates to Telegram for phone approval
```bash
cd ~/match-analyst-bot && source venv/bin/activate
python3 telegram_review.py --send-pending
# sends all unsent candidates with ✅ Publish / 📅 Later / 🗑 Reject buttons
# runs automatically after --generate-insights and --generate-news
```

### Re-send cards saved for later
```bash
python3 telegram_review.py --send-pending --include-saved
```

### Start the approval listener (must be running to process button taps)
```bash
python3 telegram_review.py --listen
# leave running in a terminal while reviewing from phone
# Ctrl-C to stop
```

### Retrofit a missing image onto an already-published card
```bash
python3 telegram_review.py --generate-image-for <slug>
# e.g. python3 telegram_review.py --generate-image-for halle-open-the-22000-person-town-hosting-an-atp-500
```

### Note: terminal review still works as before
```bash
python3 generate_feed.py --review-insights   # terminal flow unchanged
python3 generate_feed.py --review-news       # same
# If a card is approved via Telegram, it won't appear in terminal review (already published)
# If approved via terminal, the Telegram buttons become stale
```

---

## 🎬 Video Agent

### Discover official clips and send to Telegram for approval
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 generate_feed.py --generate-video
```
Searches YouTube for official match highlights from active tournaments (ATP Tour, WTA Tennis channels). Validates every clip against `data/video-sources-allowlist.json` — only official sources pass. Applies a stage-freshness gate: earlier in the week any stage is OK; by Day 4+ only QF/SF/Final clips are surfaced. Saves candidates to `content/feed-candidates/video/` and immediately sends them to Telegram with ✅/📅/🗑 buttons.

On ✅ Publish: card written to `content/feed/`, YouTube URL posted to the public Telegram channel (auto-embeds as a video preview).

### Check video candidates
```bash
ls ~/tennismind-web/content/feed-candidates/video/
```

### Edit the official sources allowlist
```bash
code ~/match-analyst-bot/data/video-sources-allowlist.json
```
Add a `"disabled": true` field to a source to temporarily exclude it. Each source has `title_signals` — distinctive strings that appear in official uploads but not fan reuploads. Add new signals when a tournament's naming convention changes.

### Stage-freshness thresholds (automatic)
| Days since tournament start | Min clip stage |
|---|---|
| Days 1–3 | Any (R1/R2 OK) |
| Day 4 | QF and above |
| Day 5+ | SF and above |

---

## 🤖 Orchestrator

### Morning cron (automatic)
Runs daily at 7 AM:
```
plan → guardrails → FYI to Telegram → generate directly → cards arrive in Telegram for approval
```
No button tap required. A plain FYI message arrives first ("Generating: news + insight"), then candidate cards follow with ✅/📅/🗑 buttons.

### Inspect today's plan (terminal only)
```bash
cd ~/match-analyst-bot
python3 orchestrator.py --plan
```
Gathers context (tournament state, Apify live-check if no local cache, recent published content), reasons with Sonnet, applies guardrails, prints the commissioning decision. No Telegram, no generation, no files written.

### Full daily run (reason → FYI → commission)
```bash
cd ~/match-analyst-bot
python3 orchestrator.py --run
```
Full orchestrator path: gather context → Sonnet reasoning → guardrails → FYI message to Telegram → delegate to agents. Generated cards arrive on Telegram with ✅/📅/🗑 buttons for card-level approval. No plan-approval step — you approve individual cards, not the generation decision.

---

## 📊 Eval Harness (measure AI output quality)

### Recap evals (existing)

#### Run full recap evals (deterministic + LLM judge)
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 evals/run_evals.py
```
Runs deterministic checks + Sonnet "harsh editor" judge on all recap test cases. Costs ~€0.10-0.15 per run (one Sonnet call per test case). Use after changing a prompt to see if quality scores moved.

#### Run quick recap evals (deterministic only — free)
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 evals/run_evals.py --quick
```
Deterministic checks only — length, sections, no markdown artifacts, no seed numbers, no fabricated players. Free and instant. Use for fast iteration.

#### What the recap scores mean
- **explains_why** (1-5): does it explain why results matter, not just what happened? Our core differentiator.
- **writing_quality** (1-5): engaging and tight, or generic and clichéd?
- **story_selection** (1-5): did it lead with the most newsworthy results?
- **hard_fail**: True if a recap fabricated a player or is missing a section — overrides any quality score.

#### Eval workflow
1. Note current baseline scores
2. Change a prompt
3. Re-run evals
4. Confirm the target dimension improved before shipping
5. Every run is logged to evals/eval_log.jsonl to track trends over time

Test cases live in `evals/test_cases/recaps/`. Add new recaps there to expand coverage. To add use 
```
cp ~/tennismind-web/content/feed/roland-garros-day-11-men-women.md ~/match-analyst-bot/evals/test_cases/recaps/
```

---

### News evals (`eval_news.py`)

#### Full report — Stage 1 (deterministic) + Stage 3 (LLM) per card + jsonl log
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 evals/eval_news.py --eval-news          # last 10 published cards
python3 evals/eval_news.py --eval-news --all    # all published cards
```
Costs ~€0.05-0.10 per run (one Sonnet call per card). Appends results to `evals/news_eval_log.jsonl` for trend tracking. Shows delta vs. previous run once a baseline exists.

#### Stage 1 — deterministic checks (free)
```bash
python3 evals/eval_news.py --stage1          # last 10 cards (any status)
python3 evals/eval_news.py --stage1 --all
```
Checks: freshness (date lag), length (≤80w), significance score match, fabrication (player name verification against rankings). No LLM cost.

#### Stage 2 — decision-history axis (free)
```bash
python3 evals/eval_news.py --stage2
```
Cross-references the significance scorer's pass/fail with your actual publish/reject decisions from the memory store. Computes agreement rate (TP/FP/FN/TN). Surfaces false positives (scorer said pass, you rejected) prominently. Only covers cards from June 13 onwards (when significance.log started).

#### Stage 3 — LLM judge (costs per card)
```bash
python3 evals/eval_news.py --stage3          # last 10 published cards
python3 evals/eval_news.py --stage3 --all
```
Sonnet rates each published card on:
- **explains_why** (1-5): does it explain WHY the result matters — stakes, draw implications, calendar significance?
- **why_groundedness** (1-5): is the "why" claim computable from body data, or a recalled historical stat?
- **reads_as_publication** (1-5): polished TennisMind copy, or generic sports aggregator?

#### What the news scores mean
- **explains_why** — our core differentiator. 3 = vague "confidence boost". 5 = concrete draw/ranking consequence named.
- **why_groundedness** — most important for accuracy. Score 1 = historical claim with no source. Score 5 = computable from stage/surface/schedule.
- **reads_as_publication** — currently the weakest axis (avg 3.0). Cliché closers ("timely confidence boost", "wide-open draw") are the main failure mode.
- Baseline (June 16, 2026, 10 cards): explains_why 3.7 · why_groundedness 3.3 · reads_as_pub 3.0 · overall 3.2
---

## 🧠 Semantic Memory (RAG)

### Backfill the memory store (seed from existing published content)
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 memory.py   # embeds published news + insights into data/memory.json
```

### Inspect what's in the store (human-readable, no embeddings)
```bash
python3 -c "
import json
data = json.load(open('data/memory.json'))
print('Total items:', len(data))
for item in data:
    print(item['status'], '|', item['content_type'], '|', item['subject'])
"
```

### Test semantic search
```bash
python3 memory.py --search "Zverev wins Roland Garros"
# prints top matches with similarity scores
```

### How it works in the pipeline
- Memory store: `data/memory.json` (flat file, OpenAI embeddings + hand-written cosine similarity)
- Before saving a generated news card: checked against memory; semantic near-duplicates (similarity > 0.82) are blocked
- On approve (review `y`): card added to memory as "published"
- On reject (review `n`): card added to memory as "rejected" — stays blocked permanently
- Dedup decisions logged to `logs/memory-dedup.log`

---

## 📊 Match Analysis Cards

### Generate match analysis cards (auto — runs after QF+ matches at GS/1000 events)
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 generate_feed.py --match-analysis
```
Checks for an active GS or Masters 1000 tournament. Fetches yesterday's QF+ completed matches from ESPN. For each match: scrapes WTA service stats + optional Flashscore Winners/UEs → validates consistency → LLM writes a qualitative interpretation → renders a PNG card via `matchStatsCard.ts` → saves to `feed-candidates/match-analysis/` → sends to Telegram for approval.

Skips automatically if:
- No eligible tournament is active (GS or 1000 only)
- No QF+ matches found for yesterday
- Stats page not reachable (logs and continues)

### Re-render a match analysis PNG manually
```bash
cd ~/tennismind-web
npx tsx scripts/render-match-stats-card.ts \
  --player1 "Linda Noskova" \
  --player2 "Marta Kostyuk" \
  --score "6-4, 6-4" \
  --tournament "Wimbledon" \
  --round "Semifinal" \
  --stats "Aces:6:2,Double Faults:3:5,1st Serve %:68%:61%,..." \
  --take "Short take text for the card image" \
  --out /tmp/test-card.png
```
Use this to tweak a card without re-running the full pipeline.

### Re-render from a published candidate file
```bash
cd ~/tennismind-web
# Read the image_url from the .md frontmatter, then:
npx tsx scripts/render-match-stats-card.ts --from-file ~/tennismind-web/content/feed-candidates/match-analysis/my-card.md
```

### Telegram approval + publish flow
1. `python3 telegram_review.py --listen` — must be running
2. Card arrives on phone with PNG image + "What the numbers say" caption
3. Tap ✅ → `_publish_match_analysis_telegram()` posts PNG to public Telegram channel; .md moves to `content/feed/`; PNG moves to `public/feed/`
4. **Important:** PNG must be committed to git for Vercel to serve it:
   ```bash
   cd ~/tennismind-web
   git add public/feed/my-card.png content/feed/my-card.md
   git commit -m "Publish match analysis: Noskova vs Kostyuk"
   git push
   ```

### After editing generate_feed.py — restart the listener
The listener (`telegram_review.py --listen`) caches `generate_feed` at import time. After editing `generate_feed.py`, stop the listener with `Ctrl-C` and restart it:
```bash
python3 telegram_review.py --listen
```

### View published analyses on the website
`/en/match-analysis` — shows all `type: "match-analysis"` cards with PNG + "What the numbers say" interpretation.

---

## 🔮 Match Predictions

### Generate a match prediction
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 generate_feed.py --predict "Djokovic vs Fonseca Roland Garros R3"
python3 generate_feed.py --review-predictions
```

### Check prediction candidates
```bash
ls ~/tennismind-web/content/feed-candidates/predictions/
```

Only for matches people are talking about — top 5 seeds, rising stars, rivalries. 1-2 per round during Grand Slams.

---

## 🆚 Versus Collages (Match Comparison images)

### Test a single collage
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 generate_collage.py --test
```

### Generate all collages
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 generate_collage.py
```

Setup:
- Drop player photos into `~/match-analyst-bot/photos/`
- Fill in the `MATCHES` list in `generate_collage.py` (left_name, right_name, left_photo, right_photo, tournament, output)
- Collages output to `~/match-analyst-bot/collages/`
- Uses duotone treatment so mismatched photos look cohesive
- Tournament colors switch automatically (Roland Garros, Wimbledon, US Open, Australian Open)

Per-match crop tweaks if a face is cut off:
add `"left_offset_y"` or `"right_offset_y"` to that match's dict to shift the crop.

---

## 🔄 Run Both Agents

### Generate both news and insights (same as cron)
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 generate_feed.py --generate
python3 generate_feed.py --review
```

---

### Predict a tournament draw
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 predict_draw.py --auto "Roland Garros 2026"
```

---

## 💡 Provocation Agent (article ideation)

Surfaces observable patterns from recent match data and hands you an open question to spark article ideas. Never writes the thesis — you form the take.

### On-demand: see all candidates with scores
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 generate_feed.py --provoke
```
Prints 3–5 provocation candidates to terminal, each with a score and scorer note. Use this when you want to dig deeper than the weekly send or explore all angles before writing.

### Manual send: run the quality gate and send the best to Telegram
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 generate_feed.py --provoke-send
```
Scores all candidates, picks the highest-scoring one that clears the quality bar (6/10), and sends it to your personal Telegram chat. If nothing clears the bar, logs the skip and sends nothing.

### Weekly cron (Monday 8 AM)
```
0 8 * * 1 cd /Users/dg/match-analyst-bot && /Users/dg/match-analyst-bot/venv/bin/python3 generate_feed.py --provoke-send >> logs/provocation-cron.log 2>&1
```
Fires only when the Mac is awake. Logs to `logs/provocation.log` (selection decision) and `logs/provocation-cron.log` (stdout).

### Output format (Telegram)
Each provocation has three parts:
- **THE PATTERN** — one factual statement of something observable in the data
- **THE DATA** — the actual matches/numbers behind it (verifiable)
- **THE QUESTION** — a genuinely open question, never a thesis

### Quality rules
- Threshold: 6/10 (min of data-specificity and question-openness scores)
- Auto-disqualified if: pattern contradicts its own data; pattern claims a historical anomaly without sourced history; question implies an answer
- Silence on a thin week is correct — no send is better than a weak send

---

## 🌐 Website

### Start local dev server
```bash
cd ~/tennismind-web
npm run dev
```
Opens at http://localhost:3000. Auto-refreshes on file changes.

### Stop local dev server
`Ctrl + C` in the terminal tab running it.

### Deploy to production
```bash
cd ~/tennismind-web
npx vercel --prod
```

### Test a specific racket page
```
http://localhost:3000/racket-finder/test/head-speed-mp
http://localhost:3000/racket-finder/test/babolat-pure-aero-2026
```

---

## 📦 Git

### Commit and push (website)
```bash
cd ~/tennismind-web
git add .
git commit -m "describe what changed"
git push
```

### Commit and push (bot)
```bash
cd ~/match-analyst-bot
git add .
git commit -m "describe what changed"
git push
```

### See recent commits
```bash
git log --oneline -10
```

### See what changed in last commit
```bash
git show HEAD
```

---

## 🔍 File Operations

### Find a file by name
```bash
find ~ -name "filename*" 2>/dev/null
```

### List files in a folder
```bash
ls ~/tennismind-web/content/analyses/
ls ~/tennismind-web/content/feed/
ls ~/tennismind-web/content/feed-candidates/
```

### Create a file in VS Code
```bash
code ~/tennismind-web/content/feed/new-file.md
```

---

## 🐛 Issue Logging

Tell Claude Code:
```
Document what just happened in docs/issue-log.md as Issue #XXX.
Follow the template format at the bottom of the file.
```

Then commit:
```bash
cd ~/tennismind-web
git add docs/issue-log.md
git commit -m "Log issue #XXX: short description"
git push
```

---

## ⏰ Cron Job

### Check if cron is set
```bash
crontab -l
```

### Check cron log
```bash
cat /tmp/feed-generate.log
```

### Edit cron schedule
```bash
crontab -e
```

---

## 🧰 Troubleshooting

### Website is down (localhost)
```bash
cd ~/tennismind-web
npm run dev
```

### Vercel deploy fails
```bash
cd ~/tennismind-web
npm run build
```
Fix whatever error shows, then `npx vercel --prod` again.

### API limit hit
Check at: https://console.anthropic.com/settings/limits
Request tier upgrade if needed.

### Browser shows old content
Hard refresh: `Cmd + Shift + R`

### Check API usage
https://console.anthropic.com/usage

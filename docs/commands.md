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

### Let the agent find news
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 generate_feed.py --generate-news
python3 generate_feed.py --review-news
```
Review options: `y`=publish, `n`=delete permanently, `t`=save for later, `edit`=edit card.
Cards saved with `t` will appear again in the next `--review-news` run.

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

Only works during active tournaments. Produces one recap card per day covering men's and women's draws.
Runs automatically as part of the morning cron (--generate).

---

## 📊 Eval Harness (measure AI output quality)

### Run full evals (deterministic + LLM judge)
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 evals/run_evals.py
```
Runs deterministic checks + Sonnet "harsh editor" judge on all recap test cases. Costs ~€0.10-0.15 per run (one Sonnet call per test case). Use after changing a prompt to see if quality scores moved.

### Run quick evals (deterministic only — free)
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 evals/run_evals.py --quick
```
Deterministic checks only — length, sections, no markdown artifacts, no seed numbers, no fabricated players. Free and instant. Use for fast iteration.

### What the scores mean
- **explains_why** (1-5): does it explain why results matter, not just what happened? Our core differentiator.
- **writing_quality** (1-5): engaging and tight, or generic and clichéd?
- **story_selection** (1-5): did it lead with the most newsworthy results?
- **hard_fail**: True if a recap fabricated a player or is missing a section — overrides any quality score.

### Eval workflow
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

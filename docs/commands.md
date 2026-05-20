# TennisMind — Command Cheat Sheet

Quick reference for daily operations. Keep this file at `~/tennismind-web/docs/commands.md`.

---

## 🚀 Daily Operations

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

### Let the agent find insights
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 generate_feed.py --generate
python3 generate_feed.py --review
```

### Predict a tournament draw
```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 predict_draw.py --auto "Roland Garros 2026"
```

---

## 🎨 Regenerate a Single Feed Image

Use this script to regenerate an image for any existing feed card.
Change type, title, body, tags, and filename to match the card.

```bash
cd ~/match-analyst-bot
source venv/bin/activate
python3 -c "
from generate_feed import _build_image_prompt
from openai import OpenAI
from dotenv import load_dotenv
import os, base64
from pathlib import Path
load_dotenv()

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

card = {
    'type': 'stat',                          # stat / gear / form / history / upset / news
    'title': 'Your card title here',
    'body': 'Your card body text here.',
    'tags': ['Tag1', 'Tag2']
}

prompt = _build_image_prompt(card)
if isinstance(prompt, list):
    prompt = ' '.join([p.text if hasattr(p, 'text') else str(p) for p in prompt])
prompt = str(prompt)

response = client.images.generate(model='gpt-image-1', prompt=prompt, n=1, size='1536x1024')
image_bytes = base64.b64decode(response.data[0].b64_json)
path = Path.home() / 'tennismind-web/public/feed/your-card-slug-here.png'
with open(path, 'wb') as f:
    f.write(image_bytes)
print('Done — saved to', path)
"
```

Check the result before deploying:
```bash
open ~/tennismind-web/public/feed/your-card-slug-here.png
```

If happy, deploy:
```bash
cd ~/tennismind-web
git add public/feed/
git commit -m "Regenerate image for [card name]"
npx vercel --prod
```

Note: each run generates a different image. Run multiple times if the first result is not good.

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

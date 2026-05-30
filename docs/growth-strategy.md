# TennisMind — Growth Strategy

**Last Updated:** May 28, 2026

---

## Current Metrics

| Metric | Value | Date |
|---|---|---|
| Telegram members | 53 | May 28, 2026 |
| Weekly website visitors | 25 | May 28, 2026 |
| Weekly page views | 83 | May 28, 2026 |
| Bounce rate | 36% | May 28, 2026 |

---

## Core Principle

Discovery is the bottleneck, not engagement. People who find TennisMind stay and explore (3.3 pages per visitor, 36% bounce rate). The problem is nobody knows we exist. All growth efforts focus on getting found.

---

## Platform Strategy

### Telegram (retention + daily habit)

**Role:** primary engagement channel. Where fans come back daily.

**Content:** all recaps, news, and insights auto-publish here via the pipeline.

**Growth lever:** every other platform drives people TO Telegram. Every post on Reddit, X, and LinkedIn ends with `t.me/tennismind`.

**Direct ask (post monthly):**
```
If you're enjoying TennisMind, share the channel with one tennis 
friend. That's it — just one. Link: https://t.me/tennismind
```

---

### Reddit (r/tennis — discovery + credibility)

**Role:** largest tennis community online (2.2M members). Primary discovery channel.

**Prerequisites:** need ~50 comment karma before posting. Build karma by commenting on match threads and answering gear questions WITHOUT linking to TennisMind.

**Content types:**

**Recaps (daily during Grand Slams):**
- Post type: Image post
- Upload the Day graphic as the image
- Title format: `Roland Garros Day X Recap — [most interesting result], [second most interesting]`
- Immediately comment on your own post with the full recap text
- Link at the bottom of the comment, subtle:

```
---
Daily recaps + tennis insights at [TennisMind](https://tennis-mind-six.vercel.app/en/news)
```

**Insights (2-3 per week, spaced out):**
- Post type: Image post with insight card graphic
- Title format: `TIL [the surprising fact]`
- End with a discussion question to spark comments:

```
Title: TIL 40% of ATP Top 100 players came from multi-sport backgrounds

[paste insight text]

What do you think — did playing other sports help your tennis?

Source + more insights: https://tennis-mind-six.vercel.app/en/feed
```

**Rules:**
- Never self-promote in titles
- Ratio: 3-4 genuine comments on other posts for every 1 promotional post
- Reddit hates spam — if every post links to your site, you'll get banned
- Best insights for Reddit: ones that spark debate or flatter the community
- Post recaps within 2 hours of each day's play ending

---

### X / Twitter (real-time engagement + visibility)

**Role:** real-time tennis conversation during matches. Good for visibility but low conversion to Telegram.

**Recaps (daily thread — 2 tweets):**

Tweet 1 (hook + image):
```
🏆 Roland Garros Day X

[Most dramatic result]. [Second hook]. [Third hook].

[attach Day graphic]
```

Tweet 2 (reply to your own tweet — creates a thread):
```
🇷🇸 Djokovic past Royer in four sets
🇧🇷 Fonseca came back from 2 sets down — five-set epic
🇪🇸 18-year-old Jodar wins again
🇺🇦 Qualifier stuns No. 2 Rybakina
🇵🇱 Swiatek cruises into R3

Daily recaps → tennis-mind-six.vercel.app/en/news
```

How to thread: post tweet 1, click on it, reply to YOUR OWN tweet with tweet 2.

**Insights (single tweet + image):**
```
65% of tennis fans hold a college degree or higher. 
55% earn over $100K annually.

That's why tennis attracts premium sponsors.

📊 More: tennis-mind-six.vercel.app/en/feed

[attach insight card image]
```

**Rules:**
- Always attach the image — 2-3x more engagement
- Use flag emojis for players 🇷🇸 🇧🇷 🇪🇸 🇺🇦 🇵🇱
- First tweet must hook — nobody clicks threads if tweet 1 is boring
- Keep each tweet under 280 characters
- Only hashtag: #RolandGarros during RG — don't overdo it
- Reply to other tennis accounts between matches — builds followers organically

---

### LinkedIn (professional audience + PM positioning)

**Role:** builds personal brand as AI PM. Secondary audience for tennis content.

**Content types:**

**Product updates (1-2 per month):**
- New feature launches
- What I learned building X
- Technical architecture posts

**Insight cards (1-2 per week):**
One-line intro + card text + image:
```
Today's TennisMind insight 🎾

[paste card text]

[attach image]

Daily tennis insights: https://t.me/tennismind
```

**Rules:**
- LinkedIn is for the AI/PM story, not daily tennis content
- Don't post recaps here — LinkedIn audience doesn't care about Day 4 results
- Do post insights that have a business/data angle (fan demographics, prize money economics)

---

### YouTube Comments (guerrilla discovery)

**Role:** piggyback on tennis influencer audiences. Don't create videos — comment on popular ones.

**Target channels:** The Tennis Podcast, Functional Tennis, Tennis TV, WTA, Andy Roddick clips, Essential Tennis, Gill Gross Tennis

**Comment strategy:**
- Comment within 2 hours of upload — early comments get pinned to top
- Add a stat or angle the video missed — not just "great video"
- 4 out of 5 comments: pure value, no mention of TennisMind
- 1 in 5 comments: soft mention — "we covered this in our daily RG recap — tennismind on Telegram"
- Never link directly to website — YouTube hides comments with links
- Reply to other people's comments too — YouTube promotes active commenters

---

## Daily Routine During Grand Slams (1h 15min total)

### Morning Block (9:00 - 9:30)

| Time | Action |
|---|---|
| 9:00 | Mac wakes up → cron runs --generate (recap + news + insights) |
| 9:05 | Review and approve cards in terminal: --review-recap, --review-news, --review-insights |
| 9:20 | Deploy: cd ~/tennismind-web && npx vercel --prod |
| 9:25 | Post Day recap to X (2-tweet thread with image) |
| 9:30 | Done. Close the laptop. |

### Midday Block (12:00 - 12:15)

| Time | Action |
|---|---|
| 12:00 | Open YouTube → find 2-3 tennis videos uploaded today |
| 12:05 | Comment on each with a genuine insight. No links. 1 in 5: soft mention of "tennismind on Telegram" |
| 12:15 | Done. |

### Evening Block (19:00 - 19:30)

| Time | Action |
|---|---|
| 19:00 | Cron runs --generate-news (evening news) |
| 19:05 | Review evening news: --review-news |
| 19:10 | Post 1 insight to X (single tweet + image) |
| 19:15 | Reddit: comment on 2-3 r/tennis match threads. If karma allows: post recap as image post |
| 19:25 | Deploy if new cards: npx vercel --prod |
| 19:30 | Done. |

### Weekly Tasks (pick one day each)

| Day | Task |
|---|---|
| Monday | Write Substack article about the weekend's biggest story |
| Tuesday | Post gear insight to r/tennisracquets |
| Wednesday | LinkedIn post (product/AI learning update) |
| Thursday | Generate 1-2 match predictions for upcoming matches |
| Friday | Review feed-candidates backlog, publish anything good |

### If you only have 30 minutes

Priority stack — do these and nothing else:

1. Review and publish recap (10 min)
2. Post recap to X (5 min)
3. Comment on 2 YouTube videos (10 min)
4. Comment on 2 r/tennis threads (5 min)

Never skip the recap + distribution. Everything else is bonus.

### What NOT to do

- Don't check X/Reddit between the blocks — it's a time sink
- Don't write more than one Substack article per week
- Don't manually create cards during the day — let agents work, review at scheduled times
- Don't deploy more than twice per day — morning and evening is enough

---

## Posting Rhythm Outside Tournaments

| Frequency | Action | Platform |
|---|---|---|
| Daily | 1 insight card | Telegram (auto) |
| 2-3x per week | Insight post | X (single tweet + image) |
| 2-3x per week | Comment on tennis videos | YouTube (value-first, soft mention 1 in 5) |
| 1-2x per week | Insight post | Reddit (when karma allows) |
| 1-2x per month | Product/AI learning post | LinkedIn |

---

## SEO (slow burn, compounds over time)

Every card published is a Google-indexed page. Over time, searches like "Roland Garros Day 3 recap" or "tennis fan demographics" can drive organic traffic.

Requirements (tell Claude Code):
- Every feed card page needs proper meta tags: title, description, og:title, og:image
- Each card has its own descriptive URL slug
- Consider one long-form article per Grand Slam ("Complete Roland Garros 2026 Preview") as SEO bait

---

## What NOT to do

- **Don't buy ads.** Conversion funnel isn't proven with 25 visitors.
- **Don't post on 10 platforms at once.** Pick 2-3 and do them well.
- **Don't chase follower counts.** 53 engaged members > 500 muted members.
- **Don't spam links.** Contribute value first, link second. Especially on Reddit.
- **Don't skip days during Grand Slams.** Consistency builds habit. Miss one day and the audience forgets you.

---

## Growth Targets

| Metric | Current | End of RG (Jun 8) | End of July |
|---|---|---|---|
| Telegram members | 53 | 80-100 | 150+ |
| Weekly website visitors | 25 | 100-150 | 200+ |
| Reddit karma | 1 | 50+ | 100+ |
| X followers | 0 | 30-50 | 100+ |
| Racket finder completions | unknown | 10-20 | 30+ |

---

## Template for Updating This Doc

After each Grand Slam or major growth experiment, update:
1. Current metrics table at the top
2. What worked / what didn't in a new "## Retrospective" section
3. Adjust posting rhythm based on what drove the most traffic
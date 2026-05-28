## Documentation Rules

When making changes to the project, ALWAYS update the relevant documentation:

1. If you change the publishing pipeline, agent behavior, or content flow in generate_feed.py:
   → Update docs/strategic-roadmap.md section 4.3 (Content Publishing Flow)

2. If you add new commands, flags, or change existing ones:
   → Update docs/commands.md with the new command syntax

3. If you fix a bug:
   → Add an entry to docs/issue-log.md using the template at the bottom of the file

4. If you make a strategic/architectural decision (new feature, split a pipeline, change a prompt strategy):
   → Add an entry to docs/product-decision-log.md using the template at the bottom of the file

5. If you change card statuses, approval flow, or lifecycle:
   → Update the Card Lifecycle State Machine in docs/strategic-roadmap.md section 4.3.1

NEVER say "done" without having saved the documentation changes. Verify by reading the file back after editing.

---

## Architecture Rules
- Two separate repos: match-analyst-bot (Python AI backend), tennismind-web (Next.js frontend)
- LLM for reasoning, database for facts — never trust LLM for specs, prices, or stats
- Three separate agents: insights (evergreen), news (daily), recap (tournament)
- Images: insights use gpt-image-1 (retro French poster), news use real photos, recaps use broadcast graphics
- All content stored as markdown with YAML frontmatter in content/feed/
- Card types: stat, gear, form, history, news, recap

## Naming Conventions
- Feed card files: slugified-title.md (e.g. roland-garros-clay-courts.md)
- Feed images: same slug as card file (e.g. roland-garros-clay-courts.png)
- Candidate folders: feed-candidates/insights/, feed-candidates/news/, feed-candidates/recap/
- Published folder: content/feed/ (all types together, filtered by type field)

## Quality Rules
- Never publish a stat without a specific number
- Never include match results without verifying the date
- Never use vague analysis ("creates a power vacuum") — always name specific players and implications
- Farewell matches are always the lead story in recaps
- Accuracy over completeness — exclude uncertain results rather than risk being wrong
- NEVER generate player names, scores, or match results from memory. If the data isn't in the search results or explicitly provided by the user, say "I don't have this information" rather than guessing.

---

@AGENTS.md

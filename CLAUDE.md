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

@AGENTS.md

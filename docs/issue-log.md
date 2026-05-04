# TennisMind — Issue Log

Tracking bugs, root causes, and fixes across both projects (match-analyst-bot and tennismind-web).

---

## Issue #001: Racket images returning 404 on the website

**Date:** May 4, 2026
**Project:** tennismind-web
**Severity:** High — core feature broken (racket recommendation page shows no image)
**Reporter:** Manual testing

### Symptoms

- Racket image placeholder showed alt text "Babolat Pure Aero 2026" instead of the actual image
- After converting .avif to .png and clearing cache, image still didn't load
- Direct URL `http://localhost:3000/rackets/pure-aero-2026.png` returned 404

### Investigation

1. **File exists?** Yes — `public/rackets/pure-aero-2026.png` confirmed on disk (2.4MB, 3024x3024)
2. **Image resized?** Yes — resized to 500x500 to reduce load time
3. **Other public files work?** Yes — `http://localhost:3000/next.svg` loaded fine
4. **Cache issue?** Partially — stale `.cache/racket-recommendations.json` had entries without `image_url`. Cache cleared, but image still 404.
5. **Key finding:** `http://localhost:3000/rackets/pure-aero-2026.png` returned 404, meaning the dev server wasn't serving the file at all despite it being in `/public/rackets/`

### Root Cause

`proxy.ts` (the i18n middleware) had a URL matcher that caught all paths except `/api`, `/_next/*`, and `/favicon.ico`. It did NOT exclude paths with file extensions.

When the browser requested `/rackets/pure-aero-2026.png`, the middleware intercepted it, treated "rackets" as a missing locale, and redirected to `/en/rackets/pure-aero-2026.png` — which doesn't exist as a Next.js route. Result: 404.

### Fix

Added `.*\\.[^/]+$` to the negative lookahead in `proxy.ts`. This regex matches any path ending with a file extension (a dot followed by non-slash characters), so all static assets in `/public/` now bypass the i18n proxy entirely.

### Lessons Learned

1. **i18n middleware must always exclude static assets.** Any middleware that rewrites URLs needs to explicitly skip file extensions (`.png`, `.jpg`, `.svg`, `.css`, `.js`, etc.). This is a common Next.js i18n pitfall.
2. **Test static file serving directly.** When images don't load, go to the direct URL (`localhost:3000/path/to/file.png`) before debugging component code. A 404 at the server level means the problem is routing, not React.
3. **Image format matters.** The original `.avif` file was 138KB but less universally supported. Converting to `.png` increased size to 2.4MB (at 3024x3024). Always resize images for web — 500px is plenty for a product card.
4. **Clear caches after schema changes.** The recommendation cache stored results without `image_url`. Old cache entries persisted even after the database was updated. Always clear `.cache/` after adding new fields.

---

## Template for New Issues

Copy this template for each new issue:

```
## Issue #XXX: [Short description]

**Date:** [Date]
**Project:** [match-analyst-bot / tennismind-web]
**Severity:** [Low / Medium / High / Critical]
**Reporter:** [How it was discovered — manual testing, user report, Claude Code]

### Symptoms

[What the user sees / what goes wrong]

### Investigation

[Steps taken to diagnose — numbered list]

### Root Cause

[Why it happened — the technical explanation]

### Fix

[What was changed to resolve it]

### Lessons Learned

[What to remember for next time — generalizable takeaways]
```
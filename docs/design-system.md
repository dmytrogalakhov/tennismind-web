# TennisMind Design System

The reference for how TennisMind looks and is built. If a decision isn't written here, it isn't a system yet — add it.

## Positioning

TennisMind is moving from a young, bright, synthwave identity (dark `#0a0015` with neon cyan/pink/purple) to a **mature, elegant, editorial** one aimed at an older, more discerning reader — the kind of audience golf media serves. The voice is intelligent and calm, not loud.

Three principles govern every choice below:

1. **Warm and earthy over dark and electric.** A sand canvas, not a near-black one. This single move does most of the work of looking "calm and grown-up."
2. **Restraint over saturation.** One structural colour (court green), one accent (clay) used rarely. Terracotta has a lower ceiling than a muted colour before it reads "loud" — so the discipline matters even more here than it would with, say, a purple.
3. **Serif over geometric sans.** A reading serif signals "editorial intelligence" louder than any colour. Sans is reserved for interface chrome.

Palette is inspired by Roland Garros' clay-and-green, tuned to be ours rather than a copy of their exact brand values. The strategic reason for this palette over a grass-court one: terracotta clay is uniquely, unmistakably tennis — no other sport owns it — whereas green is shared across half the sporting world. The accent colour and the sport's signature surface are the same colour, which gives the brand a coherence that's hard to manufacture.

---

## 1. Structure & grid

- **App Router**, locale-aware via the `[lang]` segment. Tokens live in `app/globals.css`; fonts are wired in the root `layout.tsx`.
- **Article pages** are a single centred reading column, max-width **720px**, with generous side margins. This is the heart of the site.
- **Listing / home pages** use a wider container, max-width **1080px**, holding a responsive card grid: `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem`.
- **Top navigation** is full-width and sticky, ~60px tall, court green. Logo left, links right.
- **Breakpoints** are Tailwind defaults (sm 640 / md 768 / lg 1024 / xl 1280). The nav collapses to a hamburger below `md`; the reading column goes full-width (with side padding) below `sm`.

Containers, in practice: wrap reading content in `max-w-[720px] mx-auto px-6`, listing grids in `max-w-[1080px] mx-auto px-6`.

## 2. Hierarchy

Article page, top to bottom — this order is fixed:

1. Top nav
2. Headline (H1)
3. Subhead / deck (one line)
4. Date
5. Hero image
6. Image credit (small, right-aligned)
7. Caption (bold)
8. Byline
9. Body
10. Related / footer

The emphasis ladder: **headline** (serif, green, bold) → **subhead** (serif italic, lighter) → **body** (serif, ink). Everything procedural — date, byline, credit — recedes into sans + muted so it never competes with the writing. One `<h1>` per page; in-article section breaks use `<h2>`/`<h3>`.

## 3. Color

| Token | Hex | Tailwind utility | Role |
|---|---|---|---|
| Court green | `#123A2A` | `green` | Primary. Nav, headlines, structure. |
| Green deep | `#0D2C20` | `green-deep` | Hovers, footer, pressed states. |
| Clay | `#C0512F` | `clay` | Accent. Links, rules — used sparingly. |
| Clay deep | `#9E4023` | `clay-deep` | Link hover. |
| Sand | `#F4ECDC` | `sand` | Page background — the default canvas. |
| Bisque | `#EADFC9` | `bisque` | Cards, raised surfaces. |
| Ink | `#241C15` | `ink` | Body text. |
| Muted | `#7A7167` | `muted` | Dates, bylines, captions, metadata. |
| Line | `#E0D4BE` | `line` | Hairline borders and dividers. |

Use as `bg-sand`, `text-ink`, `text-green`, `text-clay`, `border-line`, `rounded-card`, etc. (Tailwind v4 generates these from `@theme`.)

Rules:

- **Sand is the canvas.** Bisque is for surfaces that need to lift off it (cards). Never plain white.
- **Green is structure**, not decoration — nav, headlines, the wordmark.
- **Clay is rationed, and this is the load-bearing rule of the whole palette.** Target roughly twice per screen: links, the occasional rule or pull-quote accent. Terracotta on buttons, fills, and backgrounds is how this brand turns back into a loud sports app. The hero image (real clay-court photography) carries the warmth; the UI should not compete with it.
- **Never pure black or pure white.** Ink (`#241C15`) and sand (`#F4ECDC`) carry warmth that `#000`/`#fff` kill.
- **Contrast:** ink on sand, green on sand, and sand on green all clear WCAG AA. Clay on sand passes for body-size text; do not put clay text on bisque at small sizes (the contrast narrows).

**Dark variant (future):** a refined evening mode is possible — green-black background, warm off-white text, the same clay accent. Not built yet; design it as a deliberate second theme, not an inversion.

## 4. Typography

Two families, two jobs:

- **Newsreader** (serif) — headlines and article body. Italic is loaded for subheads and pull-quotes. `font-serif`.
- **Inter** (sans) — nav, labels, dates, bylines, buttons, all UI chrome. `font-sans`.

> If you want more distinctiveness in the UI later, swap Inter for a grotesque with more character (e.g. Hanken Grotesk) — the serif stays. For a more dramatic display face on headlines only, Fraunces is an option (and pairs especially well with terracotta). Keep Newsreader for body either way; it's tuned for on-screen reading.

Type scale:

| Role | Family | Size (desktop / mobile) | Weight | Line-height |
|---|---|---|---|---|
| Headline (H1) | Newsreader | 40 / 30px | 700 | 1.1 |
| Section (H2) | Newsreader | 26px | 700 | 1.2 |
| Sub-section (H3) | Newsreader | 20px | 700 | 1.25 |
| Subhead / deck | Newsreader *italic* | 20px | 400 | 1.4 |
| Lead paragraph | Newsreader | 21px | 400 | 1.7 |
| Body — card / list (`--text-body-card`) | Newsreader | 18px | 400 | 1.6 |
| Body — article (`--text-body-article`) | Newsreader | 19px | 400 | 1.7 |
| Caption | Newsreader | 14px | 700 | 1.4 |
| Nav links | Inter | 14px | 400/500 | 1 |
| Date / byline / credit | Inter | 13px | 400 | 1.4 |

Rules: sentence-case headlines (no Title Case, no ALL CAPS) — dates may use small uppercase with letter-spacing as the one exception. Keep reading measure to ~66–72 characters. Headlines get a hair of negative tracking (`-0.01em`); body gets none.

## 5. Spacing

Calm comes from whitespace, so spacing is generous and consistent.

- **Vertical rhythm** (between blocks), in `rem`: `0.5 · 0.75 · 1 · 1.5 · 2 · 3 · 4`. Paragraph gap 1rem; between major article blocks 2rem; between page sections 3rem.
- **Component-internal gaps**, in `px`: `8 · 12 · 16 · 24`.
- **Reading column padding:** `px-6` (24px) on mobile, widening to the centred 720px column on desktop.
- **Nav padding:** 14px vertical, 22px horizontal.
- **Cards:** 1.25rem internal padding, `gap: 1.5rem` between cards.

When in doubt, add space rather than remove it.

## 6. Components

- **Top nav** — court-green bar, sticky. Serif wordmark (`TennisMind`) left in sand; sans links right in dimmed sand (`#DDD0B8`). Collapses to a hamburger below `md`. Use the reversed lockup (`tennismind-lockup-reversed.svg`, cream) on the green nav; the standard green-disc lockup is for light/sand surfaces only.
- **News card (overlay)** — the ATP-style listing card: hero image (clay-court photography sings here) with a dark gradient rising from the bottom, headline in bold sand over the dark area. High-impact, image-led. Use for the home/feature grid.
- **News card (text)** — bisque surface, `rounded-card`, hairline border: small image or none, serif headline in green, sans date/byline beneath. Quieter; use for dense index lists.
- **News card (social image)** — 1200×630 green-field PNG for OG/social sharing. Rendered server-side from SVG via `lib/cards/newsCard.ts` (`renderNewsCard()`). Layout: deep-green (`--color-green`) background; double frame — thin clay outer (`--color-clay` at 55% opacity) + cream inner hairline (30% opacity); **category label: Inter 700, ~34px, `--color-clay`, uppercase, letter-spacing 4** — must load the bundled Inter Bold TTF (`assets/fonts/inter-700.ttf`); **headline: Newsreader 600 serif** (must load bundled `assets/fonts/newsreader-600.ttf`), cream, dynamic word-wrap up to 2 lines (font steps 58 → 52 → 46 px to fit); 3 px `--color-clay` rule under the headline; **dek: Newsreader 600 italic, ~28px, `#E7D8BE`, wraps to max 2 lines — never truncated with ellipsis** (font steps 28 → 25 px if needed; agent must target deks ≤110 chars); TennisMind lockup (clay ball icon + "TennisMind" in Newsreader 600 cream) bottom-left. Footer is lockup only — no URL until we have a custom domain. **Rule: card copy is human-written deks, never URL slugs or tag lists.** Display containers MUST use `object-fit: contain` — never `cover`.
- **Article header** — headline → italic deck → date, in that stack, above the hero.
- **Hero + credit + caption** — full-column image, `rounded-card`; credit in small muted sans, right-aligned, directly under; bold serif caption below that. This is where the clay warmth lives — let the photography carry the colour so the UI can stay quiet.
- **Inline link** — clay, underlined, 2px underline offset; hover to `clay-deep`. No other colour changes.
- **Pull-quote** — large serif, optionally with a left rule in clay (`border-radius: 0` on single-sided borders).
- **Buttons** — Primary = solid green, sand label. Secondary = clay outline (1.5px clay border, clay label; fills clay with sand label on hover). One primary per view. No underline on labels. Sans, never serif. Component: `app/components/Button.tsx`, props `variant="primary"|"secondary"`, `size="default"|"lg"`, `href` for link buttons.
- **Tag / badge** — bisque fill, green text, small sans, pill radius.
- **Footer** — `green-deep` background, sand/muted text, links and channels (Substack, Telegram).

---

## Implementation notes

- **Tokens:** `app/globals.css` (`@theme`). Add new tokens there, not as ad-hoc hex values in components.
- **Fonts:** `layout.tsx` loads Newsreader + Inter via `next/font/google` and exposes `--font-newsreader` / `--font-inter` — unchanged from any palette. If the `<html>` element lives in `app/[lang]/layout.tsx`, put the font-variable `className` and `lang={lang}` there. Remove the old Geist setup.
- **Accessibility:** maintain AA contrast (see Color), visible focus rings, semantic heading order, alt text on every hero.
- **Voice:** how the *words* read is documented separately in the `tennismind-voice` skill. This file governs how the page looks; that one governs how it sounds. They should agree — both are calm, confident, and lead with the point.
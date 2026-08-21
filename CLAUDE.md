# Bounty — private gift stash

Local-first PWA: a just-for-me stash of gift ideas, three levels deep — people → ideas → sub-ideas. Capture-first (type an idea, tap a name, done), one status (bought), instant in-memory search. No AI, no reminders, no dates, no budgets, no sharing.

## Stack
Vite + React + TypeScript · Dexie (IndexedDB) · vite-plugin-pwa · encrypted sync to a private GitHub gist (AES-256-GCM, passphrase-derived key). Third app in the personal OS suite, alongside Helm and Anchor.

## Where things live
- `src/db.ts` — schema (soft deletes via `deleted` tombstones; every record has `updatedAt` for LWW merge) plus the cascade helpers and link normalising
- `src/sync.ts` — gist sync + auto-sync hooks. **Bounty's own gist** (`bounty-data.enc.json`) — never shared storage with Anchor or Helm. A device with no gist ID calls `findGist()` to adopt the existing one before falling back to creating a new one; without that, device 2 forks its own gist and the two drift silently (Anchor has three gists from exactly this). Only data syncs — token/passphrase/gist id are per-device and never ride in the blob
- `src/crypto.ts` — AES-256-GCM + PBKDF2, identical to Anchor's
- `src/pages/` — Home (capture + people + search), PersonPage, IdeaPage, Settings
- `src/components/` — EditableText, EditableNotes, ConfirmDelete, IdeaRow
- `docs/` — Helm design language (the shared system) + Bounty's own brief

## The model
- **Person** — a name, free-text notes, and a manual `order`. Lightweight containers, ~10 of them, a few heavily trafficked.
- **Idea** — a title, and *everything else optional*: notes, links, price. Capture must never require details.
- **Sub-ideas** — `parentId` nests candidates under a category ("wireless headphones" → three specific pairs). **One level only**; a sub-idea's detail page has no versions card.
- **`bought`** is the only status. Bought ideas drop into the collapsed history under their person. Marking a sub-idea bought does **not** bought its parent — the category stays live until you say otherwise.
- Live counts on the home screen count **every** live idea for a person, candidates included.
- A category has no price of its own, so its row shows the **range across its live candidates** (`$249–328`, `.meta.price.rolled`), a shade dimmer than a real price.
- **One-field capture.** `parseCapture()` (`src/capture.ts`) lifts a pasted link and a currency-marked amount out of what you typed — `sony xm5 https://… $328` files all three. A bare number stays in the title (`200 piece puzzle`); only `$`/`£`/`€`/`¥` amounts count. The flash reports what was lifted, so it is never silent. Same helper backs the person page's add field.

## Conventions
- **Design language is Helm** (see `docs/helm-design-language.md`); Bounty's palette is "ember" (chocolate-coffee neutrals + muted copper) — deliberately distinct from Helm's green/mint and Anchor's indigo/brass. Mono micro-labels, hairlines, glyphs not icons, lowercase microcopy, inline 2-step confirms, no modals/toasts.
- **Lists navigate, detail pages edit.** Tapping a title in a list opens it; tap-to-edit lives on the detail page. Never both on one element.
- **This is an n=1 app: optimize for efficiency, not for legibility to a stranger.** No explanatory microcopy teaching the user what a feature does. Empty states are one short fragment.
- **No bottom nav** — one section, a three-level drill-down. `--nav-h: 0px`. Navigation is the wordmark (home), `←` crumbs, and `⚙`.
- The wordmark word links home; the `▾` beside it opens the AppSwitcher (`label=""` renders the trigger as caret-only).
- Price is **free text**, not a number — "$40-ish" and "£25" both have to capture.
- Glyphs: `◇/◆` bought · `⌕` search · `＋` add · `×` remove · `↑↓` reorder · `▾` collapse · `⚙` settings · `↻` sync. The link mark is the one exception: `LinkGlyph.tsx`, an inline hairline SVG, because no chain-link codepoint inherits `currentColor` (see the design brief). It is a live link straight to the idea's first url.
- Prices are stored verbatim; `displayPrice()` adds a `$` to a bare amount at render time only, so `£25` and `free` pass through untouched.

## Dev / deploy
- `npm run dev` (port 5210) · `npm run build` must pass before commit
- Push to `main` deploys via GitHub Actions to https://wtnelson1.github.io/bounty/ (Pages source = GitHub Actions; workflow sets `BASE_PATH`)
- Verify deploys: `gh run list --limit 1`

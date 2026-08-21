# Design brief — the "Bounty" aesthetic (ember)

Sibling of `helm-design-language.md` and Anchor's `anchor-design-language.md`.
Bounty **inherits the Helm design language wholesale** — read that file first;
everything there applies unless overridden here. This document records only
what Bounty changes (its identity) and what it adds. Together the three files
define the shared "personal OS" visual system: same structure and feel,
distinct colour identity per app.

---

## Intent

Same calm, quietly technical instrument as its siblings — but this one holds a
stash of gift ideas for the people you like, so it leans warmest of the three.
A dim room with a copper lamp in it: a glowing treasure chest, muted. Helm is a
terminal, Anchor is a lamp on dark water, Bounty is the drawer you keep good
things in.

Bounty is explicitly **n=1 software**. It is not trying to be intuitive to a
stranger; it is trying to be fast for one person who already knows how it
works. That single fact drives most of its deviations: no explanatory
microcopy, no onboarding, no teaching empty states, no nav bar for a single
section. Everything the user already knows is screen space taken from the
ideas.

The one thing it optimizes above all is **capture**. An idea arrives in the
middle of a conversation and has about four seconds to get written down. Type
it, tap a name, it's saved — two taps, no details required, no screen change.

## Palette — the identity

Dark only. Chocolate-coffee neutrals (never green-tinted like Helm, never
indigo-tinted like Anchor, never pure gray), one muted copper accent, the same
soft salmon danger.

```css
:root {
  --bg:          #1a110e;  /* page — umber-black */
  --bg-elev:     #241813;  /* cards, panels */
  --bg-elev-2:   #30211a;  /* inputs, hover fills, nested surfaces */
  --line:        #513528;  /* stronger hairline / hover border */
  --line-soft:   #35231b;  /* default hairline, dividers */
  --text:        #f2e7e0;  /* primary ink */
  --text-dim:    #c1a496;  /* secondary ink */
  --text-mute:   #8d7264;  /* labels, meta, placeholders */
  --accent:      #d08a5a;  /* muted copper — the ONLY "look here" colour */
  --accent-soft: #9a603a;  /* accent borders / quieter accent */
  --accent-glow: rgba(208, 138, 90, 0.45);
  --danger:      #e88a7a;  /* soft salmon — shared with Helm and Anchor */
}
```

Depth layer, same recipe as its siblings with the hue swapped: two copper
radial glows in the top corners (`rgba(208,138,90,.05)` and `.035`), 3% film
grain (`grain grain-chroma` on `<body>`), and the floating-matrix canvas with
`accent: [208, 138, 90]`, `count: 48` — mobile-first, same as Anchor. The mesh
reads as embers rather than constellations.

**Suite rule:** every app in the personal OS keeps Helm's *language* and owns
its *palette*. Helm = green/mint. Anchor = indigo/brass. Bounty = ember/copper,
the third hue family the earlier briefs left open. The app switcher shows each
app's name beside a dot in its accent colour — the palette *is* the wayfinding.

**The one palette hazard.** In a warm app the shared salmon danger sits much
closer to the accent than it does in Helm or Anchor. The rule that keeps them
apart: **never put an accent-coloured control adjacent to a danger control at
rest.** Destructive controls live at `--text-mute` and only turn salmon on
hover or once armed, so the two colours are never both lit in the same row.

## Typography, surfaces, iconography, interactions, motion, voice
**Identical to Helm.** Geist Sans for content, Geist Mono for machinery, 10px
mono uppercase micro-labels with 0.22em tracking, 8px-radius cards with 1px
hairlines, no shadows / gradients / modals / toasts / icon libraries, inline
2-step `[sure?] [×]` confirms, lowercase dry microcopy with middle-dots. Fonts
are bundled via `@fontsource/*` so the PWA works offline.

Bounty's additions to the glyph vocabulary: `◇ / ◆` **bought** (the one status
— an empty diamond that fills) · `↑ ↓` manual reorder.

**The link mark is the one drawn exception.** Every chain-link codepoint fails
here: `⛓` garbles in whatever fallback font catches it, `🔗` is an emoji, and
`⚭` is really a marriage symbol. Decisively, none of them inherit
`currentColor` — greyscaling the emoji tames its colour but leaves it sitting
grey while the row around it takes the ember ink and the copper hover. So the
mark is drawn: two overlapping pills on a 45°, one hairline stroke,
`stroke="currentColor"`. That is not an icon library — it is one shape, in the
same stroke idiom as the app icon, and the no-icon-library rule stands.
Reach for this only when a mark must follow the palette and no character can.
`⌕` search and `＋ × ▾ ⚙ ↻` carry over unchanged. No `✦` — Bounty has no AI and
never will.

## Patterns Bounty adds

- **Capture-first home.** The first card on the home screen is a text field and
  a row of person chips. Type, tap a name, saved — the field clears, keeps
  focus, and a `✓ mum` flash replaces the toast for ~2s. The person chips only
  light accent once there is text to file, so the primary colour marks the
  action that is actually available.
- **No bottom nav.** One section and a three-level drill-down doesn't earn a
  bar; two cells would read as broken. `--nav-h: 0px`, and navigation is the
  wordmark (home), a mono `←` crumb per level, and `⚙`.
- **Split wordmark.** The word links home, the `▾` beside it opens the
  AppSwitcher — `<AppSwitcher label="" />` renders the trigger as a caret only,
  so the kit's dropdown keeps working without swallowing the home link.
- **Lists navigate, detail pages edit.** A title in a list is a link; the same
  title on its own page is tap-to-edit. One element never does both — that
  ambiguity is what makes tap-to-edit lists feel unpredictable.
- **Optional-everything detail.** Title is the only required field. Notes,
  links and price each render as a quiet mono `＋ notes` / `＋ link` / `＋ price`
  affordance when empty and as content when filled — the empty and filled
  states are the same element, so nothing is ever "missing".
- **One status, and it's history.** `bought` is not "done" — bought things
  aren't struck through, they drop into a collapsed `BOUGHT · n` block under
  their person: a lightweight record of what you gave whom, out of the way of
  the live list. Marking a candidate bought never bought its parent category.
- **Manual people order.** `↑ ↓` on every person row swaps `order` with a
  neighbour, so the two or three people you actually shop for stay on top.
  Ideas within a person are newest-first and not reorderable — recency is the
  right order there and a second ordering system would be one too many.
- **Instant search over everything.** `⌕` in the people card header swaps the
  list for a type-ahead across people, their notes, ideas, sub-ideas and idea
  notes. Results carry their context (`mum · wireless headphones`) and link
  straight to the thing. In-memory, sub-frame, never touches the network.

## Anti-patterns (Bounty-specific, on top of Helm's list)

Green- or indigo-tinted grays (those are the siblings) · explanatory microcopy
that teaches a feature to someone who built it · an accent control sitting
beside a danger control at rest · a required field anywhere in the capture path
· dates, reminders, budgets or totals (all deliberately absent) · anything that
sends the stash somewhere — no AI, no sharing, no export-to-anyone · a second
nesting level under a sub-idea · strike-through on bought items (it's a
record, not a completed chore).

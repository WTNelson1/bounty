# bounty

A private stash of gift ideas — people → ideas → sub-ideas, capture-first, local-first.

Third app in the personal OS suite, alongside [helm](https://helm-blush.vercel.app) and [anchor](https://wtnelson1.github.io/Session-Notes/). Same design language, its own palette (ember/copper).

**Live:** https://wtnelson1.github.io/bounty/

- Type an idea, tap a name — two taps, no details required
- Ideas nest one level: a category ("wireless headphones") with candidate versions under it
- One status: bought. Bought things drop into a collapsed history under their person
- Instant in-memory search across people, ideas, sub-ideas and notes
- Everything lives in IndexedDB; multi-device sync is AES-256-GCM encrypted into your own private gist

No AI, no reminders, no dates, no budgets, no sharing.

```bash
npm install
npm run dev
```

See `CLAUDE.md` for architecture and `docs/` for the design briefs.

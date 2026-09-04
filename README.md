# CRITTDOKU

A two-player competitive sudoku variant with collectible critters. There is no
predetermined solution - a digit is legal as long as it doesn't repeat in its
row, column, or 3x3 box. Players alternate placing digits on a shared grid;
whoever holds the most cells in a row, column, or box takes it, and most
regions wins.

Your nine critters are bound to the digits 1-9. They carry passives (hold
ground, sleep then pounce, store energy, lay mines, deny locks) and abilities
you spend energy on (hop a cell, place twice, wild placement, remove a
contested digit). Energy is shared between the draft and the match, so
rerolling the draft pool costs you ability plays later.

## Play

- **Play a Bot** - four difficulties (Chill / Keen / Sharp / Fierce)
- **Local 2-Player** - pass one device, best of two
- **Play a Friend** - share a room code, peer-to-peer over WebRTC (no server)
- **Quick Match / Ranked** - queue online; falls back to a disguised bot if
  nobody's around. Ranked has a 9-tier RP ladder.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine + creature tests
npm run sim        # self-play simulation matrix
npm run build      # static site -> dist/
```

## Accounts (optional)

With a free Supabase project the game gets real email/password accounts and
the profile (name, avatar, rank, match history) syncs across devices. Without
one it all still works, saved in the browser. Setup: **[SUPABASE.md](SUPABASE.md)**.

## Deploy

It's a static build - any static host works (Netlify, Vercel, Cloudflare
Pages, GitHub Pages). Step-by-step: **[DEPLOY.md](DEPLOY.md)**.

## Layout

```
src/engine/   rules engine + creature registry + draft, tests alongside
src/sim/      self-play simulator + deadlock diagnostic
src/ui/       React UI (Vite): pool draft, play, profile, queues
src/net/      WebRTC peer link + Supabase client + cloud profile sync
sim-results/  generated simulation reports
```

Design history and per-milestone findings: **[FINDINGS.md](FINDINGS.md)**.

## Engine API sketch

```ts
import { createGame, applyAction, autoDraft } from "./src/engine";

const { loadouts } = autoDraft(9, rng);
const s = createGame({ rules: { endScoring: "majority" }, loadouts, seeds });

applyAction(s, { type: "place", cell: 0, digit: 5 }); // throws if illegal
applyAction(s, { type: "move", from: 0, to: 1 });     // a Drift hop
s.score;   // [p0, p1] regions held
s.status;  // "playing" | "ended"
```

# PACT — Gods of the Dark Hour

A horror survivor-like for phones. One thumb, four-minute runs, no tutorial.

You are a damned soul possessing history's most dangerous people — Tesla, Napoleon,
Rasputin, Báthory — and dragging them into a four-minute window where the dead come
for you. Three times a run, a Dark God offers you a **Pact**: large power now, paid
for in **Dread**. Dread only ever rises. As it climbs the colour drains out of the
world, the vignette closes, whispers layer under the music, and enemies speed up.
At 100 Dread the god you bargained with **spawns and hunts you** for the rest of the run.

The design document lives at [`../docs/GAME_DESIGN.md`](../docs/GAME_DESIGN.md).

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # icons + typecheck + production build into dist/
npm run preview    # serve dist/ on the LAN so you can open it on a phone
```

`npm run build` emits a **single self-contained `dist/index.html`** (~78 KB) plus a
web-app manifest, a service worker and three icons. There are no external assets:
all art is drawn procedurally to a canvas and all audio is synthesised in WebAudio
at runtime.

### On a phone

Serve `dist/` over the network (`npm run preview` prints a LAN URL), open it in
mobile Safari or Chrome, and use *Add to Home Screen*. The manifest declares
fullscreen portrait, so it launches without browser chrome and runs offline after
the first load.

### As a native app

The build is a self-contained web app, so wrapping it needs no code changes:

```bash
npm i -D @capacitor/cli @capacitor/core @capacitor/ios @capacitor/android
npx cap init PACT com.yourstudio.pact --web-dir=dist
npx cap add ios && npx cap add android
npm run build && npx cap sync
npx cap open android    # or ios
```

That step needs Android Studio / Xcode locally, so it is left to whoever ships it.

## How it is put together

TypeScript + Canvas2D with a hand-rolled game loop, built by Vite. No engine: a
bullet-heaven is an object-pooling and draw-batching problem, not a scene-graph
one, so an engine would add weight and startup time without touching the actual
bottleneck.

```
src/
  core/       loop primitives — seeded rng, floating-stick input, save, math
  sim/        entities + spatial hash, spawn director, weapons, the Run itself
  systems/    dread bands, the Hunter behaviours
  content/    vessels, gods, enemies, cards, altar, daily modifiers  ← pure data
  render/     renderer, particle pool
  audio/      procedural synthesis
  ui/         DOM overlays for every full-screen modal
```

Everything tunable lives in `src/content/` as plain data tables, so balance changes
never touch logic.

A few decisions worth knowing about:

- **Dread's colour drain is a CSS `filter` on the canvas element**, not per-pixel
  work — it costs nothing and is the game's whole visual identity.
- **Enemies are batched into three-ish fill calls**: one `Path2D` for every body,
  one per rim colour, one per eye colour. Bodies use precomputed irregular blob
  outlines because perfect circles read as bubbles rather than as bodies.
- **Live enemies are capped at 620.** A spawn-doubling pact against a build that
  cannot keep up would otherwise saturate the pool and the frame budget with it.
- **Anubis' `scales` has an active half and an on-kill half.** On-kill alone cannot
  get the first kill, which left him unable to open a fight at all.
- `window.__pact` exposes `run`, `warp(seconds)` and `start()` for QA. Scores are
  local-only, so there is nothing to protect by hiding it.

## What is in, what is not

**In:** the full run loop, Dread and its five bands, all six gods with two pacts
each, all six Hunter behaviours, eight vessels with distinct signature weapons,
eight enemy archetypes, the boss, the Altar of Bones meta, vessel unlocks, the
daily Nightmare rotation with six modifiers, procedural audio, PWA packaging.

**Not yet:** relics, the Grimoire season pass, and the ad/IAP integrations — all
M3/M4 in the design doc. Nothing in the current architecture blocks them; the
monetisation hooks in particular are deliberately absent rather than stubbed.

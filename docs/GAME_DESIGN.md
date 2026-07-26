# PACT — Gods of the Dark Hour

**Working title:** PACT
**Genre:** Horror survivor-like (bullet-heaven roguelite) with hybrid-casual meta
**Platform:** Mobile-first (iOS / Android), portrait, one thumb
**Session length:** 3–4 minute runs
**Status:** Design proposal — not yet implemented

---

## 1. Why this game, right now

Research into the 2026 mobile market points at one specific opening. Four signals, all pointing the same direction:

| Signal | What the data says | What it means for us |
|---|---|---|
| **Hybrid-casual is the only casual segment still growing** | IAP up ~20% YoY to $4.2B; top 10 titles posting 67–100% YoY IAP growth. Hypercasual downloads are huge but monetization is flat. | Build a casual *core* with a mid-core *meta*. Not pure hypercasual. |
| **Survivor-likes are proven on phones** | The Vampire Survivors / Survivor.io / Archero lineage is now a stable, high-revenue mobile category. Auto-attack + one-thumb movement suits touch better than almost anything. | Use this as the core loop. It is a solved control problem — no tutorial needed. |
| **Horror over-performs on engagement** | On Roblox alone, ~500 active horror games, 200K+ combined DCU, and the best creator/UA efficiency of any category. Horror is mostly mobile-played and mostly young. | Horror is the cheapest organic-reach skin we can wear. It is also nearly *absent* from the survivor-like category — everyone else is anime or cartoon. |
| **2–5 min sessions win retention** | Snackable runs drive session frequency; meta must appear within the first 3–5 sessions. Benchmarks: D1 35–45%, D7 ~20%, D30 ~10%. | 3–4 min runs. Meta unlocks in session 1. |

**The gap:** survivor-likes are saturated but visually identical. Horror is high-engagement but mechanically shallow (mostly walking simulators and jumpscare hallways). Nobody has shipped a horror survivor-like where **the horror is a mechanic, not a paint job.**

That mechanic is the Pact.

---

## 2. The hook — in one paragraph

You are a nameless damned soul. You cannot act on your own, so you **possess the bodies of history's most dangerous people** — Tesla, Napoleon, Rasputin, Báthory — and drag them into the Dark Hour, a 4-minute window where the dead come for you. You survive by killing. But you can also survive faster by **making a Pact with a Dark God**: enormous power, right now, in exchange for **Dread**. Dread makes the game more powerful *and* more horrifying — the screen desaturates, your vision narrows, whispers layer in, enemies get faster. Let Dread hit 100 and **the god you bargained with steps onto the field and hunts you personally** for the rest of the run.

Every run is the same question: *how much of yourself do you sell to see the end of it?*

---

## 3. Core loop (the 3–4 minutes)

```
  Tap Play  →  Run starts  →  Auto-attack, one-thumb move
                    ↓
              Kill → XP gems → Level up → Pick 1 of 3 cards
                    ↓
        0:60 / 2:00 / 3:00 → PACT OFFER (accept / refuse)
                    ↓
              Dread rises → world degrades → HUNTER may spawn
                    ↓
              4:00 → Final Boss (30s) → Extract
                    ↓
      Rewards → Meta upgrade (always something) → Tap Play
```

**Controls:** one thumb, anywhere on screen. Floating virtual stick. Attacks are fully automatic. There is no second input. No tutorial screen — the first 8 seconds are a scripted safe pocket with a "drag to move" prompt, and that is the whole onboarding.

**Run structure:**

| Time | Beat |
|---|---|
| 0:00–0:20 | Safe. Trivial enemies. Player learns the stick. First level-up at ~0:15 (guaranteed). |
| 0:20–1:00 | Density ramps. First elite at 0:45. |
| **1:00** | **Pact Offer I** |
| 1:00–2:00 | Two enemy archetypes mix. First "swarm wall" event. |
| **2:00** | **Pact Offer II** (stronger boon, steeper Dread) |
| 2:00–3:00 | Elites in pairs. Treasure coffin spawns (rewarded-ad double). |
| **3:00** | **Pact Offer III** (the greedy one) |
| 3:00–3:40 | Peak density. Hunter is usually active by now. |
| 3:40–4:10 | Boss. Kill it or die. |

Death is not punishing: you keep everything you earned. Refusing every Pact is a *valid, winnable* line — it is just slower and gives worse loot. That is the tuning knob the whole economy hangs on.

---

## 4. The Dread system (the differentiator)

Dread is a 0–100 meter. It only goes up.

**Sources:** accepting a Pact (+20 to +45), certain cards, dying enemies near you at high combo, standing in shadow.

**Effects, banded:**

| Dread | Mechanical | Sensory (this is the horror) |
|---|---|---|
| 0–24 | — | Normal. Cold blue palette. |
| 25–49 | Enemies +10% speed | Colour drains ~40%. Faint whispering under the music. Occasional 1-frame silhouette at screen edge. |
| 50–74 | Enemies +20% speed, +1 elite per wave | Vignette closes in. Heartbeat replaces the drum track. Your own character sprite starts twitching between frames. |
| 75–99 | Enemies +30% speed, elites gain a second attack | Near-monochrome. Screen breathes (subtle scale pulse). Whispers become your vessel's name. |
| **100** | **HUNTER SPAWNS** | Music cuts to silence for 1.5s. Then the god's theme. It is faster than you, it never stops, and it cannot be killed — only outrun until extraction. |

**Why this works as addiction design:**
- It is a **push-your-luck** loop with a visible, escalating threat — the strongest known driver of "one more run."
- It makes the horror **earned by the player's own greed**, which is far more effective than scripted jumpscares and costs almost nothing in art budget.
- It gives every run a **story to tell** ("I hit 98 Dread with Tesla and still extracted") — that is shareable, and shareability is free UA.
- It is **legible in 10 seconds**, which the hybrid-casual playbook demands.

---

## 5. Cast

### Vessels (playable — historical figures)

Each has one signature auto-weapon and one passive. Deliberately small kits.

| Vessel | Signature weapon | Passive | Unlock |
|---|---|---|---|
| **Nikola Tesla** | *Arc Coil* — lightning chains to 3 nearby enemies | Gains attack speed while not taking damage | Starter |
| **Napoleon Bonaparte** | *Grande Armée* — 3 ghost grenadiers orbit you and fire outward | Every 30s, summons a 4th for 10s | Session 2 (free) |
| **Grigori Rasputin** | *Unkillable* — melee scythe of blood | Revives once per run at 30% HP; leaves a cursed pool | Meta unlock |
| **Elizabeth Báthory** | *Crimson Bath* — damage aura around you | Kills heal 1% max HP | Meta unlock |
| **Anubis** | *Weigh the Heart* — enemies drop scales that detonate | Sees Pact costs before accepting | Meta unlock |
| **Odin** | *Huginn & Muninn* — two ravens seek and strike | Spend 10% HP to reroll a level-up card | Meta unlock |
| **Zeus** | *Judgment* — random strikes; **damage scales with Dread** | Immune to the first Dread band's speed penalty | Late meta |
| **Lucifer** | *Morningstar* — orbiting blades of light | **Starts every run at Dread 50 — but all Pact boons are doubled** | Prestige unlock |

Lucifer is the "expert mode" character and the aspirational meta goal. Zeus and Lucifer both *want* Dread — that's the build-diversity payoff for players who stick around.

### Dark Gods (Pact-givers, and the Hunters they become)

| God | Pact offered | As Hunter |
|---|---|---|
| **Satan** | +80% damage, permanent HP drain | Sprints in straight lines, telegraphed |
| **Moloch** | Consume a card slot → massive AoE nova | Slow, unstoppable, leaves fire |
| **Kali** | +100% attack speed, halve your max HP | Teleports on a rhythm |
| **Loki** | Reroll your whole build, outcome unknown | Mimics your own sprite; hard to track |
| **Baphomet** | Double all pickups, enemies double too | Splits in two when it loses you |
| **Erebus** | Full heal, +40 Dread | Extinguishes light — vision drops to a small radius |

Six gods, six Hunters, six boss themes. That is the entire content spine and it is achievable.

---

## 6. Meta progression (the hybrid-casual layer)

Meta must be visible **in the first session**. Order of appearance:

1. **Soul Shards** (soft currency, every run) → **Altar of Bones**: flat permanent upgrades — max HP, pickup radius, starting level, extra reroll, revive charge. First upgrade affordable after run #1.
2. **Effigy Fragments** → unlock new Vessels. Napoleon lands free at session 2 so the player learns "new characters exist" immediately.
3. **Relics** (4 slots, 5 rarities) — drop from bosses and coffins. This is the mid-core depth layer and the primary reason to grind. Introduced around session 3.
4. **The Grimoire** — 30-day battle pass, free + premium tracks. Introduced day 2.
5. **Nightmare Rotation** — one fixed-seed run per day with a modifier and a friends leaderboard. The daily-return hook.

---

## 7. Monetization

Strictly non-pay-to-win. Layered ads + IAP, per the 2026 hybrid playbook.

**Rewarded video (the workhorse):**
- Revive on death — once per run. *This is the highest-converting placement in every survivor-like ever shipped.*
- Double run rewards at extraction
- Open the treasure coffin twice
- One extra level-up reroll per run

**IAP:**
- Grimoire premium track (~$7.99/season) — the volume seller
- Vessel skins, purely cosmetic (Tesla in a burning lab coat, etc.)
- Soul Shard bundles
- Remove-interstitials (~$4.99) — never removes rewarded

**Interstitials:** between runs only, hard-capped at 1 per 3 runs, never in the first 5 sessions.

**Targets:** D1 40% / D7 20% / D30 10%; ~$0.35 ARPDAU blended.

---

## 8. Art & audio direction

Deliberately cheap to produce, deliberately distinctive.

- **Style:** high-contrast 2D silhouettes on a near-black field. Enemies are pure black shapes with a single glowing feature (eyes, a mouth, a wound). Vessels are the only fully-rendered sprites. This is *fast to make*, reads perfectly on a 6" phone at 500 entities, and looks intentional rather than cheap.
- **Palette shifts with Dread** — the single strongest visual identity we get, and it's a shader-free colour-matrix operation.
- **Audio does the heavy lifting:** layered stems that swap by Dread band. Silence is used as a weapon (the 1.5s cut before a Hunter spawn).
- **No jumpscares.** Dread, not startle. Startles don't survive repeat runs; dread does.

---

## 9. Technical plan

The existing repo is an empty ASP.NET MVC scaffold — nothing to reuse, so this is greenfield.

**Recommended stack:**
- **TypeScript + HTML5 Canvas 2D**, hand-rolled game loop, no engine
- **Vite** for build/dev server
- **Zero runtime dependencies**
- Ships as a **PWA**, then wrapped with **Capacitor** for App Store / Play

**Why no engine:** a bullet-heaven is 500–2000 simultaneous entities with trivial per-entity logic. That is an object-pooling and draw-batching problem, not a scene-graph problem. Phaser/Unity add weight and startup time without helping the actual bottleneck. Hand-rolled Canvas2D with pooled arrays hits 60fps on mid-range Android and gives us instant browser testing on a real phone from day one.

**Proposed structure:**

```
game/
  src/
    core/        loop.ts, input.ts, pool.ts, rng.ts (seeded), save.ts
    sim/         entities.ts, spawner.ts, collision.ts (spatial hash), damage.ts
    systems/     dread.ts, pacts.ts, cards.ts, hunter.ts
    content/     vessels.ts, gods.ts, enemies.ts, cards.ts, relics.ts   ← data-driven
    render/      renderer.ts, palette.ts, fx.ts
    ui/          hud.ts, cardpick.ts, pactoffer.ts, meta.ts
  index.html
  vite.config.ts
```

All balance lives in `content/` as plain data tables, so tuning never requires touching logic.

---

## 10. Milestones

| # | Deliverable | Proves |
|---|---|---|
| **M0** | Playable slice: Tesla, one enemy, auto-attack, thumb-stick, XP + card picks, 3-min timer | The core feels good on a phone |
| **M1** | Dread meter + palette degradation + all 3 Pact offers + one Hunter | The differentiator actually lands |
| **M2** | 4 vessels, 8 enemy types, 2 gods/bosses, Soul Shards + Altar | It's a game, not a toy |
| **M3** | Relics, save system, Nightmare daily, Grimoire skeleton | Retention systems exist |
| **M4** | Audio stems, juice pass, ad/IAP stubs, Capacitor wrap | Shippable soft-launch build |

M0 is the decision gate. If the 3 minutes aren't fun with one character and one enemy, no amount of meta will save it.

---

## 11. Open risks

1. **Survivor-like saturation** — mitigated only by the Pact/Dread hook. If M1 shows Dread isn't compelling, the concept doesn't have a second leg to stand on.
2. **Horror + fast-paced is a tonal tension** — dread built over 4 minutes is thin. The Dread bands are designed to compensate, but this needs playtesting early.
3. **Real historical figures** — Tesla, Napoleon, Rasputin, Báthory are all long-dead public figures, which is legally clean, but "Tesla in a satanic pact game" is a tone call worth making consciously.
4. **Deity depictions** — Satan, Lucifer, Kali, Baphomet. Kali in particular is an actively worshipped Hindu deity and depicting her as a demonic antagonist risks genuine offence and store-level issues in India, a top-3 mobile market. **Recommendation: cut Kali, replace with a non-worshipped figure (Nyx, Mammon, or Fenrir).** Flagging rather than deciding — it's your call.

---

## 12. Sources

- [State of Mobile 2026 — Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2026/2/2/state-of-mobile-2026)
- [Hybrid Casual Games 2026: Design, Monetization & Trends — Game Growth Advisor](https://gamegrowthadvisor.com/blog/2026-04-16-hybrid-casual-game-design-strategy-2026/)
- [Beyond Ads: How Hybrid Meta-Systems are Driving 37% IAP Growth in 2026 — Airflux](https://airflux.ai/blog/beyond-ads-hybrid-meta-systems-iap-growth-2026)
- [Hyper Casual vs Hybrid Casual Games: Retention & LTV 2026 — Antier](https://www.antiersolutions.com/blogs/hybrid-casual-games-vs-hypercasual-whats-driving-higher-retention-ltv-and-revenue-in-2026/)
- [The Roblox Horror Genre: Market Size, Trends & Opportunity — RoLearn](https://rolearn.dev/trend-reports/roblox-horror-genre-market-report-2026/)
- [The Best Mobile Roguelites to Play in 2026 — Choost Games](https://choostgames.com/blog/best-mobile-roguelites-2026/)
- [The Best Roguelikes on Android and iOS — Rogueliker](https://rogueliker.com/android-roguelikes/)
- [Best Games Like Survivor.io in 2026 — Mobile Game Report](https://www.mobilegamereport.com/articles/best-games-like-survivor-io-2026)
- [Top mobile games 2026 — Singular](https://www.singular.net/blog/top-mobile-games/)
- [Casual Games Trends in 2026 — Cinevva](https://app.cinevva.com/guides/casual-games-trends-2026)

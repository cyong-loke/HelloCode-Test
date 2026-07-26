# PACT — The Circle (v2)

**Genre:** Squad defence with a hero gacha
**Platform:** Mobile-first (iOS / Android), portrait, one thumb
**Battle length:** 90–120 seconds
**Supersedes:** [`GAME_DESIGN.md`](./GAME_DESIGN.md) — v1 was a solo survivor-like
**Status:** Design proposal

---

## 1. What changed, and why

The brief moved: **the business model now leads.** A gacha needs three things
that the v1 survivor-like structurally could not provide.

| Gacha needs | v1 (solo survivor-like) | v2 (squad defence) |
|---|---|---|
| Something to **own** | You picked one vessel and it was over in four minutes | A roster of 40+ heroes, levelled, ascended, geared |
| Many heroes **on screen at once**, so a new pull is visible | One body, one weapon | Five heroes in every battle |
| A reason to want the **next** hero | Vessels were sidegrades | Roles, pantheon bonds, and counters make depth matter |

One correction to the premise, offered once and then dropped: survivor-likes
*do* monetise — revives and passes carry Survivor.io to real revenue. But they
monetise **consumption**, not **collection**, and consumption has a ceiling.
Your instinct is right for a gacha specifically. Moving.

**What survives the redesign** is everything that made v1 distinctive: the
horror, the historical and mythological cast, the Dark Gods, and above all
**Dread and the Pact**. The Pact does not merely survive — a squad is what it
always wanted, for reasons in §4.

---

## 2. The hook, in one paragraph

You are not a hero. You are the one who runs the séance. Five vessels stand on
a ring around the Seal, and the dead come for it from every side. Your heroes
fight on their own; your job is timing their Ultimates and answering the thing
that interrupts every battle: **a Dark God picks one of your five and offers
them power.** Accept and that hero becomes enormous — and starts filling with
Dread. At 100 Dread they stop being yours. **They turn, and you have to kill
your own five-star while the wave is still coming.**

---

## 3. The battle (90–120 seconds)

```
  Deploy 5 heroes onto the ring  →  Waves spill inward toward the Seal
              ↓
     Heroes auto-attack their arc; Ultimate meters fill
              ↓
     Tap a hero → Ultimate.  Two within 2s → RESONANCE (bonus)
              ↓
     ~0:35 and ~1:15 → a god names one hero and offers a PACT
              ↓
     Dread rises on that hero → at 100 they TURN and fight you
              ↓
     Wave 8 clear, or the Seal breaks
```

**Controls: tapping, and nothing else.** No movement, no aiming, no dragging.
Positioning is chosen before the battle, not during. A first-time player
understands the whole game in about eight seconds, which is the bar the
original brief set and this design keeps.

**The Seal** is your health bar. Anything that reaches the centre chips it.
It does not regenerate during a battle — Vigil heroes are the only repair.

**Resonance** is the skill ceiling: chaining two Ultimates inside two seconds
multiplies the second one. It rewards timing without adding a single control,
and it is the thing good players will optimise for years.

---

## 4. The Pact, rebuilt for a squad

This is the reason the redesign is not just "another hero collector".

In v1, Dread was a cost *you* paid. In v2 it is a cost **a specific hero**
pays, and that turns an abstract meter into a personnel decision:

- A god offers a Pact **on one named hero** — usually, pointedly, your best one.
- Accept: that hero gains a large multiplier and their Ultimate upgrades to a
  **Greater Ultimate** for the rest of the battle.
- Every Ultimate that hero casts while bound adds Dread.
- **At 100 Dread, The Turning.** The hero leaves your squad and respawns as a
  Hunter — with their own kit, aimed at your Seal and your remaining four.
- Killing your turned hero drops **Ichor**, the ascension material. It is the
  best Ichor source in the game.

So there are three live strategies, and all three are correct sometimes:

1. **Refuse.** Clean, slower, no risk. Always viable, never optimal.
2. **Accept and manage.** Take the power, stop casting with that hero before
   100. Skill expression.
3. **Farm the Turning.** Deliberately push a hero over, then execute them for
   Ichor. High risk, best rewards — **and it requires a deep bench**, because
   you fight the rest of the wave four-handed.

Strategy 3 is the monetisation engine and it is not a coincidence. The player
who wants to farm Ichor efficiently wants more heroes. That desire is created
by the mechanic, not by a paywall — which is the difference between a gacha
players respect and one they resent.

It is also the most shareable thing in the game. "My Ascendant Tesla turned at
wave 6 and wiped my whole team" is a clip. Clips are free user acquisition.

---

## 5. Heroes

### Roles (five, one per squad slot as a default)

| Role | Job | Reads as |
|---|---|---|
| **Warden** | Holds an arc, soaks the line | Big, slow, immovable |
| **Reaper** | Single-target burst — elites and the Turned | Precise, fast, lethal |
| **Chorus** | Sustained area damage against the crowd | Wide, loud |
| **Binder** | Slows, stuns, roots — buys time | Thin, clever |
| **Vigil** | Repairs the Seal, shields allies | Warm, rare, quietly essential |

### Rarity

| Tier | Name | Launch count | Ascension cap |
|---|---|---|---|
| ★★★ | Bound | 18 | ★★★★★ |
| ★★★★ | Anointed | 14 | ★★★★★★ |
| ★★★★★ | Ascendant | 10 | ★★★★★★★ |

**42 heroes at launch.** That number is a budget statement, not a wish — see
§10, it is the single largest cost in this design.

### The cast

Same well as v1, widened: historical figures who died strangely, and
public-domain mythology. Tesla, Napoleon, Rasputin, Báthory, Anubis, Odin,
Zeus, Lucifer all return as Ascendants. Around them: Joan of Arc (Warden),
Ching Shih (Reaper), Nikola's rival Edison (Binder, and the pairing writes
itself), Hypatia (Vigil), Baba Yaga, Sekhmet, Perun, Izanami, Cú Chulainn.

### The Fallen — the same hero, sold twice

Every Ascendant eventually gets a **Fallen** variant: the version that stayed
turned. Different role, different kit, different art, separate collection slot.
*Tesla, Unbound* is a Chorus who chains through your own heroes. This is the
standard and honest way a hero collector sustains a content calendar without
inventing forty new characters a year — and here it is **narratively earned**
rather than a costume swap, because the game already shows you heroes turning.

### Pantheon Bonds

Two or four heroes from the same pantheon in a squad grant a set bonus (Norse:
Ultimates charge faster; Egyptian: Dread rises slower; Enlightenment: Resonance
window widens). Bonds are what make a *specific* new hero desirable rather than
just a higher number — the reason to chase the fourth Norse unit.

---

## 6. Gacha

### Rates

| Outcome | Rate |
|---|---|
| ★★★★★ | 1.5% |
| ★★★★ | 9.0% |
| ★★★ | 89.5% |

- **Every 10 pulls** guarantee a ★★★★ or better.
- **Soft pity** from pull 55: the ★★★★★ rate climbs steeply each pull.
- **Hard pity at 70.**
- **50/50** on the featured Ascendant; losing it guarantees the featured one on
  the next ★★★★★.

70 is deliberately gentler than the genre's usual 80–90. A smaller game cannot
out-wait its players' patience, and a reachable pity is what converts a curious
spender into a repeat one.

### Currencies

| Currency | Earned | Bought | Spends on |
|---|---|---|---|
| **Soul Shards** | Every battle | No | Levels, gear upgrades |
| **Ichor** | The Turning, weekly boss | No | Ascension |
| **Effigies** | Dailies, events, ~1 free 10-pull/fortnight F2P | **Yes** | Pulls |
| **Hero Echoes** | Duplicates | No | Constellation nodes |

**Duplicates are never dead.** A duplicate becomes an Echo, which unlocks one
of six per-hero nodes; past the sixth, Echoes convert to a universal currency
spendable on any hero. Dead-end duplicates are the fastest way to lose a payer.

### Store

| Item | Price | Note |
|---|---|---|
| Effigy packs | $0.99 → $99.99 | First purchase of each pack doubles |
| **Monthly Vigil** | $4.99 | 300 now + 90/day for 30 days — the retention workhorse |
| **Grimoire** (season pass) | $9.99 | 6-week season, free + premium tracks |
| Growth Fund | $9.99 | Pays out across campaign milestones |
| Fallen skins | $4.99–$14.99 | Cosmetic only |

**Rewarded video** stays generous: one free pull daily, 2× campaign rewards,
and a Seal repair on a failed stage. F2P players are the audience the clips
are for; starving them starves acquisition.

### The line this design does not cross

No gacha-only power that cannot be reached by play. No selling stat advantages
directly. No timed-exclusive heroes that never return — every limited hero
re-runs within two seasons. These are not ethics for their own sake: PvP-free
design plus reachable content is what keeps a collector's community alive long
enough to be worth monetising.

---

## 7. Modes and the content treadmill

| Mode | Session | Why it exists |
|---|---|---|
| **Campaign** | 90–120s per stage, 12 chapters at launch | Main progression, teaches counters |
| **Nightmare** | One run/day, rotating modifier, seeded | Daily return hook |
| **The Turning Trial** | Weekly, a corrupted hero as boss | Ichor faucet, tests roster depth |
| **Endless Dark Hour** | Score attack, seasonal leaderboard | Whale flex, no paywall |
| **Vigils** | Idle accrual while closed | Respects players' time; standard |

Explicitly **no PvP.** PvP forces power creep, which forces a re-roll economy,
which turns the game adversarial. A collection game with co-operative
leaderboards ages far better and is far cheaper to balance.

---

## 8. This needs a backend. v1 did not.

The most important consequence of adding real money, stated plainly:

**A gacha cannot be client-authoritative.** v1 ran entirely offline with the
save in `localStorage` — anyone could edit it, and it did not matter, because
nothing was for sale. The moment Effigies cost money, that model is untenable:
players would mint currency and pull for free, and paying players would be
funding a fiction.

What v2 requires that v1 did not:

- **Accounts and auth** (device-bound to start, plus a link-account path)
- **Server-authoritative pulls** — RNG, pity counters and inventory all live
  server-side; the client only plays the animation
- **Receipt validation** against Google Play and the App Store
- **Server-held progression** for anything gated by real money
- **Battle result validation** — at minimum a seeded replay check, so Ichor and
  currency cannot simply be claimed

Battle simulation itself can stay on the client; battles are single-player and
the seeded-run architecture already in the v1 engine makes replay validation
straightforward.

**Rough shape:** Node + Postgres, or Firebase if speed matters more than
control. This is a real engineering line item — plan for a backend developer,
not an afternoon.

---

## 9. Compliance — plan for it now, not at submission

Random-item purchases are regulated, and the rules bite at store review:

- **Odds disclosure is mandatory.** Apple guideline 3.1.1 and Google Play both
  require published rates; Japan, South Korea and China add their own rules.
  The rate table in §6 must be visible in-app, not buried in a web page.
- **Paid loot boxes are effectively banned in Belgium and restricted in the
  Netherlands.** Region-gating or a direct-purchase alternative is needed.
- **Age rating rises** — ESRB adds "In-Game Purchases (Includes Random Items)",
  which affects store placement and ad networks.
- **Minor spending protections** are required in several markets.

None of this blocks the design. All of it is cheaper to build in from the start
than to retrofit under a review rejection.

---

## 10. The honest cost

The reason a survivor-like is cheap is that one character equals one weapon.
A hero collector has no such economy: **42 heroes at launch, then roughly two
per month forever**, each needing art, a kit, balance and voice-of-character.

That content factory — not the code — is this design's real budget. The v1
silhouette art direction helps more than it looks like it should: heroes are
readable shapes with one signature colour and effect, which is perhaps a fifth
of the cost of illustrated portrait art, and it is already the game's
established look rather than a compromise.

If 42 is not fundable, the honest fallback is **24 at launch** (10 / 9 / 5) and
a slower Fallen cadence. Below about 20 the gacha has nothing to sell.

---

## 11. What carries over from the build

The existing engine is roughly 60% reusable, which is why this redesign is not
a restart:

| Reused as-is | Reworked | Cut |
|---|---|---|
| Renderer, batching, blob silhouettes | Spawner → waves toward a centre | Player movement, joystick |
| Entity pools, spatial hash | Dread → per-hero meters | Level-up card hands |
| Dread bands, palette drain, vignette | Gods → Pact offers name a hero | Solo vessel kits |
| Procedural audio | Hunter behaviours → the Turned | Altar meta |
| PWA + the Android APK shell | | |

The Android build, the signing pipeline and the offline shell all carry over
untouched, with the addition of network calls to the new backend.

---

## 12. Milestones

| # | Deliverable | Proves |
|---|---|---|
| **M0** | One battle: 5 heroes, ring formation, waves, tap-Ultimates, Seal | The 90 seconds are fun with no meta at all |
| **M1** | Pact on a named hero, per-hero Dread, **the Turning** | The hook lands — go/no-go for the whole design |
| **M2** | 12 heroes across 5 roles, campaign chapters 1–3, local gacha mock | It reads as a collector |
| **M3** | Backend: accounts, server-side pulls, receipt validation | It can take money safely |
| **M4** | 24+ heroes, Nightmare, Trial, Grimoire, store, compliance | Soft-launchable |

**M1 is the gate.** If watching your own best hero turn on you is not the best
moment in the game, this is a competent hero collector in a market that has
several hundred of those, and that is not a fight worth taking.

---

## 13. Risks

1. **Content velocity is the whole business.** Two heroes a month, forever, or
   the game dies quietly. This is the risk; everything else is secondary.
2. **The Turning could read as punishment.** If losing your best unit mid-battle
   feels unfair rather than dramatic, the hook inverts. Mitigation: the Turned
   hero comes back unharmed after the battle, and killing them pays the best
   material in the game. Needs playtesting at M1, not opinions.
3. **Backend cost and liability** — real money means fraud, chargebacks,
   support and uptime. Budget for operations, not just development.
4. **A tap-only battle may be too thin** for long sessions. Resonance is the
   answer, and if it is not enough the next lever is pre-battle positioning
   depth, not more in-battle controls.
5. **Regulatory drift.** Loot box law is moving. Keeping a direct-purchase path
   for every featured hero is cheap insurance against a market closing.

---

## 14. The two directions I did not take

Recorded so they can be picked up if this one is wrong:

- **Idle auto-battler** (AFK Arena shape). Monetises superbly and is cheaper to
  build, but it is slow, and the original brief asked for fast-paced. It also
  wastes the Pact entirely — there is no moment to decide anything.
- **Real-time action with hero swapping** (Archero with a bench). Keeps v1's
  feel, but only one hero is on screen at a time, which is exactly the problem
  with v1 as a gacha: a new pull is invisible.

Squad defence was chosen because it is the only one of the three where a new
hero is **immediately visible, immediately felt, and immediately part of a
decision** — and where the Pact becomes a better mechanic than it was.

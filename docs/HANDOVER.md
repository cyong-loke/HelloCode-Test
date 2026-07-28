# PACT — session handover

Everything a fresh session needs to pick this up. Written 2026-07-26.

---

## 1. Where things are

| | |
|---|---|
| Repo | `cyong-loke/HelloCode-Test` |
| Branch | `claude/horror-game-design-ye1azp` (5 commits ahead of `master`) |
| Pull request | [#1](https://github.com/cyong-loke/HelloCode-Test/pull/1) — **open, draft**, mergeable, no conflicts |
| Playable build | https://claude.ai/code/artifact/1fa65afe-0cc5-4950-a4a0-c3dcf0b4ae54 |
| Android APK | `game/android/build/PACT.apk` — 61 KB, built and signature-verified |

`master` is an untouched, empty ASP.NET MVC scaffold. Everything in this project
is greenfield beside it and nothing depends on it.

```
docs/
  GAME_DESIGN.md      v1 — solo horror survivor-like.  BUILT.
  GAME_DESIGN_V2.md   v2 — squad defence + hero gacha.  DESIGN ONLY. ← active direction
  HANDOVER.md         this file
game/                 the v1 game: TypeScript + Canvas2D + Vite, ~4,900 lines
game/android/         WebView shell + a from-scratch APK build pipeline
```

---

## 2. Status in one line

**v1 is finished and playable. v2 is designed and not started. The user's most
recent instruction is to move to v2.**

The last substantive exchange: the user liked the PACT concept but judged a solo
survivor-like unable to sustain a gacha, and asked for a redesign around
**top-up hero draws with multiple heroes per battle**. `GAME_DESIGN_V2.md` is
the answer to that. It has not been reviewed or approved yet, and no v2 code
exists.

The open question put to the user, still unanswered:

> Want me to build M0 + M1 — the ring battle and the Turning — so you can feel
> it before anything else gets committed?

---

## 3. What v1 is, and what state it is in

A horror survivor-like. One thumb, auto-attack, 3m45s runs into a boss. Three
times a run a Dark God offers a **Pact**: power now, paid in **Dread**. Dread
only rises; it drains colour from the world, closes the vignette, speeds enemies
up, and at 100 spawns an unkillable **Hunter** that chases you for the rest of
the run.

Complete and verified: the run loop, 5 Dread bands, 6 gods × 2 pacts, 6 Hunter
behaviours, 8 vessels with distinct signature weapons, 8 enemy archetypes, the
boss, the Altar of Bones meta, vessel unlocks, a seeded daily Nightmare with 6
modifiers, procedural audio, PWA packaging, and the Android APK.

Deliberately **not** built: relics, the Grimoire season pass, any ads/IAP.
Monetisation hooks are absent rather than stubbed.

### Measurements that are real, not guesses

Do not re-derive these; they came from instrumented runs in a real browser.

- **Performance**: 60fps at genuine late-game density (~350 live enemies); 46fps
  at pool saturation (1,400), measured under software rasterisation in a
  container, so a real phone GPU does better.
- **Live enemy cap is 620** (`game/src/sim/spawner.ts`). A spawn-doubling pact
  against a build that can't keep up otherwise saturates the pool and the frame
  budget with it.
- **Boss health** `11000 + t*24 + dread*105`. Boss DPS was sampled across five
  full runs: a build that actually invested in its weapons lands at 1.0–1.5k,
  making the fight 16–24s. Random-card builds measure far lower — one test put
  21 of 25 levels into passives — but those runs are supposed to die there.
- **Vessel balance**: all 8 land within 143–160 kills at t=40s.

### Bugs already found and fixed — don't reintroduce them

1. **Anubis could not kill anything.** His `scales` weapon was on-kill only, so
   it could never land the first kill. It now has an active half *and* an
   on-kill half.
2. **Two daily modifiers did nothing** — `enemyHpMul` / `enemyScale` were set on
   the run but never read by the spawner.
3. **Boss died in 6s** at the original health values.
4. **Enemies were perfect circles** and read as bubbles; they are now
   precomputed irregular blob outlines. At max Dread the screen also went to
   grey mush with the player lost in it, so the player carries a halo.
5. **`resources.arsc` came out unaligned** in the APK, which Android 11+ rejects
   at install.

---

## 4. Decisions already made — settled, don't re-litigate

- **Nyx replaced Kali** in the god roster. Kali is an actively worshipped Hindu
  deity; casting her as a demonic antagonist is a real-world harm and a store
  risk in a top-3 mobile market. Flagged to the user, accepted.
- **No engine.** Hand-rolled Canvas2D. A bullet-heaven is an object-pooling and
  draw-batching problem, not a scene-graph one.
- **Build target is ES2015**, not ES2020 — Android 7's stock WebView is
  Chrome 51 and a stale one would hard-fail on `?.` or class fields.
- **The APK is a plain WebView shell**, not Capacitor. No native plugins are
  needed, and Capacitor adds megabytes and a dependency for nothing.
- **v2 rejected two alternatives**: an idle auto-battler (monetises well, but
  slow, and it wastes the Pact — there's no moment to decide anything) and
  action with hero swapping (only one hero visible, which is exactly v1's gacha
  problem). Both are recorded in §14 of `GAME_DESIGN_V2.md`.

---

## 5. Environment gotchas that will cost you an hour each

### Network is on a narrow allowlist

Reachable: `registry.npmjs.org`, `repo1.maven.org`, `raw.githubusercontent.com`,
`pypi.org`, `github.com` (git).

**Blocked: `dl.google.com`, and every Android SDK mirror** (Tencent, Aliyun,
Tsinghua, Huawei all fail). `api.github.com` is blocked too.

This is why there is no Gradle build. `game/android/build-apk.sh` assembles a
toolchain from what *is* reachable:

| Piece | Source |
|---|---|
| `aapt2` | the `aaptjs3` npm package, which ships the official Linux binary |
| `android.jar` (API 33) | `Sable/android-platforms` on raw.githubusercontent |
| `dx` | Maven Central, `com.jakewharton.android.repackaged:dalvik-dx` |
| `apksig` | Maven Central, `com.android.tools.build:apksig` |
| `javac`, `keytool` | the JDK already installed |

Cached in `game/android/.tools/` (gitignored). The script verifies its own
output, so a broken APK fails the build rather than failing at install.

### APK signing is v2-only at minSdk 24, and that is not arbitrary

Maven Central only carries **apksig 2.3.0**, whose v1 signer calls a
`sun.security.pkcs` method modern JDKs no longer expose. Signing v1 separately
with `jarsigner` **does not survive** — apksig strips foreign `META-INF`
signatures when its own v1 signer is disabled. v2 alone covers Android 7.0+,
and Android 11+ requires v2 regardless. `tools/zipalign.py` stands in for the
real `zipalign`, which lives in build-tools we can't get.

### Bypass Permissions mode is unavailable here

Claude Code on the web offers only Accept edits, Plan and Auto. `defaultMode:
"bypassPermissions"` in a settings file is **silently ignored** in cloud
sessions. Use **Auto mode** instead. (Bypass is also refused when running as
root, which this container is.)

### There is no CI

The repo has no `.github/workflows`, so PR #1 reports zero check runs and will
never go green or red. A real gate exists locally — `npm run build` runs
`tsc --noEmit` plus the Vite build — it just isn't wired to GitHub. Offered to
the user; not added.

### Things that do not carry to a new session

- **The PR watch does not transfer.** A `send_later` check-in
  (`trig_014yry4DrDD4HKJzomLHfSL8`) fires into the *old* session. To keep
  watching PR #1, call `subscribe_pr_activity` again in the new session.
- **The artifact URL** must be passed explicitly. From a conversation that did
  not publish it, call `Artifact` with
  `url: "https://claude.ai/code/artifact/1fa65afe-0cc5-4950-a4a0-c3dcf0b4ae54"`,
  or a redeploy mints a *new* URL instead of updating this one.
- `game/node_modules`, `game/dist` and `game/android/.tools` are gitignored and
  will need rebuilding.

---

## 6. Resuming

```bash
cd game
npm install
npm run build            # icons + tsc --noEmit + Vite → dist/index.html (~80 KB, self-contained)
npm run dev              # http://localhost:5173
npm run preview          # serves dist/ on the LAN, for testing on a phone

./android/build-apk.sh   # → android/build/PACT.apk, self-verifying
node scripts/make-artifact.mjs out.html   # headless fragment for the Artifact host
```

`window.__pact` is exposed in every build for QA: `run`, `warp(seconds)` and
`start()`. Fast-forwarding a 4-minute run is the difference between testing the
late game and hoping about it. Scores are local-only, so there is nothing to
protect by hiding it.

Browser QA was driven with Playwright against `dist/` served on `:8899`;
Chromium is preinstalled at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` — never run `playwright install`).

---

## 7. Code map

```
game/src/
  core/      rng (seeded, drives the daily), input (floating stick), save, math
  sim/       entities + spatial hash, spawner, weapons, run.ts (the big one)
  systems/   dread bands, hunter behaviours
  content/   vessels, gods, enemies, cards, altar, daily  ← all pure data
  render/    renderer (batched silhouettes), fx pool
  audio/     procedural WebAudio, zero asset files
  ui/        DOM overlays for every fullscreen modal
game/android/
  src/…/MainActivity.java   WebView shell
  tools/                    ApkSign, ApkVerify, zipalign.py
  build-apk.sh              the whole pipeline
```

All balance lives in `content/` as plain tables — tuning never touches logic.

Two implementation details worth not rediscovering:

- **Dread's colour drain is a CSS `filter` on the canvas element.** No per-pixel
  work, and it is the game's entire visual identity.
- **The page is served under a synthetic `https://pact.localhost` origin** via
  `shouldInterceptRequest`, not `file://`. WebView gives `file://` pages an
  opaque origin on newer Android, which silently breaks `localStorage` and would
  wipe Altar progress every launch.

---

## 8. If the user says "go" on v2

`GAME_DESIGN_V2.md` §12 has the milestones. The short version:

**M1 is the go/no-go**, and it is worth building before anything else: a god
names one of your five heroes, that hero fills with Dread, and at 100 they
**turn** and fight you. If watching your own best hero turn on you is not the
best moment in the game, v2 is a competent hero collector in a market with
several hundred of those.

About **60% of the v1 engine carries over** — renderer, batching, pools, spatial
hash, Dread bands, audio, and the whole PWA/APK shell. What gets replaced is
player movement, the level-up card hands, and the solo vessel kits.

Three things flagged to the user that are cheaper to plan than to retrofit:

1. **A gacha cannot be client-authoritative.** v1 is 100% offline with the save
   in `localStorage`; that stops being acceptable the moment currency costs real
   money. v2 needs accounts, server-side pulls and pity, server-held inventory,
   and receipt validation. Real backend work, not an afternoon.
2. **Random-item purchases are regulated** — odds disclosure is mandatory
   (Apple 3.1.1, Google Play, plus JP/KR/CN rules), paid loot boxes are
   effectively banned in Belgium and restricted in the Netherlands, and the age
   rating rises.
3. **The real budget is heroes, not code** — 42 at launch, then ~2/month
   forever. Honest fallback is 24. Below ~20 the gacha has nothing to sell.

---

## 9. What has not been verified

Stated plainly so nobody assumes otherwise:

- **The APK has never been installed or launched.** No emulator or device was
  available. The web build is thoroughly tested in a real browser; the untested
  surface is the ~150-line Android shell. If it launches to a black screen, that
  is where the problem is, and a logcat would settle it in minutes.
- **Nobody has played v1 for fun.** Balance comes from instrumented simulation,
  not from a human deciding whether it feels good. The central design bet —
  that Dread creates real tension — is unvalidated.
- **v2 is unreviewed.** No user feedback on it yet.

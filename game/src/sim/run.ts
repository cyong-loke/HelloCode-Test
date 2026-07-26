import { audio } from '../audio/audio';
import { Rng } from '../core/rng';
import { TAU, clamp } from '../core/math';
import { save } from '../core/save';
import { ALTAR } from '../content/altar';
import { PASSIVES, weaponCard } from '../content/cards';
import { GODS, godById } from '../content/gods';
import { MODIFIERS, type Modifier } from '../content/daily';
import { vesselById } from '../content/vessels';
import { Fx } from '../render/fx';
import { BANDS, bandIndex } from '../systems/dread';
import { Hunter } from '../systems/hunter';
import {
  Grid,
  newBullet,
  newEnemy,
  newGem,
  type Bullet,
  type Enemy,
  type Familiar,
  type Gem,
} from './entities';
import { BOSS_AT, Spawner } from './spawner';
import { UNIVERSAL_WEAPONS, WEAPONS, type WeaponState } from './weapons';
import { baseStats, type Card, type God, type PactOffer, type Stats, type Vessel } from '../types';

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  dirX: number;
  dirY: number;
  invuln: number;
  flash: number;
  revives: number;
  /** Seconds without taking a hit — Tesla turns this into attack speed. */
  charge: number;
}

export type Phase = 'play' | 'cards' | 'pact' | 'over';

export interface HitOpts {
  color?: string;
  knock?: number;
  slow?: number;
  /** Continuous sources skip the flash, the blip and the crit roll. */
  quiet?: boolean;
}

export interface ShootOpts {
  r?: number;
  life?: number;
  color?: string;
  kind?: number;
  pierce?: number;
  homing?: number;
  aoe?: number;
}

const PACT_TIMES = [60, 120, 180];
const BASE_SPEED = 152;

export class Run {
  readonly rng: Rng;
  readonly vessel: Vessel;
  readonly fx = new Fx();
  readonly grid = new Grid(64);
  readonly hunter = new Hunter();
  readonly audio = audio;
  private readonly spawner = new Spawner();

  // ── Pools ────────────────────────────────────────────────────────
  readonly enemies: Enemy[] = [];
  readonly bullets: Bullet[] = [];
  readonly ebullets: Bullet[] = [];
  readonly gems: Gem[] = [];
  familiars: Familiar[] = [];
  nextUid = 1;

  // ── State ────────────────────────────────────────────────────────
  t = 0;
  phase: Phase = 'play';
  ended = false;
  won = false;
  player: Player;
  stats: Stats = baseStats();
  kills = 0;
  level = 1;
  xp = 0;
  xpNext = 10;
  pendingCards = 0;
  hand: Card[] = [];
  rerolled = false;

  dread = 0;
  band = 0;
  boundGod: God | null = null;
  pactIndex = 0;
  pactOffers: PactOffer[] = [];
  pactsTaken: PactOffer[] = [];

  boss: Enemy | null = null;
  /** Live enemies, refreshed by the grid rebuild each frame. */
  aliveCount = 0;
  spawnRadius = 600;
  auraRadius = 0;
  hunterBlind = 0;

  announceText = '';
  announceT = 0;
  whisperText = '';
  whisperT = 0;

  // ── Build ────────────────────────────────────────────────────────
  cardLevels: Record<string, number> = {};
  weapons: WeaponState[] = [];
  pool: Card[] = [];

  // ── Pact / modifier accumulators ─────────────────────────────────
  mods = {
    damage: 1,
    haste: 1,
    area: 1,
    speed: 1,
    pickup: 1,
    maxHp: 1,
    xp: 1,
    shard: 1,
    spawn: 1,
  };
  hpDrain = 0;
  healMul = 1;
  damageTakenMul = 1;
  enemySpeedMul = 1;
  enemyHpMul = 1;
  enemyScale = 1;
  dreadCreep = 0;
  blindness = 0;
  nova = 0;
  cardCount = 3;
  startHpFrac = 1;

  private novaT = 0;
  private napoT = 0;
  private bonusFamiliars = 0;
  private hasteBonus = 1;
  private whisperT2 = 0;
  private shakeT = 0;
  shake = 0;

  readonly daily: Modifier | null;
  readonly seed: number;

  constructor(vesselId: string, seed: number, daily: Modifier | null = null) {
    this.vessel = vesselById(vesselId);
    this.seed = seed;
    this.rng = new Rng(seed);
    this.daily = daily;

    for (let i = 0; i < 1400; i++) this.enemies.push(newEnemy());
    for (let i = 0; i < 800; i++) this.bullets.push(newBullet());
    for (let i = 0; i < 260; i++) this.ebullets.push(newBullet());
    for (let i = 0; i < 1100; i++) this.gems.push(newGem());

    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      hp: 100,
      dirX: 0,
      dirY: 1,
      invuln: 1.2,
      flash: 0,
      revives: (save.altar.revenant ?? 0) + (this.vessel.id === 'rasputin' ? 1 : 0),
      charge: 0,
    };

    // Deck: the vessel's signature weapon, the three universal secondaries,
    // and every passive.
    this.pool = [
      weaponCard(this.vessel.weapon),
      ...UNIVERSAL_WEAPONS.map(weaponCard),
      ...PASSIVES,
    ];

    if (daily) daily.apply(this);
    if (this.vessel.id === 'lucifer') this.dread = 50;

    // The signature weapon is free and starts at rank 1.
    this.takeCard(this.pool[0]);

    const head = save.altar.head ?? 0;
    for (let i = 0; i < head; i++) this.pendingCards++;
    this.level += head;

    this.recompute();
    this.player.hp = this.stats.maxHp * this.startHpFrac;
    this.band = bandIndex(this.dread);
    this.xpNext = this.xpNeeded(this.level);
  }

  // ── Derived ──────────────────────────────────────────────────────

  private xpNeeded(level: number) {
    return Math.floor(5 + level * 4.2 + Math.pow(level, 1.72));
  }

  /** Zeus shrugs off the first Dread band's speed penalty. */
  private get speedBand() {
    const b = this.vessel.id === 'zeus' && this.band === 1 ? 0 : this.band;
    return BANDS[b];
  }

  get bandInfo() {
    return BANDS[this.band];
  }

  get vision() {
    return clamp(this.blindness + this.hunterBlind, 0, 0.8);
  }

  recompute() {
    const s = baseStats();

    // Altar of Bones — permanent, applied before anything earned in-run.
    for (const up of ALTAR) {
      const l = save.altar[up.id] ?? 0;
      if (!l) continue;
      if (up.id === 'heart') s.maxHp += 10 * l;
      if (up.id === 'edge') s.damage *= 1 + 0.05 * l;
      if (up.id === 'quick') s.haste *= 1 + 0.04 * l;
      if (up.id === 'vigor') s.speed *= 1 + 0.04 * l;
      if (up.id === 'reach') s.pickup += 12 * l;
      if (up.id === 'hide') s.armor += l;
      if (up.id === 'omen') s.crit += 0.05 * l;
    }

    for (const card of this.pool) {
      const l = this.cardLevels[card.id] ?? 0;
      if (l > 0 && card.stat) card.stat(s, l);
    }

    s.damage *= this.mods.damage;
    s.haste *= this.mods.haste;
    s.area *= this.mods.area;
    s.speed *= this.mods.speed;
    s.pickup *= this.mods.pickup;
    s.maxHp *= this.mods.maxHp;

    this.stats = s;
    this.player.hp = Math.min(this.player.hp, s.maxHp);
    this.syncFamiliars();
  }

  // ── Build mutation ───────────────────────────────────────────────

  takeCard(card: Card) {
    const l = (this.cardLevels[card.id] ?? 0) + 1;
    this.cardLevels[card.id] = l;
    if (card.weapon) {
      const existing = this.weapons.find((w) => w.id === card.weapon);
      if (existing) existing.level = l;
      else this.weapons.push({ id: card.weapon, level: l, t: 0 });
    }
    this.recompute();
  }

  /** Loki's Wager — same total investment, redistributed at random. */
  rerollBuild() {
    const ids = Object.keys(this.cardLevels);
    const total = ids.reduce((n, id) => n + this.cardLevels[id], 0);
    const sig = this.pool[0].id;

    this.cardLevels = {};
    this.weapons = [];
    // The signature weapon always survives — losing it entirely feels broken
    // rather than chaotic.
    this.takeCard(this.pool[0]);

    let left = total - 1;
    let guard = 400;
    while (left > 0 && guard-- > 0) {
      const card = this.rng.pick(this.pool);
      const cur = this.cardLevels[card.id] ?? 0;
      if (cur >= card.max) continue;
      if (card.id === sig && cur >= card.max) continue;
      this.takeCard(card);
      left--;
    }
    this.recompute();
  }

  private syncFamiliars() {
    const wanted: Familiar[] = [];
    for (const w of this.weapons) {
      const def = WEAPONS[w.id];
      if (!def.familiars || !def.familiarStats) continue;
      let n = def.familiars(w.level);
      if (w.id === 'army') n += this.bonusFamiliars;
      const spec = def.familiarStats(this, w.level);
      for (let i = 0; i < n; i++) {
        const prev = this.familiars.find((f) => f.weapon === w.id);
        wanted.push({
          weapon: w.id,
          mode: def.familiarKind ?? 'orbit',
          angle: (i / n) * TAU + (prev ? prev.angle : 0),
          dist: spec.dist,
          x: this.player.x,
          y: this.player.y,
          r: spec.r,
          dmg: spec.dmg,
          color: def.color,
          spin: w.id === 'morningstar' ? 1.5 : w.id === 'ring' ? 2.4 : 1.1,
          fireT: this.rng.range(0, 1.9),
          hitCd: 0,
          state: 0,
          tx: 0,
          ty: 0,
        });
      }
    }
    this.familiars = wanted;
  }

  // ── Pool access ──────────────────────────────────────────────────

  takeEnemy(): Enemy | null {
    for (let i = 0; i < this.enemies.length; i++) {
      if (!this.enemies[i].alive) return this.enemies[i];
    }
    return null;
  }

  private takeBullet(pool: Bullet[]): Bullet | null {
    for (let i = 0; i < pool.length; i++) if (!pool[i].alive) return pool[i];
    return null;
  }

  private takeGem(): Gem | null {
    for (let i = 0; i < this.gems.length; i++) if (!this.gems[i].alive) return this.gems[i];
    return null;
  }

  // ── Queries ──────────────────────────────────────────────────────

  nearest(x: number, y: number, maxDist: number, exclude?: Set<number>): Enemy | null {
    let best: Enemy | null = null;
    let bestD = maxDist * maxDist;
    this.grid.query(x, y, maxDist, (e) => {
      if (!e.alive || (exclude && exclude.has(e.uid))) return;
      if (e.behaviour === 'flicker' && e.fade < 0.5) return;
      const dx = e.x - x;
      const dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    });
    return best;
  }

  randomEnemyNear(x: number, y: number, maxDist: number): Enemy | null {
    const found: Enemy[] = [];
    this.grid.query(x, y, maxDist, (e) => {
      if (e.alive && found.length < 40) found.push(e);
    });
    return found.length ? this.rng.pick(found) : null;
  }

  forEachInRadius(x: number, y: number, radius: number, fn: (e: Enemy) => void) {
    const r2 = radius * radius;
    this.grid.query(x, y, radius, (e) => {
      if (!e.alive) return;
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy <= r2 + e.r * e.r) fn(e);
    });
  }

  // ── Combat ───────────────────────────────────────────────────────

  hit(e: Enemy, base: number, opts?: HitOpts) {
    if (!e.alive) return;
    let dmg = base * this.stats.damage;
    let crit = false;

    if (!opts?.quiet && this.rng.next() < this.stats.crit) {
      dmg *= 2;
      crit = true;
    }

    e.hp -= dmg;

    if (!opts?.quiet) {
      e.flash = 0.09;
      this.audio.hit();
      if (crit || e.boss) {
        this.fx.text(e.x, e.y - e.r, String(Math.round(dmg)), crit ? '#f0e08a' : '#d8d2c4');
      }
    }

    if (opts?.knock) {
      const a = Math.atan2(e.y - this.player.y, e.x - this.player.x);
      const resist = e.boss ? 0.06 : e.behaviour === 'wall' ? 0.25 : e.elite ? 0.45 : 1;
      e.kx += Math.cos(a) * opts.knock * resist;
      e.ky += Math.sin(a) * opts.knock * resist;
    }
    if (opts?.slow) e.slow = Math.max(e.slow, opts.slow);

    if (e.hp <= 0) this.killEnemy(e, opts?.color);
  }

  boom(x: number, y: number, radius: number, dmg: number, color: string) {
    this.forEachInRadius(x, y, radius, (e) => this.hit(e, dmg, { color, knock: 130 }));
    this.fx.shock(x, y, radius, color);
    this.fx.spark(x, y, color, 9, 190);
  }

  shoot(x: number, y: number, vx: number, vy: number, dmg: number, opts?: ShootOpts) {
    const b = this.takeBullet(this.bullets);
    if (!b) return;
    b.alive = true;
    b.x = x;
    b.y = y;
    b.vx = vx;
    b.vy = vy;
    b.dmg = dmg;
    b.r = opts?.r ?? 4;
    b.life = opts?.life ?? 1.2;
    b.pierce = opts?.pierce ?? 0;
    b.color = opts?.color ?? '#d8d2c4';
    b.kind = opts?.kind ?? 0;
    b.homing = opts?.homing ?? 0;
    b.aoe = opts?.aoe ?? 0;
    b.hit.length = 0;
    b.spin = 0;
  }

  private killEnemy(e: Enemy, color?: string) {
    e.alive = false;
    this.kills++;
    this.fx.spark(e.x, e.y, color ?? e.rim, e.elite ? 16 : 5, e.elite ? 240 : 140);
    this.audio.kill();

    if (e.boss) {
      this.boss = null;
      this.finish(true);
      return;
    }

    this.dropGem(e.x, e.y, e.xp, 0);
    if (e.elite) {
      this.dropGem(e.x + 12, e.y, 18, 2);
      this.dropGem(e.x - 12, e.y, 22, 1);
    } else if (this.rng.chance(0.012)) {
      this.dropGem(e.x, e.y, 16, 1);
    }

    // Anubis' scales also fall from the dead, on top of the ones he sets himself.
    const scales = this.weapons.find((w) => w.id === 'scales');
    if (scales && this.rng.chance(0.2 + scales.level * 0.055)) {
      this.dropScale(e.x, e.y, 16 + 11 * scales.level, 62 * this.stats.area);
    }

    if (this.vessel.id === 'bathory') this.heal(0.8);
  }

  /** A scale sits for a beat, then detonates. Used by both halves of Weigh the Heart. */
  dropScale(x: number, y: number, dmg: number, aoe: number) {
    const b = this.takeBullet(this.bullets);
    if (!b) return;
    b.alive = true;
    b.x = x;
    b.y = y;
    b.vx = b.vy = 0;
    b.dmg = dmg;
    b.r = 8;
    b.life = 1.1;
    b.pierce = 0;
    b.color = WEAPONS.scales.color;
    b.kind = 3;
    b.homing = 0;
    b.aoe = aoe;
    b.hit.length = 0;
    b.spin = 0;
  }

  private dropGem(x: number, y: number, value: number, kind: number) {
    const g = this.takeGem();
    if (!g) return;
    g.alive = true;
    g.x = x;
    g.y = y;
    const a = this.rng.range(0, TAU);
    g.vx = Math.cos(a) * 40;
    g.vy = Math.sin(a) * 40;
    g.value = value;
    g.kind = kind;
    g.pulled = false;
    g.t = 0;
  }

  heal(amount: number) {
    this.player.hp = Math.min(this.stats.maxHp, this.player.hp + amount * this.healMul);
  }

  hurtPlayer(raw: number, ignoreArmor = false) {
    const p = this.player;
    if (p.invuln > 0 || this.ended) return;
    let dmg = raw * this.damageTakenMul;
    if (!ignoreArmor) dmg = Math.max(1, dmg - this.stats.armor);

    p.hp -= dmg;
    p.charge = 0;
    p.flash = 0.22;
    this.shakeT = 0.22;
    this.shake = Math.min(9, 3 + dmg * 0.22);
    this.audio.hurt();

    if (p.hp <= 0) {
      if (p.revives > 0) {
        p.revives--;
        p.hp = this.stats.maxHp * 0.35;
        p.invuln = 2.4;
        this.boom(p.x, p.y, 210 * this.stats.area, 90, '#b1263a');
        this.announce('YOU DO NOT GET TO LEAVE');
      } else {
        this.finish(false);
      }
    } else {
      p.invuln = 0.55;
    }
  }

  announce(text: string) {
    this.announceText = text;
    this.announceT = 2.6;
  }

  // ── Pacts ────────────────────────────────────────────────────────

  private openPact() {
    this.phase = 'pact';
    this.pactIndex++;
    const takenIds = new Set(this.pactsTaken.map((p) => p.id));
    const boundIds = new Set(this.pactsTaken.map((p) => p.god));

    const gods = this.rng.shuffled(GODS).sort((a, b) => {
      // Mildly prefer gods you have not dealt with yet — more variety per run.
      const av = boundIds.has(a.id) ? 1 : 0;
      const bv = boundIds.has(b.id) ? 1 : 0;
      return av - bv;
    });

    const offers: PactOffer[] = [];
    for (const g of gods) {
      const options = g.pacts.filter((p) => !takenIds.has(p.id));
      if (!options.length) continue;
      offers.push(this.rng.pick(options));
      if (offers.length === 2) break;
    }
    this.pactOffers = offers;
    this.audio.pact();
  }

  acceptPact(offer: PactOffer) {
    offer.boon(this);
    // Lucifer takes the upside twice and pays the same price once.
    if (this.vessel.id === 'lucifer') offer.boon(this);
    offer.toll?.(this);

    this.pactsTaken.push(offer);
    this.boundGod = godById(offer.god);
    this.addDread(offer.dread);
    this.recompute();
    this.phase = 'play';
    this.announce(`${this.boundGod.name.toUpperCase()} ACCEPTS`);
  }

  refusePact() {
    this.heal(this.stats.maxHp * 0.1);
    this.phase = 'play';
    this.announce('YOU KEEP WHAT IS YOURS');
  }

  addDread(amount: number) {
    const before = this.band;
    this.dread = Math.min(100, this.dread + amount);
    this.band = bandIndex(this.dread);

    if (this.band > before) {
      this.audio.dreadBand();
      this.shakeT = 0.5;
      this.shake = 7;
      if (this.dread >= 100 && !this.hunter.active) {
        const god = this.boundGod ?? this.rng.pick(GODS);
        this.hunter.spawn(this, god);
        this.audio.hunterSpawn();
        this.announce(`${god.hunter.toUpperCase()} IS HERE`);
      }
    }
  }

  // ── Level ups ────────────────────────────────────────────────────

  private gainXp(n: number) {
    this.xp += n * this.mods.xp;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = this.xpNeeded(this.level);
      this.pendingCards++;
    }
    if (this.pendingCards > 0 && this.phase === 'play') this.openCards();
  }

  openCards() {
    this.phase = 'cards';
    this.rerolled = false;
    this.hand = this.drawHand();
    this.audio.levelUp();
  }

  drawHand(): Card[] {
    const available = this.pool.filter((c) => (this.cardLevels[c.id] ?? 0) < c.max);
    if (!available.length) return [];
    const owned = this.weapons.length;
    const picked = this.rng.shuffled(available).sort((a, b) => {
      // Nudge toward new weapons early so builds diverge inside the first minute.
      const w = (c: Card) =>
        c.kind === 'weapon' && (this.cardLevels[c.id] ?? 0) === 0 && owned < 4 ? -1 : 0;
      return w(a) - w(b);
    });
    return picked.slice(0, this.cardCount);
  }

  chooseCard(card: Card) {
    this.takeCard(card);
    this.pendingCards--;
    if (this.pendingCards > 0) this.openCards();
    else this.phase = 'play';
  }

  get canReroll() {
    return (
      this.vessel.id === 'odin' && !this.rerolled && this.player.hp > this.stats.maxHp * 0.14
    );
  }

  rerollHand() {
    if (!this.canReroll) return;
    this.rerolled = true;
    this.player.hp -= this.stats.maxHp * 0.12;
    this.hand = this.drawHand();
    this.audio.ui();
  }

  // ── Main update ──────────────────────────────────────────────────

  setView(w: number, h: number) {
    this.spawnRadius = Math.hypot(w, h) / 2 + 70;
  }

  update(dt: number, moveX: number, moveY: number) {
    if (this.phase !== 'play' || this.ended) {
      // Effects still breathe behind a modal so the world never looks frozen.
      this.fx.update(dt);
      return;
    }

    this.t += dt;
    const p = this.player;

    // Dread that arrives without a bargain.
    if (this.dreadCreep > 0) this.addDread(this.dreadCreep * dt);

    this.aliveCount = this.grid.rebuild(this.enemies);

    // ── Player ──
    const speed = BASE_SPEED * this.stats.speed;
    p.vx += (moveX * speed - p.vx) * Math.min(1, 14 * dt);
    p.vy += (moveY * speed - p.vy) * Math.min(1, 14 * dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (moveX || moveY) {
      p.dirX = moveX;
      p.dirY = moveY;
    }
    p.invuln = Math.max(0, p.invuln - dt);
    p.flash = Math.max(0, p.flash - dt);
    p.charge += dt;

    // Tesla: attack speed climbs while untouched, and resets the moment it isn't.
    this.hasteBonus = this.vessel.id === 'tesla' ? 1 + Math.min(0.55, p.charge * 0.055) : 1;

    if (this.stats.regen > 0) this.heal(this.stats.regen * dt);
    if (this.hpDrain > 0) {
      p.hp -= this.stats.maxHp * (this.hpDrain / 100) * dt;
      if (p.hp <= 0) this.hurtPlayer(0.01);
    }

    // Napoleon: the dead are conscripted back, one at a time.
    if (this.vessel.id === 'napoleon') {
      this.napoT += dt;
      if (this.napoT >= 22 && this.bonusFamiliars < 4) {
        this.napoT = 0;
        this.bonusFamiliars++;
        this.syncFamiliars();
        this.announce('ANOTHER ANSWERS THE ROLL');
      }
    }

    // Moloch's furnace.
    if (this.nova > 0) {
      this.novaT -= dt;
      if (this.novaT <= 0) {
        this.novaT = 5;
        this.boom(p.x, p.y, 170 * this.stats.area, 40 * this.nova, '#e07a2c');
        this.audio.thunder();
      }
    }

    this.auraRadius = 0;
    this.updateWeapons(dt);
    this.updateFamiliars(dt);
    this.spawner.update(this, dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateGems(dt);
    this.hunter.update(this, dt);
    this.fx.update(dt);
    this.audio.update(this.dread, dt);

    if (this.shakeT > 0) {
      this.shakeT -= dt;
      if (this.shakeT <= 0) this.shake = 0;
    }

    if (this.announceT > 0) this.announceT -= dt;

    // Whispers surface from the second band onward.
    if (this.band >= 1) {
      this.whisperT2 -= dt;
      if (this.whisperT2 <= 0) {
        this.whisperT2 = this.rng.range(7, 16) / this.band;
        this.whisperT = 3.2;
      }
    }
    if (this.whisperT > 0) this.whisperT -= dt;

    // Pact windows.
    if (this.pactIndex < PACT_TIMES.length && this.t >= PACT_TIMES[this.pactIndex]) {
      this.openPact();
      return;
    }

    if (!this.boss && this.t >= BOSS_AT) {
      this.boss = this.spawner.spawnBoss(this);
      this.audio.boss();
      this.announce(
        this.boundGod ? `${this.boundGod.name.toUpperCase()} COMES TO COLLECT` : 'THE WARDEN',
      );
    }
  }

  private updateWeapons(dt: number) {
    const haste = this.stats.haste * this.hasteBonus;
    for (const w of this.weapons) {
      const def = WEAPONS[w.id];
      if (def.tick) def.tick(this, w, dt);
      if (!def.interval || !def.fire) continue;
      w.t -= dt * haste;
      if (w.t <= 0) {
        w.t = Math.max(0.08, def.interval(w.level));
        def.fire(this, w);
      }
    }
  }

  private updateFamiliars(dt: number) {
    const p = this.player;
    for (const f of this.familiars) {
      f.hitCd = Math.max(0, f.hitCd - dt);

      if (f.mode === 'orbit') {
        f.angle += f.spin * dt;
        f.x = p.x + Math.cos(f.angle) * f.dist;
        f.y = p.y + Math.sin(f.angle) * f.dist;

        // Grenadiers fire outward on their own cadence.
        if (f.weapon === 'army') {
          f.fireT -= dt * this.stats.haste;
          if (f.fireT <= 0) {
            f.fireT = 1.9;
            const target = this.nearest(f.x, f.y, 340);
            const a = target ? Math.atan2(target.y - f.y, target.x - f.x) : f.angle;
            this.shoot(f.x, f.y, Math.cos(a) * 420, Math.sin(a) * 420, f.dmg * 0.7, {
              r: 3.5,
              life: 0.9,
              color: f.color,
            });
          }
        }
      } else {
        // Ravens: fly out to a mark, strike, come home, repeat.
        if (f.state === 0) {
          const target = this.nearest(p.x, p.y, f.dist);
          if (target) {
            f.tx = target.x;
            f.ty = target.y;
            f.state = 1;
          } else {
            f.angle += 2.2 * dt;
            f.x = p.x + Math.cos(f.angle) * 44;
            f.y = p.y + Math.sin(f.angle) * 44;
          }
        }
        if (f.state === 1) {
          const dx = f.tx - f.x;
          const dy = f.ty - f.y;
          const d = Math.hypot(dx, dy) || 1;
          const sp = 470 * dt;
          f.x += (dx / d) * sp;
          f.y += (dy / d) * sp;
          if (d < 22) f.state = 2;
        } else if (f.state === 2) {
          const dx = p.x - f.x;
          const dy = p.y - f.y;
          const d = Math.hypot(dx, dy) || 1;
          f.x += (dx / d) * 420 * dt;
          f.y += (dy / d) * 420 * dt;
          if (d < 40) f.state = 0;
        }
      }

      if (f.hitCd <= 0) {
        let struck = false;
        this.forEachInRadius(f.x, f.y, f.r + 8, (e) => {
          if (struck) return;
          struck = true;
          this.hit(e, f.dmg, { color: f.color, knock: 90 });
        });
        if (struck) f.hitCd = f.mode === 'seek' ? 0.18 : 0.28;
      }
    }
  }

  private updateEnemies(dt: number) {
    const p = this.player;
    const bandSpeed = this.speedBand.enemySpeed * this.enemySpeedMul;

    for (const e of this.enemies) {
      if (!e.alive) continue;

      e.flash = Math.max(0, e.flash - dt);
      e.slow = Math.max(0, e.slow - dt * 0.9);
      e.phase += dt;

      let dx = p.x - e.x;
      let dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      dx /= dist;
      dy /= dist;

      const sp = e.speed * bandSpeed * (1 - e.slow) * (e.boss ? 1 : 1);
      let mx = dx * sp;
      let my = dy * sp;

      switch (e.behaviour) {
        case 'dart': {
          e.timer -= dt;
          if (e.timer <= 0) {
            e.timer = this.rng.range(1.1, 2.2);
            e.kx += dx * 190;
            e.ky += dy * 190;
          }
          break;
        }
        case 'drift': {
          // Strafes around its approach vector — harder to funnel into a weapon.
          const s = Math.sin(e.phase * 2.1) * 0.8;
          mx = (dx * Math.cos(s) - dy * Math.sin(s)) * sp;
          my = (dx * Math.sin(s) + dy * Math.cos(s)) * sp;
          break;
        }
        case 'ranged': {
          if (dist < 230) {
            mx *= -0.25;
            my *= -0.25;
          }
          e.timer -= dt;
          if (e.timer <= 0 && dist < 420) {
            e.timer = 2.5;
            const b = this.takeBullet(this.ebullets);
            if (b) {
              b.alive = true;
              b.x = e.x;
              b.y = e.y;
              b.vx = dx * 190;
              b.vy = dy * 190;
              b.dmg = e.dmg;
              b.r = 6;
              b.life = 3.4;
              b.pierce = 0;
              b.color = e.rim;
              b.kind = 2;
              b.homing = 0;
              b.aoe = 0;
              b.hit.length = 0;
              b.spin = 0;
            }
          }
          break;
        }
        case 'blink': {
          e.timer -= dt;
          if (e.timer <= 0 && dist > 120) {
            e.timer = 3.2;
            this.fx.spark(e.x, e.y, e.rim, 6, 90);
            e.x += dx * 130;
            e.y += dy * 130;
          }
          break;
        }
        case 'flicker': {
          // Only solid — and only dangerous — while it is visible.
          e.fade = 0.5 + Math.sin(e.phase * 1.7) * 0.5;
          if (e.fade < 0.45) {
            mx *= 1.5;
            my *= 1.5;
          }
          break;
        }
        default:
          break;
      }

      e.vx = mx + e.kx;
      e.vy = my + e.ky;
      e.kx *= 1 - Math.min(1, 7 * dt);
      e.ky *= 1 - Math.min(1, 7 * dt);
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Cheap separation so bodies form a wall instead of a single stack.
      if (!e.boss) {
        let pushes = 0;
        this.grid.query(e.x, e.y, e.r * 2, (o) => {
          if (pushes >= 5 || o === e || !o.alive) return;
          const ox = e.x - o.x;
          const oy = e.y - o.y;
          const d2 = ox * ox + oy * oy;
          const min = e.r + o.r;
          if (d2 > 0.01 && d2 < min * min) {
            const d = Math.sqrt(d2);
            const push = ((min - d) / d) * 0.5;
            e.x += ox * push;
            e.y += oy * push;
            pushes++;
          }
        });
      }

      // Contact.
      const solid = e.behaviour !== 'flicker' || e.fade > 0.55;
      if (solid && dist < e.r + 12) {
        this.hurtPlayer(e.dmg);
        if (!e.boss) {
          e.kx += -dx * 220;
          e.ky += -dy * 220;
        }
      }

      // Cull anything that has wandered far outside the arena.
      if (dist > this.spawnRadius * 3.2) e.alive = false;
    }
  }

  private updateBullets(dt: number) {
    const p = this.player;

    for (const b of this.bullets) {
      if (!b.alive) continue;
      b.life -= dt;

      if (b.kind === 3) {
        // Anubis' scale: sits, then detonates.
        if (b.life <= 0) {
          this.boom(b.x, b.y, b.aoe, b.dmg, b.color);
          b.alive = false;
        }
        continue;
      }

      if (b.life <= 0) {
        b.alive = false;
        continue;
      }

      if (b.homing > 0) {
        const target = this.nearest(b.x, b.y, 300);
        if (target) {
          const a = Math.atan2(target.y - b.y, target.x - b.x);
          const sp = Math.hypot(b.vx, b.vy);
          b.vx += (Math.cos(a) * sp - b.vx) * Math.min(1, b.homing * dt);
          b.vy += (Math.sin(a) * sp - b.vy) * Math.min(1, b.homing * dt);
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.spin += dt * 9;

      let consumed = false;
      this.forEachInRadius(b.x, b.y, b.r + 4, (e) => {
        if (consumed || !e.alive || b.hit.includes(e.uid)) return;
        b.hit.push(e.uid);

        if (b.aoe > 0) {
          this.boom(b.x, b.y, b.aoe, b.dmg, b.color);
          consumed = true;
        } else {
          this.hit(e, b.dmg, { color: b.color, knock: 70 });
          if (b.pierce > 0) b.pierce--;
          else consumed = true;
        }
      });
      if (consumed) b.alive = false;
    }

    for (const b of this.ebullets) {
      if (!b.alive) continue;
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0) {
        b.alive = false;
        continue;
      }
      if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + 11) {
        this.hurtPlayer(b.dmg);
        b.alive = false;
      }
    }
  }

  private updateGems(dt: number) {
    const p = this.player;
    const pull = this.stats.pickup;

    for (const g of this.gems) {
      if (!g.alive) continue;
      g.t += dt;
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d = Math.hypot(dx, dy) || 1;

      if (!g.pulled && d < pull) g.pulled = true;

      if (g.pulled) {
        const sp = Math.min(760, 220 + (pull - d) * 5.5);
        g.x += (dx / d) * sp * dt;
        g.y += (dy / d) * sp * dt;
      } else {
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.vx *= 1 - 3 * dt;
        g.vy *= 1 - 3 * dt;
      }

      if (d < 18) {
        g.alive = false;
        if (g.kind === 0) {
          this.gainXp(g.value);
          this.audio.pickup();
        } else if (g.kind === 1) {
          this.heal(g.value);
          this.fx.text(p.x, p.y - 22, `+${Math.round(g.value)}`, '#7ec98a');
          this.audio.pickup();
        } else {
          this.bonusShards += g.value;
          this.fx.text(p.x, p.y - 22, `+${g.value}`, '#e0a13c');
          this.audio.pickup();
        }
      }
    }
  }

  bonusShards = 0;

  // ── End of run ───────────────────────────────────────────────────

  finish(won: boolean) {
    if (this.ended) return;
    this.ended = true;
    this.won = won;
    this.phase = 'over';
    this.audio.stopRun();
    if (won) this.audio.extract();
    else this.audio.death();
  }

  get shardsEarned() {
    const tithe = save.altar.tithe ?? 0;
    const base =
      this.kills * 0.42 + this.t * 0.85 + this.dread * 1.5 + this.bonusShards + (this.won ? 130 : 0);
    return Math.max(1, Math.round(base * this.mods.shard * (1 + tithe * 0.12)));
  }

  get fragmentsEarned() {
    return 1 + (this.won ? 2 : 0) + (this.dread >= 100 ? 1 : 0) + (this.daily ? 2 : 0);
  }
}

export { MODIFIERS };

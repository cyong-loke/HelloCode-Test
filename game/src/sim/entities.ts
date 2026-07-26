import type { Behaviour } from '../types';

/**
 * Plain pooled objects. A run peaks around 900 live enemies and 400 bullets, so
 * everything is allocated once, flagged dead, and reused — no per-frame garbage.
 */

export interface Enemy {
  uid: number;
  alive: boolean;
  def: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  r: number;
  speed: number;
  dmg: number;
  xp: number;
  rim: string;
  eyes: number;
  behaviour: Behaviour;
  elite: boolean;
  boss: boolean;
  flash: number;
  /** Per-behaviour scratch: wobble phase, blink timer, shot timer. */
  phase: number;
  timer: number;
  /** Knockback velocity, decays fast. */
  kx: number;
  ky: number;
  slow: number;
  fade: number;
}

export interface Bullet {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  r: number;
  life: number;
  pierce: number;
  color: string;
  /** 0 = shard, 1 = bolt, 2 = enemy shot, 3 = scale (detonates on expiry). */
  kind: number;
  homing: number;
  aoe: number;
  hit: number[];
  spin: number;
}

export interface Gem {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  /** 0 = xp, 1 = health, 2 = shard cache, 3 = coffin. */
  kind: number;
  pulled: boolean;
  t: number;
}

export interface Familiar {
  weapon: string;
  mode: 'orbit' | 'seek';
  angle: number;
  dist: number;
  x: number;
  y: number;
  r: number;
  dmg: number;
  color: string;
  spin: number;
  fireT: number;
  hitCd: number;
  /** seek mode only */
  state: number;
  tx: number;
  ty: number;
}

export interface Particle {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  color: string;
  /** 0 = spark, 1 = ring, 2 = arc, 3 = text. */
  kind: number;
  x2: number;
  y2: number;
  text: string;
}

export const newEnemy = (): Enemy => ({
  uid: 0,
  alive: false,
  def: 'crawler',
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  hp: 1,
  maxHp: 1,
  r: 10,
  speed: 40,
  dmg: 5,
  xp: 1,
  rim: '#3d4a5a',
  eyes: 2,
  behaviour: 'chase',
  elite: false,
  boss: false,
  flash: 0,
  phase: 0,
  timer: 0,
  kx: 0,
  ky: 0,
  slow: 0,
  fade: 1,
});

export const newBullet = (): Bullet => ({
  alive: false,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  dmg: 1,
  r: 4,
  life: 0,
  pierce: 0,
  color: '#d8d2c4',
  kind: 0,
  homing: 0,
  aoe: 0,
  hit: [],
  spin: 0,
});

export const newGem = (): Gem => ({
  alive: false,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  value: 1,
  kind: 0,
  pulled: false,
  t: 0,
});

export const newParticle = (): Particle => ({
  alive: false,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  life: 0,
  maxLife: 1,
  r: 2,
  color: '#d8d2c4',
  kind: 0,
  x2: 0,
  y2: 0,
  text: '',
});

/** Fixed-cell spatial hash. Rebuilt every frame — cheaper than incremental for this density. */
export class Grid {
  private cells = new Map<number, Enemy[]>();
  private readonly cell: number;

  constructor(cellSize = 64) {
    this.cell = cellSize;
  }

  private key(cx: number, cy: number) {
    // Cantor-ish pack; coordinates stay well inside 16-bit after the offset.
    return ((cx + 32768) << 16) | (cy + 32768);
  }

  /** Returns how many entries were live, so callers need not scan again. */
  rebuild(list: Enemy[]): number {
    this.cells.clear();
    let n = 0;
    for (const e of list) {
      if (!e.alive) continue;
      n++;
      const k = this.key(Math.floor(e.x / this.cell), Math.floor(e.y / this.cell));
      const bucket = this.cells.get(k);
      if (bucket) bucket.push(e);
      else this.cells.set(k, [e]);
    }
    return n;
  }

  /** Visits every enemy whose cell overlaps the query circle. */
  query(x: number, y: number, radius: number, visit: (e: Enemy) => void) {
    const c = this.cell;
    const x0 = Math.floor((x - radius) / c);
    const x1 = Math.floor((x + radius) / c);
    const y0 = Math.floor((y - radius) / c);
    const y1 = Math.floor((y + radius) / c);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const bucket = this.cells.get(this.key(cx, cy));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) visit(bucket[i]);
      }
    }
  }
}

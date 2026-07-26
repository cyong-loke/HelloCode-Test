import { TAU, angDiff } from '../core/math';
import type { Run } from './run';

export interface WeaponState {
  id: string;
  level: number;
  t: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  glyph: string;
  color: string;
  max: number;
  desc: (level: number) => string;
  /** Seconds between activations before haste is applied. */
  interval?: (level: number) => number;
  fire?: (run: Run, w: WeaponState) => void;
  tick?: (run: Run, w: WeaponState, dt: number) => void;
  /** Orbiters/seekers this weapon maintains at a given level. */
  familiars?: (level: number) => number;
  familiarKind?: 'orbit' | 'seek';
  familiarStats?: (run: Run, level: number) => { r: number; dist: number; dmg: number };
}

const list: WeaponDef[] = [
  // ── Signature weapons ───────────────────────────────────────────────
  {
    id: 'arc',
    name: 'Arc Coil',
    glyph: '⚡',
    color: '#9fd8ff',
    max: 8,
    desc: (l) => `Lightning leaps to the nearest body and chains to ${2 + Math.floor(l / 2)} more.`,
    interval: (l) => 1.15 - l * 0.055,
    fire(run, w) {
      const p = run.player;
      const reach = 290 * run.stats.area;
      let cur = run.nearest(p.x, p.y, reach);
      if (!cur) return;

      let dmg = 9 + 5.4 * w.level;
      const chains = 2 + Math.floor(w.level / 2);
      const seen = new Set<number>();
      let fx = p.x;
      let fy = p.y;

      for (let i = 0; i <= chains; i++) {
        run.fx.arc(fx, fy, cur.x, cur.y, this.color);
        run.hit(cur, dmg, { color: this.color });
        seen.add(cur.uid);
        const next = run.nearest(cur.x, cur.y, 165 * run.stats.area, seen);
        if (!next) break;
        fx = cur.x;
        fy = cur.y;
        cur = next;
        dmg *= 0.86;
      }
      run.audio.zap();
    },
  },

  {
    id: 'army',
    name: 'Grande Armée',
    glyph: '⚜',
    color: '#e0c05a',
    max: 8,
    desc: (l) => `${3 + Math.floor((l - 1) / 2)} grenadier shades orbit you and fire outward.`,
    familiars: (l) => 3 + Math.floor((l - 1) / 2),
    familiarKind: 'orbit',
    familiarStats: (run, l) => ({
      r: 9,
      dist: 62 * run.stats.area,
      dmg: 7 + 3.4 * l,
    }),
  },

  {
    id: 'scythe',
    name: 'Crimson Scythe',
    glyph: '☾',
    color: '#d0435a',
    max: 8,
    desc: () => `A wide sweep in the direction you are moving. Throws bodies back.`,
    interval: (l) => 1.35 - l * 0.07,
    fire(run, w) {
      const p = run.player;
      const R = (74 + w.level * 5) * run.stats.area;
      const dmg = 13 + 7.5 * w.level;
      const facing = Math.atan2(p.dirY, p.dirX);
      const half = 1.25;
      run.forEachInRadius(p.x, p.y, R, (e) => {
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        if (Math.abs(angDiff(facing, a)) <= half) run.hit(e, dmg, { color: this.color, knock: 210 });
      });
      run.fx.sweep(p.x, p.y, R, facing, half, this.color);
      run.audio.swipe();
    },
  },

  {
    id: 'bath',
    name: 'Crimson Bath',
    glyph: '⚘',
    color: '#b1263a',
    max: 8,
    desc: () => `A standing pool of blood burns and slows everything inside it.`,
    tick(run, w, dt) {
      const p = run.player;
      const R = (70 + w.level * 6) * run.stats.area;
      const dps = 7 + 4.6 * w.level;
      run.forEachInRadius(p.x, p.y, R, (e) => run.hit(e, dps * dt, { quiet: true, slow: 0.42 }));
      run.auraRadius = R;
    },
  },

  {
    id: 'scales',
    name: 'Weigh the Heart',
    glyph: '⚖',
    color: '#d4a24c',
    max: 8,
    desc: (l) =>
      `Sets a scale on the crowd; it detonates a beat later. ${Math.round((0.2 + l * 0.055) * 100)}% of the dead leave one behind.`,
    // The on-kill half lives in Run.killEnemy. This half is what makes the
    // weapon able to open a fight at all — on-kill alone cannot get the first kill.
    interval: (l) => 1.7 - l * 0.09,
    fire(run, w) {
      const p = run.player;
      const target = run.randomEnemyNear(p.x, p.y, 300 * run.stats.area);
      const x = target ? target.x : p.x + run.rng.range(-90, 90);
      const y = target ? target.y : p.y + run.rng.range(-90, 90);
      run.dropScale(x, y, 18 + 10 * w.level, 66 * run.stats.area);
    },
  },

  {
    id: 'ravens',
    name: 'Huginn & Muninn',
    glyph: '↟',
    color: '#a9bccb',
    max: 8,
    desc: (l) => `${2 + Math.floor(l / 3)} ravens hunt on their own and come back to you.`,
    familiars: (l) => 2 + Math.floor(l / 3),
    familiarKind: 'seek',
    familiarStats: (run, l) => ({
      r: 8,
      dist: 300 * run.stats.area,
      dmg: 16 + 9 * l,
    }),
  },

  {
    id: 'judgment',
    name: 'Judgment',
    glyph: '𐤕',
    color: '#f0e08a',
    max: 8,
    desc: (l) => `${1 + Math.floor(l / 2)} bolts fall from nothing. Dread makes them heavier.`,
    interval: (l) => 2.0 - l * 0.09,
    fire(run, w) {
      const p = run.player;
      const strikes = 1 + Math.floor(w.level / 2);
      // The whole point of Zeus: this weapon wants you to be terrified.
      const dread = 1 + run.dread / 90;
      const dmg = (20 + 11 * w.level) * dread;
      const R = 58 * run.stats.area;

      for (let i = 0; i < strikes; i++) {
        const target = run.randomEnemyNear(p.x, p.y, 340 * run.stats.area);
        const tx = target ? target.x : p.x + run.rng.range(-200, 200);
        const ty = target ? target.y : p.y + run.rng.range(-200, 200);
        run.boom(tx, ty, R, dmg, this.color);
        run.fx.arc(tx, ty - 420, tx, ty, this.color);
      }
      run.audio.thunder();
    },
  },

  {
    id: 'morningstar',
    name: 'Morningstar',
    glyph: '✦',
    color: '#f0a058',
    max: 8,
    desc: (l) => `${2 + Math.floor(l / 2)} blades of cold light turn around you.`,
    familiars: (l) => 2 + Math.floor(l / 2),
    familiarKind: 'orbit',
    familiarStats: (run, l) => ({
      r: 15,
      dist: 88 * run.stats.area,
      dmg: 18 + 10 * l,
    }),
  },

  // ── Universal secondaries ───────────────────────────────────────────
  {
    id: 'shards',
    name: 'Bone Shards',
    glyph: '⁂',
    color: '#d8d2c4',
    max: 8,
    desc: (l) => `A fan of ${2 + l} splinters at the nearest body.`,
    interval: (l) => 1.5 - l * 0.075,
    fire(run, w) {
      const p = run.player;
      const target = run.nearest(p.x, p.y, 420);
      const base = target ? Math.atan2(target.y - p.y, target.x - p.x) : Math.atan2(p.dirY, p.dirX);
      const n = 2 + w.level + run.stats.count;
      const dmg = 8 + 4.2 * w.level;
      const spread = 0.16;

      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * spread;
        run.shoot(p.x, p.y, Math.cos(a) * 470, Math.sin(a) * 470, dmg, {
          r: 4,
          life: 1.0,
          color: this.color,
        });
      }
      run.audio.shot();
    },
  },

  {
    id: 'bolt',
    name: 'Grave Bolt',
    glyph: '†',
    color: '#8e6bbf',
    max: 8,
    desc: () => `A heavy bolt that follows its mark and bursts on contact.`,
    interval: (l) => 2.1 - l * 0.115,
    fire(run, w) {
      const p = run.player;
      const target = run.nearest(p.x, p.y, 460);
      const a = target ? Math.atan2(target.y - p.y, target.x - p.x) : run.rng.range(0, TAU);
      run.shoot(p.x, p.y, Math.cos(a) * 300, Math.sin(a) * 300, 26 + 15 * w.level, {
        r: 7,
        life: 2.4,
        color: this.color,
        kind: 1,
        homing: 5.5,
        aoe: 46 * run.stats.area,
      });
      run.audio.shot();
    },
  },

  {
    id: 'ring',
    name: 'Hollow Ring',
    glyph: '◌',
    color: '#c7bfae',
    max: 8,
    desc: (l) => `${2 + Math.floor((l + 1) / 2)} finger bones circle you, close in.`,
    familiars: (l) => 2 + Math.floor((l + 1) / 2),
    familiarKind: 'orbit',
    familiarStats: (run, l) => ({
      r: 7,
      dist: 46 * run.stats.area,
      dmg: 9 + 5 * l,
    }),
  },
];

export const WEAPONS: Record<string, WeaponDef> = Object.fromEntries(
  list.map((w) => [w.id, w]),
);

/** Secondaries the level-up deck may offer to anyone. */
export const UNIVERSAL_WEAPONS = ['shards', 'bolt', 'ring'];

import { TAU } from '../core/math';
import { ENEMIES } from '../content/enemies';
import type { EnemyDef } from '../types';
import type { Run } from './run';

/** Scripted pressure spikes. Each fires once. */
interface Surge {
  at: number;
  def: string;
  count: number;
  fired: boolean;
  label?: string;
}

export const BOSS_AT = 225;

/** Chosen from the stress test: 60fps holds comfortably below this. */
const LIVE_CAP = 620;

export class Spawner {
  private acc = 0;
  private surges: Surge[] = [
    { at: 75, def: 'wretch', count: 46, fired: false, label: 'THEY COME ALL AT ONCE' },
    { at: 132, def: 'husk', count: 8, fired: false, label: 'SOMETHING WIDE IS WALKING' },
    { at: 165, def: 'wretch', count: 72, fired: false, label: 'THEY COME ALL AT ONCE' },
    { at: 196, def: 'shade', count: 20, fired: false, label: 'YOU ARE NOT ALONE IN HERE' },
  ];

  reset() {
    this.acc = 0;
    for (const s of this.surges) s.fired = false;
  }

  update(run: Run, dt: number) {
    const t = run.t;

    for (const s of this.surges) {
      if (!s.fired && t >= s.at) {
        s.fired = true;
        for (let i = 0; i < s.count; i++) this.spawn(run, s.def, false);
        if (s.label) run.announce(s.label);
      }
    }

    // Boss replaces the stream — a trickle keeps the arena from feeling empty.
    const bossFight = run.boss !== null;
    const rate = (bossFight ? 2.4 : 2.4 + t * 0.155) * run.mods.spawn;

    this.acc += rate * dt;
    const budget = Math.min(this.acc, 40);
    this.acc -= Math.floor(budget);

    // Hard ceiling on live bodies. A spawn-doubling pact plus a build that
    // cannot keep up will otherwise saturate the pool, and the frame budget
    // with it — the arena is already unsurvivable well before this bites.
    if (run.aliveCount >= LIVE_CAP) {
      this.acc = 0;
      return;
    }

    for (let i = 0; i < Math.floor(budget); i++) {
      const def = this.roll(run);
      const elite = !bossFight && run.rng.chance(Math.min(0.09, 0.008 + t * 0.00055));
      this.spawn(run, def.id, elite);
    }
  }

  private roll(run: Run): EnemyDef {
    const t = run.t;
    const pool = ENEMIES.filter((e) => t >= e.from);
    // Older archetypes fade out so late waves are not 90% crawlers.
    return run.rng.weighted(pool, (e) => {
      const age = t - e.from;
      const falloff = e.from === 0 ? Math.max(0.25, 1 - age / 260) : 1;
      return e.weight * falloff;
    });
  }

  spawn(run: Run, defId: string, elite: boolean) {
    const e = run.takeEnemy();
    if (!e) return;
    const def = ENEMIES.find((x) => x.id === defId) ?? ENEMIES[0];

    // Health climbs steadily; speed is left to the Dread band so the player can
    // feel exactly which of the two is making the run harder.
    const hpScale = 1 + run.t * 0.0152;
    const eliteMul = elite ? 7 : 1;

    const a = run.rng.range(0, TAU);
    const d = run.spawnRadius + run.rng.range(0, 70);

    e.alive = true;
    e.uid = run.nextUid++;
    e.def = def.id;
    e.x = run.player.x + Math.cos(a) * d;
    e.y = run.player.y + Math.sin(a) * d;
    e.vx = e.vy = 0;
    e.maxHp = e.hp = def.hp * hpScale * eliteMul * run.enemyHpMul;
    e.r = def.r * (elite ? 1.7 : 1) * run.enemyScale;
    e.speed = def.speed;
    e.dmg = def.dmg * (elite ? 1.5 : 1);
    e.xp = def.xp * (elite ? 8 : 1);
    e.rim = def.rim;
    e.eyes = def.eyes;
    e.behaviour = def.behaviour;
    e.elite = elite;
    e.boss = false;
    e.flash = 0;
    e.phase = run.rng.range(0, TAU);
    e.timer = run.rng.range(0.5, 2.5);
    e.kx = e.ky = 0;
    e.slow = 0;
    e.fade = def.behaviour === 'flicker' ? 0.25 : 1;
  }

  /** The 3:45 boss — the god you owe, or the Warden if you owe nobody. */
  spawnBoss(run: Run) {
    const e = run.takeEnemy();
    if (!e) return null;
    const god = run.boundGod;

    e.alive = true;
    e.uid = run.nextUid++;
    e.def = 'boss';
    const a = run.rng.range(0, TAU);
    e.x = run.player.x + Math.cos(a) * (run.spawnRadius + 40);
    e.y = run.player.y + Math.sin(a) * (run.spawnRadius + 40);
    e.vx = e.vy = 0;
    // Tuned against a level-30 build: roughly a 20-second fight. Dread is the
    // dominant term, so the greedier the run, the larger the thing at the end.
    e.maxHp = e.hp = 14000 + run.t * 30 + run.dread * 140;
    e.r = 46;
    e.speed = 52;
    e.dmg = 26;
    e.xp = 60;
    e.rim = god ? god.color : '#d8d2c4';
    e.eyes = 5;
    e.behaviour = 'chase';
    e.elite = false;
    e.boss = true;
    e.flash = 0;
    e.phase = 0;
    e.timer = 2;
    e.kx = e.ky = 0;
    e.slow = 0;
    e.fade = 1;
    return e;
  }
}

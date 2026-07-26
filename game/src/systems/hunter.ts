import { TAU } from '../core/math';
import type { God } from '../types';
import type { Run } from '../sim/run';

export interface Hazard {
  x: number;
  y: number;
  r: number;
  life: number;
  maxLife: number;
}

export interface Clone {
  x: number;
  y: number;
}

/**
 * The thing you bought. It spawns at 100 Dread, it cannot be killed, and it is
 * faster than you in a straight line — every behaviour below is a different
 * answer to "so how do you get away from it".
 */
export class Hunter {
  active = false;
  god: God | null = null;
  x = 0;
  y = 0;
  r = 26;
  /** Rendering only: how far into its spawn animation it is. */
  birth = 0;
  private state = 0;
  private timer = 0;
  private vx = 0;
  private vy = 0;
  private trail: Array<{ x: number; y: number }> = [];
  hazards: Hazard[] = [];
  clones: Clone[] = [];
  private hitCd = 0;

  spawn(run: Run, god: God) {
    this.active = true;
    this.god = god;
    this.birth = 0;
    this.state = 0;
    this.timer = 0;
    this.hitCd = 0;
    this.trail.length = 0;
    this.hazards.length = 0;
    this.clones.length = 0;

    const a = run.rng.range(0, TAU);
    const d = run.spawnRadius * 0.75;
    this.x = run.player.x + Math.cos(a) * d;
    this.y = run.player.y + Math.sin(a) * d;
    if (god.hunterKind === 'split') this.clones.push({ x: this.x, y: this.y });
  }

  reset() {
    this.active = false;
    this.god = null;
    this.hazards.length = 0;
    this.clones.length = 0;
  }

  update(run: Run, dt: number) {
    if (!this.active || !this.god) return;
    this.birth = Math.min(1, this.birth + dt * 0.7);
    this.hitCd = Math.max(0, this.hitCd - dt);

    const p = run.player;
    const speed = this.god.hunterSpeed * this.birth;
    let dx = p.x - this.x;
    let dy = p.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    dx /= dist;
    dy /= dist;

    switch (this.god.hunterKind) {
      case 'charge': {
        // Telegraph, then commit. Readable, and punishing if you stand still.
        this.timer -= dt;
        if (this.state === 0) {
          this.x += dx * speed * 0.45 * dt;
          this.y += dy * speed * 0.45 * dt;
          if (this.timer <= 0) {
            this.state = 1;
            this.timer = 0.85;
            this.vx = dx;
            this.vy = dy;
          }
        } else if (this.state === 1) {
          if (this.timer <= 0) {
            this.state = 2;
            this.timer = 0.62;
            run.audio.swipe();
          }
        } else {
          this.x += this.vx * speed * 3.1 * dt;
          this.y += this.vy * speed * 3.1 * dt;
          if (this.timer <= 0) {
            this.state = 0;
            this.timer = 1.5;
          }
        }
        break;
      }

      case 'grind': {
        this.x += dx * speed * dt;
        this.y += dy * speed * dt;
        this.timer -= dt;
        if (this.timer <= 0) {
          this.timer = 0.22;
          this.hazards.push({ x: this.x, y: this.y, r: 30, life: 5.5, maxLife: 5.5 });
          if (this.hazards.length > 90) this.hazards.shift();
        }
        break;
      }

      case 'blink': {
        this.timer -= dt;
        this.x += dx * speed * 0.5 * dt;
        this.y += dy * speed * 0.5 * dt;
        if (this.timer <= 0) {
          this.timer = 2.7;
          const a = run.rng.range(0, TAU);
          const d = run.rng.range(110, 190);
          this.x = p.x + Math.cos(a) * d;
          this.y = p.y + Math.sin(a) * d;
          run.fx.shock(this.x, this.y, 60, this.god.color);
          run.audio.zap();
        }
        break;
      }

      case 'mimic': {
        // Matches your speed exactly, so it only closes when you hesitate.
        const mine = Math.hypot(p.vx, p.vy);
        const s = Math.max(speed * 0.55, Math.min(mine * 1.02, speed * 1.35));
        this.x += dx * s * dt;
        this.y += dy * s * dt;
        break;
      }

      case 'split': {
        this.timer -= dt;
        if (this.timer <= 0 && this.clones.length < 5) {
          this.timer = 7;
          this.clones.push({ x: this.x, y: this.y });
          run.fx.shock(this.x, this.y, 70, this.god.color);
        }
        const each = speed * (1 - this.clones.length * 0.08);
        this.x += dx * each * 0.5 * dt;
        this.y += dy * each * 0.5 * dt;
        for (const c of this.clones) {
          let cx = p.x - c.x;
          let cy = p.y - c.y;
          const cd = Math.hypot(cx, cy) || 1;
          c.x += (cx / cd) * each * dt;
          c.y += (cy / cd) * each * dt;
        }
        break;
      }

      case 'dark': {
        this.x += dx * speed * dt;
        this.y += dy * speed * dt;
        // The closer it gets, the less of the world you are allowed to see.
        run.hunterBlind = Math.max(0, 1 - dist / 520) * 0.55;
        break;
      }
    }

    // Fading fire trail.
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.life -= dt;
      if (h.life <= 0) this.hazards.splice(i, 1);
      else if (Math.hypot(p.x - h.x, p.y - h.y) < h.r + 12) run.hurtPlayer(11 * dt, true);
    }

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 14) this.trail.shift();

    // Contact — heavy, and it shoves you away so it is survivable but never free.
    if (this.hitCd <= 0) {
      const bodies: Clone[] = [{ x: this.x, y: this.y }, ...this.clones];
      for (const b of bodies) {
        if (Math.hypot(p.x - b.x, p.y - b.y) < this.r + 13) {
          run.hurtPlayer(26);
          const a = Math.atan2(p.y - b.y, p.x - b.x);
          p.vx += Math.cos(a) * 320;
          p.vy += Math.sin(a) * 320;
          this.hitCd = 0.9;
          break;
        }
      }
    }
  }

  get trailPoints() {
    return this.trail;
  }
}

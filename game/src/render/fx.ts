import { TAU } from '../core/math';
import { newParticle, type Particle } from '../sim/entities';

/**
 * A single pooled particle array covering every visual flourish in the game.
 * `kind` selects the draw path: 0 spark, 1 ring, 2 arc, 3 floating text,
 * 4 sweep wedge, 5 shockwave.
 */
export class Fx {
  readonly items: Particle[] = [];
  private cursor = 0;

  constructor(private cap = 900) {
    for (let i = 0; i < cap; i++) this.items.push(newParticle());
  }

  private take(): Particle {
    // Ring buffer: at capacity the oldest effect is simply overwritten.
    for (let i = 0; i < this.cap; i++) {
      const p = this.items[this.cursor];
      this.cursor = (this.cursor + 1) % this.cap;
      if (!p.alive) return p;
    }
    const p = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.cap;
    return p;
  }

  spark(x: number, y: number, color: string, count = 5, speed = 130) {
    for (let i = 0; i < count; i++) {
      const p = this.take();
      const a = Math.random() * TAU;
      const s = speed * (0.35 + Math.random() * 0.9);
      p.alive = true;
      p.kind = 0;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.life = p.maxLife = 0.24 + Math.random() * 0.3;
      p.r = 1.4 + Math.random() * 2;
      p.color = color;
    }
  }

  ring(x: number, y: number, radius: number, color: string, life = 0.36) {
    const p = this.take();
    p.alive = true;
    p.kind = 1;
    p.x = x;
    p.y = y;
    p.vx = p.vy = 0;
    p.life = p.maxLife = life;
    p.r = radius;
    p.color = color;
  }

  arc(x1: number, y1: number, x2: number, y2: number, color: string) {
    const p = this.take();
    p.alive = true;
    p.kind = 2;
    p.x = x1;
    p.y = y1;
    p.x2 = x2;
    p.y2 = y2;
    p.life = p.maxLife = 0.12;
    p.r = 2;
    p.color = color;
  }

  text(x: number, y: number, text: string, color: string) {
    const p = this.take();
    p.alive = true;
    p.kind = 3;
    p.x = x;
    p.y = y;
    p.vx = (Math.random() - 0.5) * 26;
    p.vy = -58;
    p.life = p.maxLife = 0.72;
    p.r = 13;
    p.color = color;
    p.text = text;
  }

  sweep(x: number, y: number, radius: number, facing: number, half: number, color: string) {
    const p = this.take();
    p.alive = true;
    p.kind = 4;
    p.x = x;
    p.y = y;
    p.x2 = facing;
    p.y2 = half;
    p.life = p.maxLife = 0.2;
    p.r = radius;
    p.color = color;
  }

  shock(x: number, y: number, radius: number, color: string) {
    const p = this.take();
    p.alive = true;
    p.kind = 5;
    p.x = x;
    p.y = y;
    p.life = p.maxLife = 0.42;
    p.r = radius;
    p.color = color;
  }

  update(dt: number) {
    for (const p of this.items) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      if (p.kind === 0 || p.kind === 3) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 1 - 3.2 * dt;
        p.vy *= 1 - 3.2 * dt;
      }
    }
  }

  clear() {
    for (const p of this.items) p.alive = false;
  }
}

import { TAU, clamp, fmtNum, fmtTime } from '../core/math';
import type { Input } from '../core/input';
import { WEAPONS } from '../sim/weapons';
import { WHISPERS } from '../systems/dread';
import type { Run } from '../sim/run';

const VOID = '#05070a';
const BONE = '#d8d2c4';
const DIM = 'rgba(216,210,196,0.42)';

/**
 * Canvas2D, no engine. Enemies are drawn as batched silhouettes: one path for
 * every body, then one path per rim colour, then one per eye colour — which
 * keeps ~900 enemies at three-ish fill calls instead of two thousand.
 */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  w = 0;
  h = 0;
  private camX = 0;
  private camY = 0;
  private vignetteCache: { key: string; grad: CanvasGradient } | null = null;
  private motes: Array<{ x: number; y: number; r: number; s: number }> = [];
  private lastFilter = '';
  /**
   * Unit blob outlines, as flat [x,y,...] pairs. Perfect circles read as
   * bubbles; irregular ones read as bodies. Precomputed so drawing one costs
   * a multiply-add per vertex and nothing else.
   */
  private blobs: Float32Array[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('canvas 2d unavailable');
    this.ctx = ctx;
    this.resize();
    const VERTS = 11;
    for (let v = 0; v < 8; v++) {
      const pts = new Float32Array(VERTS * 2);
      for (let i = 0; i < VERTS; i++) {
        const a = (i / VERTS) * TAU;
        // Two out-of-phase sines give a lumpy but never self-intersecting hull.
        const rr = 0.86 + Math.sin(a * 3 + v * 1.7) * 0.1 + Math.sin(a * 5 + v * 0.9) * 0.06;
        pts[i * 2] = Math.cos(a) * rr;
        pts[i * 2 + 1] = Math.sin(a) * rr;
      }
      this.blobs.push(pts);
    }

    for (let i = 0; i < 90; i++) {
      this.motes.push({
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 2000 - 1000,
        r: Math.random() * 1.6 + 0.4,
        s: Math.random() * 0.5 + 0.15,
      });
    }
  }

  resize() {
    // Cap DPR at 2: beyond that a mid-range phone spends its whole budget on fill rate.
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = this.canvas.clientWidth || window.innerWidth;
    this.h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.vignetteCache = null;
  }

  /** Dread's colour drain rides on a CSS filter — no per-pixel work at all. */
  setFilter(filter: string) {
    if (filter === this.lastFilter) return;
    this.lastFilter = filter;
    this.canvas.style.filter = filter;
  }

  draw(run: Run, input: Input, time: number) {
    const ctx = this.ctx;
    const p = run.player;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = VOID;
    ctx.fillRect(0, 0, this.w, this.h);

    // Camera: centred on the player, plus shake, plus the Dread "breath".
    const breath = run.bandInfo.breath;
    const bob = breath ? Math.sin(time * 1.6) * breath : 0;
    const sx = run.shake ? (Math.random() - 0.5) * run.shake : 0;
    const sy = run.shake ? (Math.random() - 0.5) * run.shake : 0;
    this.camX = p.x - this.w / 2 + sx;
    this.camY = p.y - this.h / 2 + sy + bob;

    ctx.save();
    ctx.translate(-this.camX, -this.camY);

    this.drawGround(time);
    this.drawGems(run);
    this.drawAura(run);
    this.drawEnemies(run);
    this.drawHunter(run);
    this.drawFamiliars(run);
    this.drawBullets(run);
    this.drawPlayer(run, time);
    this.drawFx(run);

    ctx.restore();

    this.drawVignette(run);
    this.drawStick(input);
    this.drawHud(run, time);
  }

  // ── World ────────────────────────────────────────────────────────

  private drawGround(time: number) {
    const ctx = this.ctx;
    const cell = 96;
    const x0 = Math.floor(this.camX / cell) * cell;
    const y0 = Math.floor(this.camY / cell) * cell;

    ctx.strokeStyle = 'rgba(216,210,196,0.035)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x < this.camX + this.w + cell; x += cell) {
      ctx.moveTo(x, this.camY);
      ctx.lineTo(x, this.camY + this.h);
    }
    for (let y = y0; y < this.camY + this.h + cell; y += cell) {
      ctx.moveTo(this.camX, y);
      ctx.lineTo(this.camX + this.w, y);
    }
    ctx.stroke();

    // Dust, wrapped around the camera so it never runs out.
    ctx.fillStyle = 'rgba(216,210,196,0.09)';
    const span = 1400;
    for (const m of this.motes) {
      const mx = ((((m.x + time * m.s * 14 - this.camX) % span) + span) % span) + this.camX - 200;
      const my = ((((m.y + time * m.s * 7 - this.camY) % span) + span) % span) + this.camY - 200;
      ctx.fillRect(mx, my, m.r, m.r);
    }
  }

  private drawAura(run: Run) {
    if (run.auraRadius <= 0) return;
    const ctx = this.ctx;
    const p = run.player;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, run.auraRadius);
    g.addColorStop(0, 'rgba(177,38,58,0.26)');
    g.addColorStop(1, 'rgba(177,38,58,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, run.auraRadius, 0, TAU);
    ctx.fill();
  }

  private drawGems(run: Run) {
    const ctx = this.ctx;
    const xp = new Path2D();
    const hp = new Path2D();
    const sh = new Path2D();
    for (const g of run.gems) {
      if (!g.alive) continue;
      const path = g.kind === 0 ? xp : g.kind === 1 ? hp : sh;
      path.moveTo(g.x + 3, g.y);
      path.arc(g.x, g.y, 3, 0, TAU);
    }
    ctx.fillStyle = '#6fa8c7';
    ctx.fill(xp);
    ctx.fillStyle = '#7ec98a';
    ctx.fill(hp);
    ctx.fillStyle = '#e0a13c';
    ctx.fill(sh);
  }

  private drawEnemies(run: Run) {
    const ctx = this.ctx;
    const bodies = new Path2D();
    const flashes = new Path2D();
    const rims = new Map<string, Path2D>();
    const eyes = new Map<string, Path2D>();

    const left = this.camX - 60;
    const right = this.camX + this.w + 60;
    const top = this.camY - 60;
    const bottom = this.camY + this.h + 60;

    for (const e of run.enemies) {
      if (!e.alive) continue;
      if (e.x < left || e.x > right || e.y < top || e.y > bottom) continue;
      if (e.behaviour === 'flicker' && e.fade < 0.18) continue;

      const target = e.flash > 0 ? flashes : bodies;
      let rim = rims.get(e.rim);
      if (!rim) rims.set(e.rim, (rim = new Path2D()));

      const blob = this.blobs[e.uid & 7];
      const n = blob.length >> 1;
      for (let i = 0; i < n; i++) {
        const px = e.x + blob[i * 2] * e.r;
        const py = e.y + blob[i * 2 + 1] * e.r;
        if (i === 0) {
          target.moveTo(px, py);
          rim.moveTo(px, py);
        } else {
          target.lineTo(px, py);
          rim.lineTo(px, py);
        }
      }
      target.closePath();
      rim.closePath();

      if (e.eyes > 0) {
        let eye = eyes.get(e.rim);
        if (!eye) eyes.set(e.rim, (eye = new Path2D()));
        const spread = e.r * 0.44;
        const er = Math.max(1.1, e.r * 0.13);
        // Eyes always face the player — the only thing that reads as intent.
        const a = Math.atan2(run.player.y - e.y, run.player.x - e.x);
        for (let i = 0; i < e.eyes; i++) {
          const off = (i - (e.eyes - 1) / 2) * (spread / Math.max(1, e.eyes - 1)) * 1.5;
          const ex = e.x + Math.cos(a) * e.r * 0.4 - Math.sin(a) * off;
          const ey = e.y + Math.sin(a) * e.r * 0.4 + Math.cos(a) * off;
          eye.moveTo(ex + er, ey);
          eye.arc(ex, ey, er, 0, TAU);
        }
      }
    }

    ctx.fillStyle = '#04060a';
    ctx.fill(bodies);
    ctx.fillStyle = 'rgba(240,235,225,0.85)';
    ctx.fill(flashes);

    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.72;
    for (const [color, path] of rims) {
      ctx.strokeStyle = color;
      ctx.stroke(path);
    }
    ctx.globalAlpha = 1;
    for (const [color, path] of eyes) {
      ctx.fillStyle = color;
      ctx.fill(path);
    }

    // Elites and the boss get a halo so they read instantly in a crowd.
    for (const e of run.enemies) {
      if (!e.alive || (!e.elite && !e.boss)) continue;
      ctx.strokeStyle = e.rim;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = e.boss ? 4 : 2.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + (e.boss ? 12 : 6), 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  private drawFamiliars(run: Run) {
    const ctx = this.ctx;
    for (const f of run.familiars) {
      ctx.fillStyle = '#04060a';
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 0.42, 0, TAU);
      ctx.fillStyle = f.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawBullets(run: Run) {
    const ctx = this.ctx;
    for (const b of run.bullets) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      if (b.kind === 3) {
        // A scale about to go off — it pulses faster as it runs out.
        const pulse = 0.5 + Math.sin(b.life * 34) * 0.5;
        ctx.globalAlpha = 0.35 + pulse * 0.55;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + pulse * 3, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (b.kind === 1) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, TAU);
        ctx.fill();
      } else {
        const a = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(a);
        ctx.fillRect(-b.r * 2, -b.r * 0.4, b.r * 4, b.r * 0.8);
        ctx.restore();
      }
    }

    for (const b of run.ebullets) {
      if (!b.alive) continue;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.stroke();
    }
  }

  private drawHunter(run: Run) {
    const h = run.hunter;
    if (!h.active || !h.god) return;
    const ctx = this.ctx;
    const color = h.god.color;

    for (const z of h.hazards) {
      const a = (z.life / z.maxLife) * 0.4;
      ctx.fillStyle = color;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const trail = h.trailPoints;
    for (let i = 0; i < trail.length; i++) {
      ctx.globalAlpha = (i / trail.length) * 0.22;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(trail[i].x, trail[i].y, h.r * 0.8, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const bodies = [{ x: h.x, y: h.y }, ...h.clones];
    for (const b of bodies) {
      ctx.globalAlpha = 0.3 + h.birth * 0.7;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(b.x, b.y, h.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(b.x - 8, b.y - 4, 3.4, 0, TAU);
      ctx.arc(b.x + 8, b.y - 4, 3.4, 0, TAU);
      ctx.fill();

      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(b.x, b.y, h.r + 16 + Math.sin(run.t * 5) * 4, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  private drawPlayer(run: Run, time: number) {
    const ctx = this.ctx;
    const p = run.player;
    const v = run.vessel;

    if (p.invuln > 0 && Math.floor(time * 14) % 2 === 0) return;

    // At high Dread the body twitches between frames.
    const jitter = run.band >= 3 ? (Math.random() - 0.5) * (run.band - 2) * 1.6 : 0;
    const x = p.x + jitter;
    const y = p.y + jitter;

    // A held halo under the body. Without it the player is genuinely lost in
    // the crowd once a few hundred silhouettes are on screen.
    const halo = ctx.createRadialGradient(x, y, 6, x, y, 40);
    halo.addColorStop(0, 'rgba(255,255,255,0.30)');
    halo.addColorStop(0.45, 'rgba(255,255,255,0.10)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, TAU);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(x, y + 13, 12, 4.5, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = p.flash > 0 ? '#ffffff' : '#0a0d12';
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.strokeStyle = v.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = v.color;
    ctx.font = '13px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(v.glyph, x, y + 0.5);

    // Facing tick — small, but it makes the Scythe's arc legible.
    const a = Math.atan2(p.dirY, p.dirX);
    ctx.strokeStyle = v.color;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
    ctx.lineTo(x + Math.cos(a) * 20, y + Math.sin(a) * 20);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  private drawFx(run: Run) {
    const ctx = this.ctx;
    for (const p of run.fx.items) {
      if (!p.alive) continue;
      const k = p.life / p.maxLife;
      ctx.globalAlpha = k;

      switch (p.kind) {
        case 0:
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
          break;
        case 1:
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (1.4 - k * 0.4), 0, TAU);
          ctx.stroke();
          break;
        case 2:
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          // Two kinked segments read as lightning for almost nothing.
          ctx.lineTo(
            (p.x + p.x2) / 2 + (Math.random() - 0.5) * 22,
            (p.y + p.y2) / 2 + (Math.random() - 0.5) * 22,
          );
          ctx.lineTo(p.x2, p.y2);
          ctx.stroke();
          break;
        case 3:
          ctx.fillStyle = p.color;
          ctx.font = `${p.r}px "Times New Roman", serif`;
          ctx.textAlign = 'center';
          ctx.fillText(p.text, p.x, p.y);
          break;
        case 4:
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.86, p.x2 - p.y2, p.x2 + p.y2);
          ctx.stroke();
          break;
        case 5:
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3 * k;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (1.7 - k * 0.7), 0, TAU);
          ctx.stroke();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── Overlays ─────────────────────────────────────────────────────

  private drawVignette(run: Run) {
    const ctx = this.ctx;
    const strength = clamp(run.bandInfo.vignette + run.vision, 0, 0.86);
    const key = `${this.w}x${this.h}:${strength.toFixed(2)}`;

    if (!this.vignetteCache || this.vignetteCache.key !== key) {
      const cx = this.w / 2;
      const cy = this.h / 2;
      const outer = Math.hypot(cx, cy);
      const inner = outer * (1 - strength);
      const grad = ctx.createRadialGradient(cx, cy, Math.max(20, inner), cx, cy, outer);
      grad.addColorStop(0, 'rgba(5,7,10,0)');
      grad.addColorStop(1, 'rgba(3,4,6,0.97)');
      this.vignetteCache = { key, grad };
    }
    ctx.fillStyle = this.vignetteCache.grad;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  private drawStick(input: Input) {
    if (!input.active) return;
    const ctx = this.ctx;
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = BONE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(input.originX, input.originY, 46, 0, TAU);
    ctx.stroke();

    const dx = input.curX - input.originX;
    const dy = input.curY - input.originY;
    const d = Math.min(46, Math.hypot(dx, dy)) || 0;
    const a = Math.atan2(dy, dx);
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = BONE;
    ctx.beginPath();
    ctx.arc(input.originX + Math.cos(a) * d, input.originY + Math.sin(a) * d, 16, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawHud(run: Run, time: number) {
    const ctx = this.ctx;
    const W = this.w;
    const safeTop = 14;

    ctx.textBaseline = 'alphabetic';

    // XP — a hairline across the very top edge.
    ctx.fillStyle = 'rgba(216,210,196,0.1)';
    ctx.fillRect(0, 0, W, 3);
    ctx.fillStyle = '#6fa8c7';
    ctx.fillRect(0, 0, W * clamp(run.xp / run.xpNext, 0, 1), 3);

    // Timer.
    ctx.textAlign = 'center';
    ctx.fillStyle = BONE;
    ctx.font = '30px "Times New Roman", serif';
    ctx.fillText(fmtTime(run.t), W / 2, safeTop + 30);

    // Kept hard left: the pause button owns the top-right corner.
    ctx.textAlign = 'left';
    ctx.font = '11px "Times New Roman", serif';
    ctx.fillStyle = DIM;
    ctx.fillText(`LV ${run.level}`, 14, safeTop + 16);
    ctx.fillText(`${fmtNum(run.kills)} SLAIN`, 14, safeTop + 30);
    ctx.textAlign = 'center';

    // Dread meter — the most important number on the screen.
    const dw = W * 0.62;
    const dx = (W - dw) / 2;
    const dy = safeTop + 44;
    ctx.fillStyle = 'rgba(216,210,196,0.09)';
    ctx.fillRect(dx, dy, dw, 5);
    const frac = run.dread / 100;
    ctx.fillStyle = run.dread >= 100 ? '#ffffff' : `rgb(${120 + frac * 110}, ${40 - frac * 20}, ${60 - frac * 20})`;
    ctx.fillRect(dx, dy, dw * frac, 5);

    // Band ticks.
    ctx.fillStyle = 'rgba(216,210,196,0.22)';
    for (const q of [0.25, 0.5, 0.75]) ctx.fillRect(dx + dw * q, dy - 2, 1, 9);

    ctx.font = '9px "Times New Roman", serif';
    ctx.fillStyle = run.dread >= 75 ? '#e8899a' : DIM;
    ctx.fillText(
      `${run.bandInfo.name.toUpperCase()}  ·  DREAD ${Math.round(run.dread)}`,
      W / 2,
      dy + 18,
    );

    // Boss health.
    if (run.boss && run.boss.alive) {
      const bw = W * 0.76;
      const bx = (W - bw) / 2;
      const by = dy + 30;
      ctx.fillStyle = 'rgba(216,210,196,0.1)';
      ctx.fillRect(bx, by, bw, 7);
      ctx.fillStyle = run.boundGod ? run.boundGod.color : BONE;
      ctx.fillRect(bx, by, bw * clamp(run.boss.hp / run.boss.maxHp, 0, 1), 7);
      ctx.font = '9px "Times New Roman", serif';
      ctx.fillStyle = DIM;
      ctx.fillText(
        (run.boundGod ? run.boundGod.name : 'THE WARDEN').toUpperCase(),
        W / 2,
        by + 19,
      );
    }

    // Weapon rack.
    const wy = this.h - 74;
    const glyphs = run.weapons;
    const gw = 26;
    let gx = W / 2 - (glyphs.length * gw) / 2 + gw / 2;
    ctx.font = '15px "Times New Roman", serif';
    for (const w of glyphs) {
      const def = WEAPONS[w.id];
      ctx.fillStyle = def.color;
      ctx.globalAlpha = 0.85;
      ctx.fillText(def.glyph, gx, wy);
      ctx.globalAlpha = 0.5;
      ctx.font = '8px "Times New Roman", serif';
      ctx.fillStyle = DIM;
      ctx.fillText(String(w.level), gx, wy + 10);
      ctx.font = '15px "Times New Roman", serif';
      gx += gw;
    }
    ctx.globalAlpha = 1;

    // Health.
    const hw = W * 0.7;
    const hx = (W - hw) / 2;
    const hy = this.h - 52;
    ctx.fillStyle = 'rgba(216,210,196,0.1)';
    ctx.fillRect(hx, hy, hw, 9);
    const hpFrac = clamp(run.player.hp / run.stats.maxHp, 0, 1);
    ctx.fillStyle = hpFrac < 0.28 ? '#e8465c' : '#b1263a';
    ctx.fillRect(hx, hy, hw * hpFrac, 9);
    ctx.font = '10px "Times New Roman", serif';
    ctx.fillStyle = DIM;
    ctx.fillText(
      `${Math.max(0, Math.ceil(run.player.hp))} / ${Math.round(run.stats.maxHp)}` +
        (run.player.revives > 0 ? `   ☥ ${run.player.revives}` : ''),
      W / 2,
      hy + 24,
    );

    // Announcements.
    if (run.announceT > 0) {
      const a = clamp(run.announceT / 0.6, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = '17px "Times New Roman", serif';
      ctx.fillStyle = '#e8899a';
      ctx.fillText(run.announceText, W / 2, this.h * 0.34);
      ctx.globalAlpha = 1;
    }

    // Whispers — faint, off-centre, gone before you are sure you read them.
    if (run.whisperT > 0) {
      const a = Math.sin((1 - run.whisperT / 3.2) * Math.PI) * 0.4;
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.font = 'italic 13px "Times New Roman", serif';
      ctx.fillStyle = BONE;
      const idx = Math.floor(run.t / 7) % WHISPERS.length;
      ctx.fillText(WHISPERS[idx], W / 2 + Math.sin(time * 0.7) * 30, this.h * 0.62);
      ctx.globalAlpha = 1;
    }
  }
}

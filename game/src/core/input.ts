import { clamp } from './math';

/**
 * One thumb, anywhere on the screen. Touching down plants a floating stick at
 * the contact point; dragging steers. There is no second input in the game.
 *
 * Keyboard (WASD/arrows) is supported purely so the game is testable on desktop.
 */
export class Input {
  /** Normalised movement vector, magnitude 0..1. */
  x = 0;
  y = 0;
  active = false;

  /** Screen-space anchor + current position, in CSS pixels. For drawing the stick. */
  originX = 0;
  originY = 0;
  curX = 0;
  curY = 0;

  private pointerId: number | null = null;
  private keys = new Set<string>();
  private readonly maxRadius = 62;
  private detach: Array<() => void> = [];

  constructor(private el: HTMLElement) {
    this.bind();
  }

  private bind() {
    const down = (e: PointerEvent) => {
      if (this.pointerId !== null) return;
      this.pointerId = e.pointerId;
      this.active = true;
      this.originX = this.curX = e.clientX;
      this.originY = this.curY = e.clientY;
      this.el.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    };

    const move = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      this.curX = e.clientX;
      this.curY = e.clientY;

      let dx = this.curX - this.originX;
      let dy = this.curY - this.originY;
      const d = Math.hypot(dx, dy);

      if (d > this.maxRadius) {
        // Drag the anchor along so the stick never feels "stuck" behind the thumb.
        const pull = d - this.maxRadius;
        this.originX += (dx / d) * pull;
        this.originY += (dy / d) * pull;
        dx = (dx / d) * this.maxRadius;
        dy = (dy / d) * this.maxRadius;
      }

      // Small dead zone so resting thumbs do not drift the player.
      const mag = Math.hypot(dx, dy);
      if (mag < 6) {
        this.x = this.y = 0;
      } else {
        const t = clamp((mag - 6) / (this.maxRadius - 6), 0, 1);
        this.x = (dx / mag) * t;
        this.y = (dy / mag) * t;
      }
      e.preventDefault();
    };

    const up = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.active = false;
      this.x = this.y = 0;
    };

    const kd = (e: KeyboardEvent) => {
      this.keys.add(e.key.toLowerCase());
      this.applyKeys();
    };
    const ku = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
      this.applyKeys();
    };

    this.el.addEventListener('pointerdown', down);
    this.el.addEventListener('pointermove', move);
    this.el.addEventListener('pointerup', up);
    this.el.addEventListener('pointercancel', up);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', () => this.reset());

    this.detach = [
      () => this.el.removeEventListener('pointerdown', down),
      () => this.el.removeEventListener('pointermove', move),
      () => this.el.removeEventListener('pointerup', up),
      () => this.el.removeEventListener('pointercancel', up),
      () => window.removeEventListener('keydown', kd),
      () => window.removeEventListener('keyup', ku),
    ];
  }

  private applyKeys() {
    const k = this.keys;
    let dx = 0;
    let dy = 0;
    if (k.has('a') || k.has('arrowleft')) dx -= 1;
    if (k.has('d') || k.has('arrowright')) dx += 1;
    if (k.has('w') || k.has('arrowup')) dy -= 1;
    if (k.has('s') || k.has('arrowdown')) dy += 1;
    if (dx || dy) {
      const m = Math.hypot(dx, dy);
      this.x = dx / m;
      this.y = dy / m;
    } else if (this.pointerId === null) {
      this.x = this.y = 0;
    }
  }

  /** Drop all held state — used when a modal opens mid-run. */
  reset() {
    this.pointerId = null;
    this.active = false;
    this.x = this.y = 0;
    this.keys.clear();
  }

  dispose() {
    for (const fn of this.detach) fn();
    this.detach = [];
  }
}

/**
 * Seeded RNG. Every run draws from one of these so the Nightmare daily can be
 * replayed identically by every player from the same date seed.
 */
export class Rng {
  private a: number;

  constructor(seed: number) {
    this.a = seed >>> 0 || 0x9e3779b9;
  }

  /** mulberry32 — small, fast, good enough distribution for gameplay. */
  next(): number {
    this.a = (this.a + 0x6d2b79f5) | 0;
    let t = Math.imul(this.a ^ (this.a >>> 15), 1 | this.a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo);
  }

  int(lo: number, hi: number): number {
    return Math.floor(this.range(lo, hi + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Fisher-Yates on a copy. */
  shuffled<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /** Weighted pick. `weight` must return a non-negative number. */
  weighted<T>(arr: readonly T[], weight: (item: T) => number): T {
    let total = 0;
    for (const item of arr) total += Math.max(0, weight(item));
    if (total <= 0) return this.pick(arr);
    let roll = this.next() * total;
    for (const item of arr) {
      roll -= Math.max(0, weight(item));
      if (roll <= 0) return item;
    }
    return arr[arr.length - 1];
  }
}

/** Stable integer hash of a string — used to seed the daily from its date. */
export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** YYYY-MM-DD in local time — the Nightmare rotation key. */
export function todayKey(d = new Date()): string {
  const p = (n: number) => (n < 10 ? '0' + n : String(n));
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

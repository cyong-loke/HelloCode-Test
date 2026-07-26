/**
 * Dread only ever rises. It buys the player power through Pacts and charges
 * them in escalating speed, escalating elites and — mostly — in how the world
 * looks and sounds. The sensory cost is doing the real work here.
 */
export interface DreadBand {
  min: number;
  name: string;
  /** Multiplier on every enemy's movement speed. */
  enemySpeed: number;
  /** Extra elites rolled into each spawn batch. */
  elite: number;
  /** CSS filter applied to the whole canvas. Free, GPU-side, no draw cost. */
  filter: string;
  /** 0..1 — how far the vignette closes in. */
  vignette: number;
  /** Screen "breathing" amplitude in pixels. */
  breath: number;
}

export const BANDS: DreadBand[] = [
  {
    min: 0,
    name: 'Steady',
    enemySpeed: 1,
    elite: 0,
    filter: 'none',
    vignette: 0.3,
    breath: 0,
  },
  {
    min: 25,
    name: 'Whispers',
    enemySpeed: 1.1,
    elite: 0,
    filter: 'saturate(0.6) contrast(1.06)',
    vignette: 0.42,
    breath: 0.6,
  },
  {
    min: 50,
    name: 'Closing In',
    enemySpeed: 1.2,
    elite: 1,
    filter: 'saturate(0.32) contrast(1.14) brightness(0.96)',
    vignette: 0.56,
    breath: 1.4,
  },
  {
    min: 75,
    name: 'Near To It',
    enemySpeed: 1.3,
    elite: 2,
    filter: 'saturate(0.12) contrast(1.24) brightness(0.92)',
    vignette: 0.68,
    breath: 2.4,
  },
  {
    min: 100,
    name: 'It Sees You',
    enemySpeed: 1.32,
    elite: 2,
    filter: 'saturate(0) contrast(1.36) brightness(0.86)',
    vignette: 0.76,
    breath: 3.4,
  },
];

export function bandIndex(dread: number): number {
  let i = 0;
  for (let b = 0; b < BANDS.length; b++) if (dread >= BANDS[b].min) i = b;
  return i;
}

/** Whispers that surface at the higher bands. Deliberately second-person. */
export const WHISPERS = [
  'it knows your name',
  'you agreed to this',
  'do not look behind you',
  'the body is not yours',
  'you are so much lighter now',
  'one more',
  'nothing is following you',
  'you were warned',
];

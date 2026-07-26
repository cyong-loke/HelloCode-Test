import type { Run } from './sim/run';

/** Multiplicative unless noted. Rebuilt from scratch whenever anything changes. */
export interface Stats {
  damage: number;
  haste: number;
  speed: number;
  maxHp: number;
  pickup: number;
  armor: number;
  crit: number;
  regen: number;
  area: number;
  count: number;
  luck: number;
}

export const baseStats = (): Stats => ({
  damage: 1,
  haste: 1,
  speed: 1,
  maxHp: 100,
  pickup: 62,
  armor: 0,
  crit: 0.05,
  regen: 0,
  area: 1,
  count: 0,
  luck: 0,
});

export interface Vessel {
  id: string;
  name: string;
  era: string;
  glyph: string;
  color: string;
  weapon: string;
  passive: string;
  blurb: string;
  /** Effigy fragments to unlock. 0 = available from the start. */
  cost: number;
}

export interface PactOffer {
  id: string;
  god: string;
  name: string;
  desc: string;
  dread: number;
  /** The upside. Lucifer applies this twice — that is his whole identity. */
  boon: (run: Run) => void;
  /** The price paid in something other than Dread. Never doubled. */
  toll?: (run: Run) => void;
}

export type HunterKind = 'charge' | 'grind' | 'blink' | 'mimic' | 'split' | 'dark';

export interface God {
  id: string;
  name: string;
  epithet: string;
  glyph: string;
  color: string;
  hunter: string;
  hunterKind: HunterKind;
  hunterSpeed: number;
  pacts: PactOffer[];
}

export type Behaviour = 'chase' | 'dart' | 'drift' | 'ranged' | 'blink' | 'wall' | 'flicker';

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  speed: number;
  dmg: number;
  r: number;
  xp: number;
  rim: string;
  eyes: number;
  behaviour: Behaviour;
  /** Seconds into the run before this type enters the pool. */
  from: number;
  weight: number;
}

export interface Card {
  id: string;
  name: string;
  glyph: string;
  kind: 'weapon' | 'passive';
  max: number;
  desc: (level: number) => string;
  /** Passive cards fold their effect into the recomputed stat block. */
  stat?: (s: Stats, level: number) => void;
  /** Weapon cards grant, then level, this weapon id. */
  weapon?: string;
  /** Optional gate — e.g. only offer a weapon once its prerequisite exists. */
  available?: (run: Run) => boolean;
}

export interface AltarUpgrade {
  id: string;
  name: string;
  glyph: string;
  desc: string;
  max: number;
  cost: (level: number) => number;
}

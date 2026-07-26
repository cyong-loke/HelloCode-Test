import type { Card } from '../types';
import { WEAPONS } from '../sim/weapons';

/**
 * Passives fold straight into the recomputed stat block, so a card is pure data
 * and re-taking one is always safe.
 */
export const PASSIVES: Card[] = [
  {
    id: 'power',
    name: 'Power',
    glyph: '✚',
    kind: 'passive',
    max: 6,
    desc: () => 'Everything you do lands 12% harder.',
    stat: (s, l) => (s.damage *= 1 + 0.12 * l),
  },
  {
    id: 'haste',
    name: 'Haste',
    glyph: '⏵',
    kind: 'passive',
    max: 6,
    desc: () => 'Your weapons cycle 11% faster.',
    stat: (s, l) => (s.haste *= 1 + 0.11 * l),
  },
  {
    id: 'swift',
    name: 'Swiftness',
    glyph: '↗',
    kind: 'passive',
    max: 5,
    desc: () => 'You move 8% faster.',
    stat: (s, l) => (s.speed *= 1 + 0.08 * l),
  },
  {
    id: 'vitality',
    name: 'Vitality',
    glyph: '♥',
    kind: 'passive',
    max: 6,
    desc: () => '+20 maximum health.',
    stat: (s, l) => (s.maxHp += 20 * l),
  },
  {
    id: 'greed',
    name: 'Greed',
    glyph: '◎',
    kind: 'passive',
    max: 4,
    desc: () => 'Soul motes are drawn to you from 30 further out.',
    stat: (s, l) => (s.pickup += 30 * l),
  },
  {
    id: 'bulwark',
    name: 'Bulwark',
    glyph: '⛨',
    kind: 'passive',
    max: 5,
    desc: () => 'Every hit against you is 2 lighter.',
    stat: (s, l) => (s.armor += 2 * l),
  },
  {
    id: 'fortune',
    name: 'Fortune',
    glyph: '✧',
    kind: 'passive',
    max: 5,
    desc: () => '+7% chance to strike twice as hard.',
    stat: (s, l) => (s.crit += 0.07 * l),
  },
  {
    id: 'mending',
    name: 'Mending',
    glyph: '✜',
    kind: 'passive',
    max: 4,
    desc: () => 'You knit back 0.8 health each second.',
    stat: (s, l) => (s.regen += 0.8 * l),
  },
  {
    id: 'reach',
    name: 'Reach',
    glyph: '◇',
    kind: 'passive',
    max: 5,
    desc: () => 'Every area of effect grows by 10%.',
    stat: (s, l) => (s.area *= 1 + 0.1 * l),
  },
  {
    id: 'multitude',
    name: 'Multitude',
    glyph: '⋯',
    kind: 'passive',
    max: 3,
    desc: () => '+1 projectile where it matters.',
    stat: (s, l) => (s.count += l),
  },
];

/** Wraps a weapon definition as a level-up card. */
export function weaponCard(id: string): Card {
  const w = WEAPONS[id];
  return {
    id: 'w_' + id,
    name: w.name,
    glyph: w.glyph,
    kind: 'weapon',
    max: w.max,
    desc: (l) => w.desc(Math.max(1, l)),
    weapon: id,
  };
}

export const cardById = (pool: Card[], id: string) => pool.find((c) => c.id === id);

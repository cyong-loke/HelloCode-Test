import type { AltarUpgrade } from '../types';

/**
 * The Altar of Bones — permanent, cheap, and deliberately front-loaded. The
 * first upgrade has to be affordable after a single run or the meta never
 * announces itself.
 */
export const ALTAR: AltarUpgrade[] = [
  {
    id: 'heart',
    name: 'Cold Heart',
    glyph: '♥',
    desc: '+10 starting health per rank.',
    max: 8,
    cost: (l) => Math.round(30 * Math.pow(1.55, l)),
  },
  {
    id: 'edge',
    name: 'Whetted Edge',
    glyph: '✚',
    desc: '+5% damage per rank.',
    max: 8,
    cost: (l) => Math.round(45 * Math.pow(1.58, l)),
  },
  {
    id: 'quick',
    name: 'Quickened',
    glyph: '⏵',
    desc: '+4% attack speed per rank.',
    max: 6,
    cost: (l) => Math.round(55 * Math.pow(1.6, l)),
  },
  {
    id: 'vigor',
    name: 'Long Stride',
    glyph: '↗',
    desc: '+4% movement speed per rank.',
    max: 6,
    cost: (l) => Math.round(40 * Math.pow(1.55, l)),
  },
  {
    id: 'reach',
    name: 'Grave Pull',
    glyph: '◎',
    desc: '+12 pickup radius per rank.',
    max: 6,
    cost: (l) => Math.round(35 * Math.pow(1.5, l)),
  },
  {
    id: 'hide',
    name: 'Tanned Hide',
    glyph: '⛨',
    desc: '+1 armour per rank.',
    max: 5,
    cost: (l) => Math.round(70 * Math.pow(1.62, l)),
  },
  {
    id: 'omen',
    name: 'Read the Omens',
    glyph: '✧',
    desc: '+5% critical chance per rank.',
    max: 5,
    cost: (l) => Math.round(60 * Math.pow(1.6, l)),
  },
  {
    id: 'head',
    name: 'Head Start',
    glyph: '◈',
    desc: 'Begin each run one level higher, per rank.',
    max: 3,
    cost: (l) => Math.round(120 * Math.pow(1.85, l)),
  },
  {
    id: 'revenant',
    name: 'Revenant',
    glyph: '☥',
    desc: 'One extra return from death, per rank.',
    max: 2,
    cost: (l) => Math.round(260 * Math.pow(2.1, l)),
  },
  {
    id: 'tithe',
    name: "Miser's Tithe",
    glyph: '⛁',
    desc: '+12% soul shards earned, per rank.',
    max: 5,
    cost: (l) => Math.round(80 * Math.pow(1.65, l)),
  },
];

export const altarById = (id: string) => ALTAR.find((a) => a.id === id);

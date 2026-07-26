import type { Run } from '../sim/run';

export interface Modifier {
  id: string;
  name: string;
  desc: string;
  apply: (run: Run) => void;
}

/**
 * The Nightmare rotation. One modifier per day, chosen from the date seed, so
 * everybody in the world plays the identical run and can compare a single number.
 */
export const MODIFIERS: Modifier[] = [
  {
    id: 'famine',
    name: 'Famine',
    desc: 'You begin at half health. Everything that heals you heals twice as much.',
    apply: (r) => {
      r.startHpFrac = 0.5;
      r.healMul *= 2;
    },
  },
  {
    id: 'swarm',
    name: 'Swarm',
    desc: 'Twice as many of them. Half as much holding them together.',
    apply: (r) => {
      r.mods.spawn *= 2;
      r.enemyHpMul *= 0.5;
    },
  },
  {
    id: 'brittle',
    name: 'Brittle',
    desc: 'Everyone hits twice as hard. Including whatever is behind you.',
    apply: (r) => {
      r.mods.damage *= 2;
      r.damageTakenMul *= 2;
    },
  },
  {
    id: 'creep',
    name: 'Slow Creep',
    desc: 'Dread climbs by itself, whether you bargain or not.',
    apply: (r) => {
      r.dreadCreep += 0.42;
    },
  },
  {
    id: 'blind',
    name: 'Moonless',
    desc: 'You can barely see. Motes come to you from much further out.',
    apply: (r) => {
      r.blindness += 0.4;
      r.mods.pickup *= 1.8;
    },
  },
  {
    id: 'giants',
    name: 'Giants',
    desc: 'Fewer of them, and every one is far larger and far slower.',
    apply: (r) => {
      r.mods.spawn *= 0.45;
      r.enemyHpMul *= 3.4;
      r.enemyScale *= 1.55;
      r.enemySpeedMul *= 0.68;
    },
  },
];

export const modifierById = (id: string) => MODIFIERS.find((m) => m.id === id) ?? MODIFIERS[0];

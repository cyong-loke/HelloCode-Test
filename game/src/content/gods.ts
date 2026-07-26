import type { God } from '../types';

/**
 * Six Dark Gods. Each one sells you power up front and becomes the thing that
 * hunts you when Dread tops out — so the god you took the best deal from is
 * always the god you have to survive.
 *
 * Design note: an earlier draft used Kali here. She is an actively worshipped
 * Hindu deity and casting her as a demonic antagonist is a real-world harm we
 * do not need, so Nyx — a Greek primordial with no living cult — took the slot.
 */
export const GODS: God[] = [
  {
    id: 'satan',
    name: 'Satan',
    epithet: 'The Adversary',
    glyph: '♆',
    color: '#b1263a',
    hunter: 'The Adversary',
    hunterKind: 'charge',
    hunterSpeed: 132,
    pacts: [
      {
        id: 'ravenous',
        god: 'satan',
        name: 'Ravenous Contract',
        desc: '+85% damage. You bleed 1.6% of your health every second, for the rest of the hour.',
        dread: 30,
        boon: (r) => {
          r.mods.damage *= 1.85;
        },
        toll: (r) => {
          r.hpDrain += 1.6;
        },
      },
      {
        id: 'tithe',
        god: 'satan',
        name: "Butcher's Tithe",
        desc: '+45% damage and +30% attack speed. All healing you receive is halved.',
        dread: 24,
        boon: (r) => {
          r.mods.damage *= 1.45;
          r.mods.haste *= 1.3;
        },
        toll: (r) => {
          r.healMul *= 0.5;
        },
      },
    ],
  },

  {
    id: 'moloch',
    name: 'Moloch',
    epithet: 'The Furnace',
    glyph: '☗',
    color: '#e07a2c',
    hunter: 'The Furnace',
    hunterKind: 'grind',
    hunterSpeed: 96,
    pacts: [
      {
        id: 'furnace',
        god: 'moloch',
        name: 'Furnace Rite',
        desc: 'Fire erupts from you every 5 seconds. Level-up hands shrink to two cards.',
        dread: 26,
        boon: (r) => {
          r.nova += 1;
        },
        toll: (r) => {
          r.cardCount = 2;
        },
      },
      {
        id: 'consume',
        god: 'moloch',
        name: 'Consume the Young',
        desc: '+35% damage and +60% area. Your maximum health is cut by a quarter.',
        dread: 28,
        boon: (r) => {
          r.mods.damage *= 1.35;
          r.mods.area *= 1.6;
        },
        toll: (r) => {
          r.mods.maxHp *= 0.75;
        },
      },
    ],
  },

  {
    id: 'nyx',
    name: 'Nyx',
    epithet: 'Mother of Night',
    glyph: '☾',
    color: '#6b5aa8',
    hunter: 'Mother of Night',
    hunterKind: 'blink',
    hunterSpeed: 118,
    pacts: [
      {
        id: 'owl',
        god: 'nyx',
        name: 'Hour of the Owl',
        desc: '+95% attack speed. Your maximum health is halved.',
        dread: 34,
        boon: (r) => {
          r.mods.haste *= 1.95;
        },
        toll: (r) => {
          r.mods.maxHp *= 0.5;
        },
      },
      {
        id: 'nightfall',
        god: 'nyx',
        name: 'Nightfall',
        desc: 'Everything out there slows by 30%. Everything that reaches you hits twice as hard.',
        dread: 22,
        boon: (r) => {
          r.enemySpeedMul *= 0.7;
        },
        toll: (r) => {
          r.damageTakenMul *= 2;
        },
      },
    ],
  },

  {
    id: 'loki',
    name: 'Loki',
    epithet: 'The Knot',
    glyph: '⌘',
    color: '#4a9d7c',
    hunter: 'The Knot',
    hunterKind: 'mimic',
    hunterSpeed: 124,
    pacts: [
      {
        id: 'wager',
        god: 'loki',
        name: 'Wager',
        desc: 'Everything you have built is shuffled at random — then all of it gains 50%.',
        dread: 20,
        boon: (r) => {
          r.rerollBuild();
          r.mods.damage *= 1.5;
          r.mods.haste *= 1.5;
          r.mods.area *= 1.5;
        },
      },
      {
        id: 'borrowed',
        god: 'loki',
        name: 'Borrowed Face',
        desc: '+40% movement and +50% pickup radius. Dread now climbs on its own.',
        dread: 18,
        boon: (r) => {
          r.mods.speed *= 1.4;
          r.mods.pickup *= 1.5;
        },
        toll: (r) => {
          r.dreadCreep += 1.1;
        },
      },
    ],
  },

  {
    id: 'baphomet',
    name: 'Baphomet',
    epithet: 'The Reconciler',
    glyph: '⛧',
    color: '#c9a227',
    hunter: 'The Reconciler',
    hunterKind: 'split',
    hunterSpeed: 108,
    pacts: [
      {
        id: 'asabove',
        god: 'baphomet',
        name: 'As Above, So Below',
        desc: 'Every drop is doubled. So is everything that comes for you.',
        dread: 25,
        boon: (r) => {
          r.mods.xp *= 2;
          r.mods.shard *= 2;
        },
        toll: (r) => {
          r.mods.spawn *= 2;
        },
      },
      {
        id: 'balance',
        god: 'baphomet',
        name: 'Balance',
        desc: '+70% damage dealt. +70% damage taken. Perfectly fair.',
        dread: 24,
        boon: (r) => {
          r.mods.damage *= 1.7;
        },
        toll: (r) => {
          r.damageTakenMul *= 1.7;
        },
      },
    ],
  },

  {
    id: 'erebus',
    name: 'Erebus',
    epithet: 'The Unlit',
    glyph: '◐',
    color: '#4a5a6b',
    hunter: 'The Unlit',
    hunterKind: 'dark',
    hunterSpeed: 114,
    pacts: [
      {
        id: 'mercy',
        god: 'erebus',
        name: 'Mercy',
        desc: 'Healed whole, and untouchable for six seconds. Nothing is free.',
        dread: 40,
        boon: (r) => {
          r.player.hp = r.stats.maxHp;
          r.player.invuln = Math.max(r.player.invuln, 6);
        },
      },
      {
        id: 'deepdark',
        god: 'erebus',
        name: 'Deep Dark',
        desc: '+80% damage. The dark closes to arm’s length and stays there.',
        dread: 30,
        boon: (r) => {
          r.mods.damage *= 1.8;
        },
        toll: (r) => {
          r.blindness += 0.45;
        },
      },
    ],
  },
];

export const godById = (id: string): God => GODS.find((g) => g.id === id) ?? GODS[0];

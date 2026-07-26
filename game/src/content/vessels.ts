import type { Vessel } from '../types';

/**
 * The bodies you possess. All are long-dead public figures or public-domain
 * mythological ones. Kits are deliberately tiny — one signature weapon and one
 * passive — so a player understands a vessel inside their first run with it.
 */
export const VESSELS: Vessel[] = [
  {
    id: 'tesla',
    name: 'Tesla',
    era: '1856 — 1943',
    glyph: '⚡',
    color: '#6fa8c7',
    weapon: 'arc',
    passive: 'Charge — attack speed climbs while you avoid damage, and resets when you are hit.',
    blurb: 'He spent his last years feeding pigeons and talking to something nobody else could hear.',
    cost: 0,
  },
  {
    id: 'napoleon',
    name: 'Napoleon',
    era: '1769 — 1821',
    glyph: '⚜',
    color: '#c9a227',
    weapon: 'army',
    passive: 'Conscription — every 22 seconds a fallen grenadier is pressed back into service.',
    blurb: 'Six hundred thousand went east with him. Twenty-seven thousand came back. They all remember.',
    cost: 0,
  },
  {
    id: 'rasputin',
    name: 'Rasputin',
    era: '1869 — 1916',
    glyph: '☦',
    color: '#8e6bbf',
    weapon: 'scythe',
    passive: 'Unkillable — the first death each run returns you at 35% health and curses the ground.',
    blurb: 'Poisoned, shot, beaten, drowned. The autopsy found water in his lungs.',
    cost: 6,
  },
  {
    id: 'bathory',
    name: 'Báthory',
    era: '1560 — 1614',
    glyph: '⚘',
    color: '#b1263a',
    weapon: 'bath',
    passive: 'Crimson Debt — every kill returns a sliver of health.',
    blurb: 'They bricked her into her own chamber and left a slot for food.',
    cost: 10,
  },
  {
    id: 'anubis',
    name: 'Anubis',
    era: 'Duat, eternal',
    glyph: '𓁢',
    color: '#d4a24c',
    weapon: 'scales',
    passive: 'The Weighing — you see the exact Dread price of a Pact before you take it.',
    blurb: 'He does not judge you. He only reads the needle.',
    cost: 14,
  },
  {
    id: 'odin',
    name: 'Odin',
    era: 'Asgard, eternal',
    glyph: '↟',
    color: '#8fa6b8',
    weapon: 'ravens',
    passive: 'Sacrifice — spend 12% of your health to redraw a level-up hand.',
    blurb: 'He hung himself from the world tree for nine nights to learn the runes. He would do it again.',
    cost: 18,
  },
  {
    id: 'zeus',
    name: 'Zeus',
    era: 'Olympus, eternal',
    glyph: '𐤕',
    color: '#e6d17a',
    weapon: 'judgment',
    passive: 'Hubris — Judgment hits harder the higher your Dread, and the first Dread band costs you nothing.',
    blurb: 'The sky does not care which of you it strikes.',
    cost: 26,
  },
  {
    id: 'lucifer',
    name: 'Lucifer',
    era: 'The first fall',
    glyph: '✦',
    color: '#e8894b',
    weapon: 'morningstar',
    passive: 'Morning Star — you begin every run at 50 Dread, and every Pact boon you take is doubled.',
    blurb: 'He was the brightest of them. That was the whole problem.',
    cost: 40,
  },
];

export const vesselById = (id: string): Vessel => VESSELS.find((v) => v.id === id) ?? VESSELS[0];

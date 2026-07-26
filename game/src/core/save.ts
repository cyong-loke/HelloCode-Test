import { todayKey } from './rng';

const KEY = 'pact.save.v1';

export interface SaveData {
  shards: number;
  fragments: number;
  vessel: string;
  unlocked: string[];
  altar: Record<string, number>;
  runs: number;
  wins: number;
  kills: number;
  bestTime: number;
  bestDread: number;
  dailyDate: string;
  dailyDone: boolean;
  dailyBest: number;
  seen: string[];
  muted: boolean;
}

const fresh = (): SaveData => ({
  shards: 0,
  fragments: 0,
  vessel: 'tesla',
  unlocked: ['tesla'],
  altar: {},
  runs: 0,
  wins: 0,
  kills: 0,
  bestTime: 0,
  bestDread: 0,
  dailyDate: '',
  dailyDone: false,
  dailyBest: 0,
  seen: [],
  muted: false,
});

/**
 * localStorage is unavailable in some embedded/private contexts. Rather than
 * crashing the game we fall back to an in-memory save that lasts the session.
 */
let memoryOnly = false;

function read(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return { ...fresh(), ...parsed };
  } catch {
    memoryOnly = true;
    return fresh();
  }
}

export const save: SaveData = read();

export function persist() {
  if (memoryOnly) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    memoryOnly = true;
  }
}

/** Roll the daily over at local midnight. */
export function refreshDaily() {
  const key = todayKey();
  if (save.dailyDate !== key) {
    save.dailyDate = key;
    save.dailyDone = false;
    save.dailyBest = 0;
    persist();
  }
}

export function markSeen(id: string): boolean {
  if (save.seen.includes(id)) return false;
  save.seen.push(id);
  persist();
  return true;
}

export function wipe() {
  Object.assign(save, fresh());
  persist();
}

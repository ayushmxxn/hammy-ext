import { browser } from 'wxt/browser';
import type { Storage } from 'wxt/browser';
import type {
  HammySettings,
  HammyStats,
  HammyState,
  PendingBreak
} from '@/types';
import { BREAK_TYPES } from './breakTypes';

const KEYS = {
  settings: 'hammy:settings',
  pendingBreak: 'hammy:pendingBreak',
  nextBreakAt: 'hammy:nextBreakAt',
  stats: 'hammy:stats',
  breakDueSince: 'hammy:breakDueSince',
  customVideo: 'hammy:customVideo'
} as const;
export const DEFAULT_SETTINGS: HammySettings = {
  enabled: true,
  intervalMinutes: 30,
  soundEnabled: true,
  enabledBreakTypes: BREAK_TYPES.map((b) => b.id),
  breakOrder: 'random',
  notificationStyle: 'silent',
  sequenceCursor: 0,
  freezeOnBreak: true,
  excludedSites: [],
  customVideoEnabled: false
};
export const DEFAULT_STATS: HammyStats = {
  totalBreaksCompleted: 0,
  breaksCompletedToday: 0,
  lastCompletedDateKey: '',
  streakDays: 0,
  lastStreakDateKey: '',
  lastCompletedTimestamp: 0
};
function isExtensionContextAvailable(): boolean {
  if (typeof browser === 'undefined') return false;
  if (!browser.runtime || !browser.runtime.id) return false;
  if (!browser.storage || !browser.storage.local) return false;
  return true;
}
function isContextInvalidatedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('Extension context invalidated')
  );
}
async function get<T>(key: string, fallback: T): Promise<T> {
  if (!isExtensionContextAvailable()) return fallback;
  try {
    const result = await browser.storage.local.get(key);
    if (result[key] === undefined) return fallback;
    return result[key] as T;
  } catch (error) {
    if (isContextInvalidatedError(error)) return fallback;
    throw error;
  }
}
async function set(key: string, value: unknown): Promise<void> {
  if (!isExtensionContextAvailable()) return;
  try {
    await browser.storage.local.set({ [key]: value });
  } catch (error) {
    if (isContextInvalidatedError(error)) return;
    throw error;
  }
}
function pick<T>(bag: Record<string, unknown>, key: string, fallback: T): T {
  return bag[key] === undefined ? fallback : (bag[key] as T);
}
export async function getSettings(): Promise<HammySettings> {
  const stored = await get<Partial<HammySettings>>(KEYS.settings, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}
export async function setSettings(settings: HammySettings): Promise<void> {
  await set(KEYS.settings, settings);
}
export async function updateSettings(
  partial: Partial<HammySettings>
): Promise<HammySettings> {
  const current = await getSettings();
  const next = { ...current, ...partial };
  await setSettings(next);
  return next;
}

export async function getPendingBreak(): Promise<PendingBreak | null> {
  return get<PendingBreak | null>(KEYS.pendingBreak, null);
}

export async function setPendingBreak(
  pending: PendingBreak | null
): Promise<void> {
  await set(KEYS.pendingBreak, pending);
}
export async function getNextBreakAt(): Promise<number | null> {
  return get<number | null>(KEYS.nextBreakAt, null);
}
export async function setNextBreakAt(timestamp: number | null): Promise<void> {
  await set(KEYS.nextBreakAt, timestamp);
}
export async function getBreakDueSince(): Promise<number | null> {
  return get<number | null>(KEYS.breakDueSince, null);
}
export async function setBreakDueSince(timestamp: number | null): Promise<void> {
  await set(KEYS.breakDueSince, timestamp);
}
export async function getStats(): Promise<HammyStats> {
  const stored = await get<Partial<HammyStats>>(KEYS.stats, {});
  return { ...DEFAULT_STATS, ...stored };
}

export async function setStats(stats: HammyStats): Promise<void> {
  await set(KEYS.stats, stats);
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
export async function recordBreakCompleted(breakTriggeredAt?: number): Promise<HammyStats> {
  const stats = await getStats();
  const today = todayKey();
  const now = Date.now();

  if (stats.lastCompletedTimestamp && now - stats.lastCompletedTimestamp < 5000) {
    return stats;
  }

  if (breakTriggeredAt && stats.lastCompletedTimestamp === breakTriggeredAt) {
    return stats;
  }

  const breaksCompletedToday =
    stats.lastCompletedDateKey === today ? stats.breaksCompletedToday + 1 : 1;
  let streakDays = stats.streakDays;
  if (stats.lastStreakDateKey !== today) {
    if (stats.lastStreakDateKey === yesterdayKey()) {
      streakDays += 1;
    } else {
      streakDays = 1;
    }
  }
  const next: HammyStats = {
    totalBreaksCompleted: stats.totalBreaksCompleted + 1,
    breaksCompletedToday,
    lastCompletedDateKey: today,
    streakDays,
    lastStreakDateKey: today,
    lastCompletedTimestamp: breakTriggeredAt || now
  };
  await setStats(next);
  return next;
}

export async function resetStats(): Promise<void> {
  await setStats(DEFAULT_STATS);
}
export async function getFullState(): Promise<HammyState> {
  let bag: Record<string, unknown> = {};
  if (isExtensionContextAvailable()) {
    try {
      bag = await browser.storage.local.get([
        KEYS.settings,
        KEYS.pendingBreak,
        KEYS.nextBreakAt,
        KEYS.stats
      ]);
    } catch (error) {
      if (!isContextInvalidatedError(error)) throw error;
      // Context died mid-call — fall through with an empty bag so this
      // resolves to defaults instead of throwing into the caller.
    }
  }
  const settings: HammySettings = {
    ...DEFAULT_SETTINGS,
    ...pick<Partial<HammySettings>>(bag, KEYS.settings, {})
  };
  const pendingBreak = pick<PendingBreak | null>(bag, KEYS.pendingBreak, null);
  const nextBreakAt = pick<number | null>(bag, KEYS.nextBreakAt, null);
  const stats: HammyStats = {
    ...DEFAULT_STATS,
    ...pick<Partial<HammyStats>>(bag, KEYS.stats, {})
  };
  return { settings, pendingBreak, nextBreakAt, stats };
}
export function subscribeToState(
  callback: (state: HammyState) => void
): () => void {
  const listener = async (
    changes: { [key: string]: Storage.StorageChange },
    areaName: string
  ) => {
    if (!isExtensionContextAvailable()) return;
    if (areaName !== 'local') return;
    const relevant = Object.keys(changes).some((k) =>
      Object.values(KEYS).includes(k as (typeof KEYS)[keyof typeof KEYS])
    );
    if (!relevant) return;
    callback(await getFullState());
  };


  if (!isExtensionContextAvailable()) return () => {};
  browser.storage.onChanged.addListener(listener);
  return () => {
    if (!isExtensionContextAvailable()) return;
    try {
      browser.storage.onChanged.removeListener(listener);
    } catch (error) {
      if (!isContextInvalidatedError(error)) throw error;
    }
  };
}

export async function getCustomVideo(): Promise<string | null> {
  return get<string | null>(KEYS.customVideo, null);
}
export async function setCustomVideo(dataUrl: string | null): Promise<void> {
  if (dataUrl === null) {
    if (!isExtensionContextAvailable()) return;
    try {
      await browser.storage.local.remove(KEYS.customVideo);
    } catch (error) {
      if (!isContextInvalidatedError(error)) throw error;
    }
    return;
  }
  await set(KEYS.customVideo, dataUrl);
}
export { KEYS as STORAGE_KEYS };
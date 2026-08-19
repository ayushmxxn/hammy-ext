import type {
  HammySettings,
  HammyStats,
  HammyState,
  PendingBreak
} from '@/types';
import { BREAK_TYPES } from './breakTypes';

/**
 * Everything here is local-only (chrome.storage.local). Hammy never
 * makes a network request and never syncs data anywhere.
 */

const KEYS = {
  settings: 'hammy:settings',
  pendingBreak: 'hammy:pendingBreak',
  nextBreakAt: 'hammy:nextBreakAt',
  stats: 'hammy:stats'
} as const;

export const DEFAULT_SETTINGS: HammySettings = {
  enabled: true,
  intervalMinutes: 30,
  snoozeMinutes: 5,
  soundEnabled: true,
  enabledBreakTypes: BREAK_TYPES.map((b) => b.id),
  breakOrder: 'random',
  notificationStyle: 'silent',
  sequenceCursor: 0,
  freezeOnBreak: true
};

export const DEFAULT_STATS: HammyStats = {
  totalBreaksCompleted: 0,
  breaksCompletedToday: 0,
  lastCompletedDateKey: '',
  streakDays: 0,
  lastStreakDateKey: '',
  lastCompletedTimestamp: 0
};

/**
 * True once the browser has torn down this script's connection to the
 * extension — happens to content scripts left running on an already-open
 * page after the extension is reloaded/updated/disabled. Once that
 * happens, `chrome.storage` (and every other chrome.* namespace) can
 * itself be `undefined`, and calling into what's left of `chrome.runtime`
 * throws "Extension context invalidated." This checks the documented
 * signal for that (`chrome.runtime.id` disappearing) before touching
 * `chrome.storage`, rather than letting the crash happen and catching it
 * after the fact.
 */
function isExtensionContextAvailable(): boolean {
  if (typeof chrome === 'undefined') return false;
  if (!chrome.runtime || !chrome.runtime.id) return false;
  if (!chrome.storage || !chrome.storage.local) return false;
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
    const result = await chrome.storage.local.get(key);
    if (result[key] === undefined) return fallback;
    return result[key] as T;
  } catch (error) {
    // A get can still lose the race with invalidation between the
    // availability check above and the call actually landing — treat that
    // exactly like "context wasn't available" rather than throwing into
    // whatever called this (typically a content script mid-render).
    if (isContextInvalidatedError(error)) return fallback;
    throw error;
  }
}

async function set(key: string, value: unknown): Promise<void> {
  if (!isExtensionContextAvailable()) return;
  try {
    await chrome.storage.local.set({ [key]: value });
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
  // Merge with defaults so new fields introduced in future versions
  // are backfilled instead of coming back `undefined`.
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

/** Records a completed break, rolling daily counters and streaks correctly. */
export async function recordBreakCompleted(breakTriggeredAt?: number): Promise<HammyStats> {
  const stats = await getStats();
  const today = todayKey();
  const now = Date.now();

  // Idempotent: if this completion was already recorded very recently (within 5 seconds),
  // don't double-count it. This handles racing COMPLETE_BREAK messages from multiple tabs.
  if (stats.lastCompletedTimestamp && now - stats.lastCompletedTimestamp < 5000) {
    // This is likely a duplicate/racing call - return the existing stats unchanged
    return stats;
  }

  // Additional idempotency check: if we're completing a specific break and it was
  // already recorded (the timestamp matches), don't double-count
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

/**
 * Loads the full app state in one shot — used by popup/options/content
 * script on mount. Reads all four keys in a single chrome.storage.local
 * call instead of four separate ones, since each `chrome.storage` call
 * is its own async round trip to the extension's storage process — on
 * a fresh/cold profile that overhead is the main thing standing between
 * "click icon" and "popup shows data" the first time.
 */
export async function getFullState(): Promise<HammyState> {
  let bag: Record<string, unknown> = {};
  if (isExtensionContextAvailable()) {
    try {
      bag = await chrome.storage.local.get([
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

/**
 * Subscribes to any change in Hammy's storage keys. Returns an
 * unsubscribe function. Used so open popup/options windows stay in
 * sync with background service worker updates in real time.
 */
export function subscribeToState(
  callback: (state: HammyState) => void
): () => void {
  const listener = async (
    changes: { [key: string]: chrome.storage.StorageChange },
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

  // Nothing to subscribe to if the context is already gone (e.g. this is
  // called from a content script instance whose page has been sitting open
  // since before the extension was reloaded) — return a no-op unsubscribe
  // rather than calling into a torn-down chrome.storage.
  if (!isExtensionContextAvailable()) return () => {};

  chrome.storage.onChanged.addListener(listener);
  return () => {
    // The context can become invalid between subscribing and
    // unsubscribing (e.g. this runs from a React effect's cleanup, which
    // can fire after ctx.onInvalidated has already torn things down) — in
    // that case chrome.storage itself may already be gone, and calling
    // removeListener on it throws "Cannot read properties of undefined
    // (reading 'removeListener')" instead of cleanly no-op'ing.
    if (!isExtensionContextAvailable()) return;
    try {
      chrome.storage.onChanged.removeListener(listener);
    } catch (error) {
      if (!isContextInvalidatedError(error)) throw error;
    }
  };
}

export { KEYS as STORAGE_KEYS };

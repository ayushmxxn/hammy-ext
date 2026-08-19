export type BreakTypeId =
  | 'breathe'
  | 'posture'
  | 'eye-break'
  | 'drink-water'
  | 'stretch';

export interface BreakType {
  id: BreakTypeId;
  label: string;
  tagline: string;
  description: string;
  /** filename only — resolved at runtime via chrome.runtime.getURL */
  video: string;
  /** suggested duration in seconds, shown as a countdown during the break */
  suggestedSeconds: number;
  accent: {
    solid: string; // tailwind bg class
    soft: string; // tailwind bg class (light)
    text: string; // tailwind text class
    ring: string; // tailwind ring class
  };
}

export type BreakOrder = 'random' | 'sequential';
export type NotificationStyle = 'system' | 'silent';

export interface HammySettings {
  enabled: boolean;
  intervalMinutes: number;
  snoozeMinutes: number;
  soundEnabled: boolean;
  enabledBreakTypes: BreakTypeId[];
  breakOrder: BreakOrder;
  notificationStyle: NotificationStyle;
  /** index used for 'sequential' break order, persisted so it survives restarts */
  sequenceCursor: number;
  /**
   * When true (default), a break takes over the full page — the classic
   * "gatekeeper" behavior. When false, Hammy shows as a small floating
   * card in the corner instead, and the page underneath stays fully
   * usable (scrollable, clickable) while the break plays.
   */
  freezeOnBreak: boolean;
}

export interface PendingBreak {
  breakTypeId: BreakTypeId;
  triggeredAt: number;
  targetTabId?: number; // The tab ID where the break should be shown
}

export interface HammyStats {
  totalBreaksCompleted: number;
  breaksCompletedToday: number;
  lastCompletedDateKey: string; // yyyy-mm-dd, local
  streakDays: number;
  lastStreakDateKey: string; // yyyy-mm-dd, local
  lastCompletedTimestamp: number; // timestamp of last completed break, for idempotency
}

export interface HammyState {
  settings: HammySettings;
  pendingBreak: PendingBreak | null;
  nextBreakAt: number | null;
  stats: HammyStats;
}

/** Messages sent from popup/options -> background service worker */
export type HammyMessage =
  | { type: 'COMPLETE_BREAK' }
  | { type: 'SNOOZE_BREAK' }
  | { type: 'DISMISS_BREAK' }
  | { type: 'START_BREAK_NOW' }
  | { type: 'GET_CURRENT_TAB_ID' }
  | { type: 'SETTINGS_UPDATED' }
  | { type: 'TOGGLE_ENABLED'; enabled: boolean };

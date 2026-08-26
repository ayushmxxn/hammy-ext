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
  video: string;
  suggestedSeconds: number;
  accent: {
    solid: string;
    soft: string;
    text: string;
    ring: string;
  };
}

export type BreakOrder = 'random' | 'sequential';
export type NotificationStyle = 'system' | 'silent';

export interface HammySettings {
  enabled: boolean;
  intervalMinutes: number;
  soundEnabled: boolean;
  enabledBreakTypes: BreakTypeId[];
  breakOrder: BreakOrder;
  notificationStyle: NotificationStyle;
  sequenceCursor: number;
  freezeOnBreak: boolean;
  excludedSites: string[];
  customVideoEnabled: boolean;
}
export interface PendingBreak {
  breakTypeId: BreakTypeId;
  triggeredAt: number;
  targetTabId?: number;
}
export interface HammyStats {
  totalBreaksCompleted: number;
  breaksCompletedToday: number;
  lastCompletedDateKey: string;
  streakDays: number;
  lastStreakDateKey: string;
  lastCompletedTimestamp: number;
}
export interface HammyState {
  settings: HammySettings;
  pendingBreak: PendingBreak | null;
  nextBreakAt: number | null;
  stats: HammyStats;
}
export type HammyMessage =
  | { type: 'COMPLETE_BREAK' }
  | { type: 'DISMISS_BREAK' }
  | { type: 'START_BREAK_NOW' }
  | { type: 'GET_CURRENT_TAB_ID' }
  | { type: 'SETTINGS_UPDATED' }
  | { type: 'TOGGLE_ENABLED'; enabled: boolean }
  | { type: 'USER_TYPING' };